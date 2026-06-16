/**
 * Real-data integration gate — Tier 2 of the runtime smoke gate.
 *
 * The smoke gate (Tier 1) only proves endpoints are *routable* (not 404) against
 * an EMPTY database. This module upgrades that to *behavioral* verification:
 *
 *   1. prepareTestSchema()  — create an isolated Postgres SCHEMA on the same
 *      instance as the kickoff-provisioned DB (search_path isolation, lowest
 *      privilege, no separate database needed).
 *   2. seedTestSchema()     — apply the project's own migrations into that schema
 *      and run its seed script (`pnpm migrate` + `pnpm seed`). The booted backend
 *      is pointed at the schema via DATABASE_URL.
 *   3. runDataAssertions()  — register/login to obtain a token, then probe each
 *      contract endpoint expecting a real 2xx + a response whose shape matches
 *      `responseSchema`. Read endpoints are shape-checked; write endpoints are
 *      2xx-checked.
 *   4. teardownTestSchema() — DROP SCHEMA ... CASCADE.
 *
 * Everything here is OPT-IN (supervisor gates it behind INTEGRATION_DATA_GATE=1)
 * and degrades gracefully: any failure to prepare/seed disables Tier-2 with a
 * logged reason rather than breaking the existing Tier-1 gate or the pipeline.
 *
 * Isolation note: migrate/seed/boot run with NODE_ENV=production so the
 * generated `db.ts` (which only `override`s .env in non-production) lets our
 * injected DATABASE_URL win — exactly how the deployed container behaves. All
 * other .env keys (JWT_SECRET, etc.) still load normally.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { Client } from "pg";
import { fsRead } from "@/lib/langgraph/tools";
import {
  parseContractSchema,
  sampleFromSchema,
  validateShape,
  type SchemaNode,
} from "./contract-schema-parse";
import { indexSchemaTypes, resolveTypeRefToSchema } from "./schema-type-resolve";

const execFileP = promisify(execFile);

export const TEST_SCHEMA_NAME = "smoke_test";
const ASSERTION_REQUEST_TIMEOUT_MS = 6_000;
const MAX_DATA_PROBES = 60;

// ─── Failure type (consumed by runtime-smoke-gate, fed to verify-fix worker) ──

export type DataGateFailureCode =
  | "seed_failed"
  | "endpoint_unexpected_status"
  | "response_shape_mismatch";

export interface DataAssertionFailure {
  code: DataGateFailureCode;
  target: string;
  directive: string;
  evidence: string;
}

export interface DataAssertionSuccess {
  target: string;
  detail: string;
}

export interface DataAssertionResult {
  failures: DataAssertionFailure[];
  successes: DataAssertionSuccess[];
  /** Endpoints skipped because auth could not be established, etc. */
  skipped: Array<{ target: string; reason: string }>;
  authEstablished: boolean;
}

// ─── Contract shape ────────────────────────────────────────────────────────────

interface ContractEntry {
  method: string;
  endpoint: string;
  requestSchema?: string;
  responseSchema?: string;
  /** P1②: named shared-schema types (preferred over inline *Schema strings). */
  requestType?: string;
  responseType?: string;
  auth?: string; // "none" | "bearer" | ...
}

async function readFullContracts(outputDir: string): Promise<ContractEntry[]> {
  const raw = await fsRead("API_CONTRACTS.json", outputDir);
  if (raw.startsWith("FILE_NOT_FOUND") || raw.startsWith("REJECTED")) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c): c is ContractEntry =>
          c && typeof c.method === "string" && typeof c.endpoint === "string",
      )
      .map((c) => ({
        method: c.method.toUpperCase(),
        endpoint: normalizePath(c.endpoint),
        requestSchema: typeof c.requestSchema === "string" ? c.requestSchema : undefined,
        responseSchema: typeof c.responseSchema === "string" ? c.responseSchema : undefined,
        requestType: typeof c.requestType === "string" ? c.requestType : undefined,
        responseType: typeof c.responseType === "string" ? c.responseType : undefined,
        auth: typeof c.auth === "string" ? c.auth.toLowerCase() : undefined,
      }));
  } catch {
    return [];
  }
}

function normalizePath(p: string): string {
  let out = p.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/+/g, "/");
  return out.length > 1 ? out.replace(/\/$/, "") : out;
}

const SHARED_SCHEMA_CANDIDATES = [
  "backend/src/shared/schema.ts",
  "frontend/src/shared/schema.ts",
  "src/shared/schema.ts",
];

/**
 * Index the shared schema's named types (P1②). Empty map when no schema is
 * found — callers then rely solely on inline `*Schema` strings (legacy path).
 */
async function readSchemaTypeIndex(
  outputDir: string,
): Promise<Map<string, string>> {
  for (const rel of SHARED_SCHEMA_CANDIDATES) {
    const src = await fsRead(rel, outputDir);
    if (!src.startsWith("FILE_NOT_FOUND") && !src.startsWith("REJECTED") && src.trim()) {
      return indexSchemaTypes(src);
    }
  }
  return new Map();
}

/**
 * The shape to validate/synthesize for an endpoint side. Prefers the inline
 * `*Schema` string (legacy/explicit), falling back to resolving the named
 * `*Type` against the shared schema (P1②ⁱ single-source path).
 */
function nodeForSide(
  inlineSchema: string | undefined,
  typeName: string | undefined,
  schemaIndex: Map<string, string>,
): SchemaNode | null {
  const inline = parseContractSchema(inlineSchema);
  if (inline) return inline;
  if (typeName && schemaIndex.size > 0) {
    return resolveTypeRefToSchema(schemaIndex, typeName);
  }
  return null;
}

function materializeDynamicPath(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, (_m, key) =>
    key.toLowerCase().includes("id") ? "1" : "sample",
  );
}

// ─── DATABASE_URL helpers ──────────────────────────────────────────────────────

async function readDatabaseUrl(outputDir: string): Promise<string | null> {
  const env = await fsRead("backend/.env", outputDir);
  if (env.startsWith("FILE_NOT_FOUND")) return null;
  // DATABASE_URL may be quoted (the generator JSON-quotes it for special chars).
  const m = env.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
  if (!m) return null;
  let url = m[1].trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1);
  }
  return url && /^postgres(ql)?:\/\//i.test(url) ? url : null;
}

/** Append a libpq `options=-c search_path=<schema>` param so all queries hit the schema. */
function withSearchPath(databaseUrl: string, schema: string): string {
  const u = new URL(databaseUrl);
  // Preserve any existing options; libpq joins with spaces.
  const existing = u.searchParams.get("options");
  const opt = `-c search_path=${schema}`;
  u.searchParams.set("options", existing ? `${existing} ${opt}` : opt);
  return u.toString();
}

// ─── Schema lifecycle (direct pg connection from the gate process) ─────────────

export interface PreparedTestSchema {
  schemaName: string;
  /** DATABASE_URL the booted backend + migrate/seed must use. */
  testDatabaseUrl: string;
  /** The base (public-schema) URL, used by the gate for DROP/CREATE SCHEMA. */
  appDatabaseUrl: string;
}

/**
 * Create a clean isolated schema on the kickoff-provisioned DB. Returns null
 * (with a reason logged) when the DB is unreachable or no DATABASE_URL exists —
 * the caller then skips Tier-2.
 */
export async function prepareTestSchema(
  outputDir: string,
  schemaName: string = TEST_SCHEMA_NAME,
): Promise<PreparedTestSchema | null> {
  const appDatabaseUrl = await readDatabaseUrl(outputDir);
  if (!appDatabaseUrl) {
    console.warn("[data-gate] no DATABASE_URL in backend/.env — skipping Tier-2.");
    return null;
  }
  const client = new Client({ connectionString: appDatabaseUrl });
  try {
    await client.connect();
    // Recreate for a deterministic empty starting point.
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdent(schemaName)} CASCADE`);
    await client.query(`CREATE SCHEMA ${quoteIdent(schemaName)}`);
  } catch (err) {
    console.warn(
      `[data-gate] could not prepare test schema (DB unreachable?): ${err instanceof Error ? err.message : String(err)} — skipping Tier-2.`,
    );
    return null;
  } finally {
    await client.end().catch(() => {});
  }
  return {
    schemaName,
    testDatabaseUrl: withSearchPath(appDatabaseUrl, schemaName),
    appDatabaseUrl,
  };
}

export async function teardownTestSchema(
  appDatabaseUrl: string,
  schemaName: string = TEST_SCHEMA_NAME,
): Promise<void> {
  const client = new Client({ connectionString: appDatabaseUrl });
  try {
    await client.connect();
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdent(schemaName)} CASCADE`);
  } catch (err) {
    console.warn(
      `[data-gate] teardown DROP SCHEMA failed (will be retried next run): ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    await client.end().catch(() => {});
  }
}

/** Postgres identifier quoting (schema name is internal, but be safe). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

// ─── Migrate + seed (drive the project's own scripts) ──────────────────────────

export interface SeedResult {
  migrated: boolean;
  seeded: boolean;
  /** Set when migrate failed — Tier-2 cannot proceed. */
  failure?: DataAssertionFailure;
}

/**
 * Apply migrations into the test schema and run the project's seed script if it
 * exists. The booted-app env (NODE_ENV=production + injected DATABASE_URL) makes
 * our schema-scoped URL authoritative.
 */
export async function seedTestSchema(
  outputDir: string,
  testDatabaseUrl: string,
  schemaName: string = TEST_SCHEMA_NAME,
): Promise<SeedResult> {
  const backendDir = `${outputDir}/backend`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: testDatabaseUrl,
    PGOPTIONS: `-c search_path=${schemaName}`,
    AUTO_MIGRATE: "0",
  };

  const hasScript = await packageHasScript(outputDir, "migrate");
  if (!hasScript) {
    // No standard migrate script — fall back to letting boot auto-migrate
    // (AUTO_MIGRATE default). Report as not-migrated-here but don't fail.
    console.warn(
      "[data-gate] backend has no `migrate` script — relying on boot AUTO_MIGRATE.",
    );
    return { migrated: false, seeded: false };
  }

  // 1) migrate
  try {
    await execFileP("pnpm", ["migrate"], {
      cwd: backendDir,
      env,
      timeout: 120_000,
      maxBuffer: 5 * 1024 * 1024,
    });
  } catch (err) {
    const msg = errText(err);
    return {
      migrated: false,
      seeded: false,
      failure: {
        code: "seed_failed",
        target: "_migrate",
        directive:
          "`pnpm migrate` failed against an isolated test schema. The migrations themselves are broken (not just config). Inspect the umzug migration files under `backend/src/database/migrations/` for SQL/column errors.",
        evidence: msg.slice(-1200),
      },
    };
  }

  // 2) seed (optional — prefer the project's own deterministic seed)
  let seeded = false;
  if (await packageHasScript(outputDir, "seed")) {
    try {
      await execFileP("pnpm", ["seed"], {
        cwd: backendDir,
        env,
        timeout: 120_000,
        maxBuffer: 5 * 1024 * 1024,
      });
      seeded = true;
    } catch (err) {
      // Seed failure is non-fatal: runDataAssertions will register a user over
      // HTTP as a fallback so authed reads still work.
      console.warn(`[data-gate] project seed script failed (continuing): ${errText(err).slice(-400)}`);
    }
  }

  return { migrated: true, seeded };
}

async function packageHasScript(outputDir: string, name: string): Promise<boolean> {
  const raw = await fsRead("backend/package.json", outputDir);
  if (raw.startsWith("FILE_NOT_FOUND")) return false;
  try {
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    return Boolean(pkg.scripts && typeof pkg.scripts[name] === "string");
  } catch {
    return false;
  }
}

function errText(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return [e.stdout, e.stderr, e.message].filter(Boolean).join("\n");
  }
  return String(err);
}

// ─── Auth bootstrap ────────────────────────────────────────────────────────────

interface ProbeResult {
  status: number;
  body: string;
  json: unknown;
  error?: string;
}

async function httpProbe(url: string, init: RequestInit): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSERTION_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json: unknown = undefined;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, body: text.slice(0, 600), json };
  } catch (err) {
    return { status: 0, body: "", json: undefined, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Find a token-ish field anywhere in the (possibly nested) response JSON. */
function extractToken(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const stack: unknown[] = [json];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
      if (typeof v === "string" && /(^|_)(token|accesstoken|jwt)$/i.test(k.replace(/[^a-z]/gi, ""))) {
        return v;
      }
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

/**
 * Establish a bearer token: try registering a fresh user (covers the "seed
 * absent → generate" path over HTTP), then fall back to logging in. Returns
 * null if no auth endpoints exist or none yield a token.
 */
async function establishToken(
  baseUrl: string,
  contracts: ContractEntry[],
  schemaIndex: Map<string, string>,
): Promise<{ token: string | null; createdEmail?: string; createdPassword?: string }> {
  const noAuthPosts = contracts.filter(
    (c) => c.method === "POST" && (!c.auth || c.auth === "none"),
  );
  const registerEp = noAuthPosts.find((c) => /register|signup|sign-up/i.test(c.endpoint));
  const loginEp = noAuthPosts.find((c) => /login|signin|sign-in|auth\/token/i.test(c.endpoint));

  const email = "smoke-test@example.com";
  const password = "Smoke-test-1234";

  if (registerEp) {
    const body = sampleFromSchema(
      nodeForSide(registerEp.requestSchema, registerEp.requestType, schemaIndex),
    ) as Record<string, unknown>;
    // Force known credentials so a subsequent login is deterministic.
    overrideCreds(body, email, password);
    const r = await httpProbe(`${baseUrl}${registerEp.endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const tok = extractToken(r.json);
    if (tok) return { token: tok, createdEmail: email, createdPassword: password };
  }

  if (loginEp) {
    const body = sampleFromSchema(
      nodeForSide(loginEp.requestSchema, loginEp.requestType, schemaIndex),
    ) as Record<string, unknown>;
    overrideCreds(body, email, password);
    const r = await httpProbe(`${baseUrl}${loginEp.endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const tok = extractToken(r.json);
    if (tok) return { token: tok };
  }

  return { token: null };
}

function overrideCreds(body: Record<string, unknown>, email: string, password: string): void {
  for (const key of Object.keys(body)) {
    const k = key.toLowerCase();
    if (k.includes("email")) body[key] = email;
    if (k === "password" || k === "confirmpassword") body[key] = password;
  }
}

// ─── Assertions ────────────────────────────────────────────────────────────────

export interface RunDataAssertionsInput {
  outputDir: string;
  /** e.g. http://127.0.0.1:4000 */
  baseUrl: string;
  /** "METHOD /path" targets already failed by Tier-1 — skip to avoid double-reporting. */
  skipTargets?: Set<string>;
}

/**
 * Probe contract endpoints expecting real 2xx + matching response shape. Assumes
 * the backend is already booted (by the smoke gate) against the seeded schema.
 */
export async function runDataAssertions(
  input: RunDataAssertionsInput,
): Promise<DataAssertionResult> {
  const { outputDir, baseUrl, skipTargets } = input;
  const result: DataAssertionResult = {
    failures: [],
    successes: [],
    skipped: [],
    authEstablished: false,
  };

  const contracts = await readFullContracts(outputDir);
  if (contracts.length === 0) return result;

  const schemaIndex = await readSchemaTypeIndex(outputDir);
  const { token } = await establishToken(baseUrl, contracts, schemaIndex);
  result.authEstablished = Boolean(token);
  const authHeader = token ? { authorization: `Bearer ${token}` } : undefined;

  let probed = 0;
  for (const ep of contracts) {
    if (probed >= MAX_DATA_PROBES) break;
    const target = `${ep.method} ${ep.endpoint}`;
    if (skipTargets?.has(target)) continue;
    if (isHealth(ep.endpoint)) continue;

    const needsAuth = ep.auth === "bearer";
    if (needsAuth && !authHeader) {
      result.skipped.push({ target, reason: "no auth token (register/login unavailable)" });
      continue;
    }
    probed++;

    const url = `${baseUrl}${materializeDynamicPath(ep.endpoint)}`;
    const isWrite = ["POST", "PUT", "PATCH"].includes(ep.method);
    const headers: Record<string, string> = { ...(authHeader ?? {}) };
    let body: string | undefined;
    if (isWrite) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(
        sampleFromSchema(nodeForSide(ep.requestSchema, ep.requestType, schemaIndex)),
      );
    }

    const r = await httpProbe(url, { method: ep.method, headers, body });

    // Unreachable / 404 are Tier-1 concerns; only flag here if Tier-1 didn't.
    if (r.error || r.status === 0 || r.status === 404) {
      result.skipped.push({
        target,
        reason: r.error ? `unreachable: ${r.error}` : `status ${r.status} (Tier-1 territory)`,
      });
      continue;
    }

    // With a valid token + seeded data, an authed endpoint should NOT 401/403.
    if (r.status === 401 || r.status === 403) {
      if (needsAuth) {
        result.failures.push({
          code: "endpoint_unexpected_status",
          target,
          directive:
            "Endpoint rejected an authenticated request (valid Bearer token was supplied). The auth guard likely fails to resolve the token to a DB user — check that the middleware upserts/looks up the user (e.g. resolveOrCreateDbUser) instead of throwing on a missing row.",
          evidence: `status=${r.status} body=${r.body}`,
        });
      } else {
        result.skipped.push({ target, reason: `auth:none endpoint returned ${r.status}` });
      }
      continue;
    }

    if (r.status >= 500) {
      result.failures.push({
        code: "endpoint_unexpected_status",
        target,
        directive:
          "Endpoint returned 5xx WITH seeded data and a valid request body. This is a real handler bug — inspect the controller/service for a bad ORM query, a missing await, or an unhandled null. The DB has data, so an empty-result guard is not the cause.",
        evidence: `status=${r.status} body=${r.body}`,
      });
      continue;
    }

    if (r.status >= 400) {
      // 4xx other than auth: likely a validation mismatch vs the contract's requestSchema.
      result.failures.push({
        code: "endpoint_unexpected_status",
        target,
        directive: isWrite
          ? "Write endpoint rejected a request body synthesized from its own `requestSchema` in API_CONTRACTS.json. Either the validation is stricter than the contract, or the contract's requestSchema is wrong — reconcile the two."
          : "Read endpoint returned 4xx to a valid authenticated request. Check route params / query validation against the contract.",
        evidence: `status=${r.status} body=${r.body}`,
      });
      continue;
    }

    // 2xx — validate response shape for reads (and writes that return a body).
    // Prefer the inline responseSchema; fall back to the named responseType
    // resolved against the shared schema (P0②). The envelope middleware wraps
    // success bodies as `{ ok, data }`, so validate against `data` when present.
    const responseNode = nodeForSide(ep.responseSchema, ep.responseType, schemaIndex);
    if (responseNode && r.json !== undefined) {
      // The named responseType describes the DATA; the responseEnvelope
      // middleware wraps it as `{ ok, data }`. Inline responseSchema strings,
      // by contrast, sometimes already include the envelope. To avoid false
      // positives from that ambiguity, validate against both the raw body and
      // the unwrapped `data`, and only flag a mismatch when BOTH fail — taking
      // whichever interpretation is cleaner.
      const candidates = [r.json];
      const unwrapped = unwrapEnvelopeData(r.json);
      if (unwrapped !== undefined) candidates.push(unwrapped);
      let mismatches = validateShape(candidates[0], responseNode);
      for (let i = 1; i < candidates.length && mismatches.length > 0; i++) {
        const alt = validateShape(candidates[i], responseNode);
        if (alt.length < mismatches.length) mismatches = alt;
      }
      if (mismatches.length > 0) {
        result.failures.push({
          code: "response_shape_mismatch",
          target,
          directive: `Response 2xx but its shape diverges from the contracted ${
            ep.responseType ? `\`${ep.responseType}\` (shared schema)` : "`responseSchema`"
          }. Align the handler's response with the schema type (construct it via \`json<${
            ep.responseType ?? "ResponseType"
          }>(ctx, data)\` and a row→type mapper), or file a schema-change-request if the contract is wrong. Mismatches: ${mismatches
            .map((m) => `${m.path}: ${m.reason}`)
            .join("; ")}`,
          evidence: `status=${r.status} body=${r.body}`,
        });
        continue;
      }
    }

    result.successes.push({ target, detail: `2xx + shape OK (${r.status})` });
  }

  return result;
}

function isHealth(endpoint: string): boolean {
  return /^\/(?:api\/)?health\/?$/.test(endpoint);
}

/**
 * If `json` is a `{ ok, data }` success envelope (responseEnvelope middleware),
 * return its `data`; otherwise undefined (no envelope to peel).
 */
function unwrapEnvelopeData(json: unknown): unknown {
  if (
    json &&
    typeof json === "object" &&
    !Array.isArray(json) &&
    "ok" in (json as Record<string, unknown>) &&
    "data" in (json as Record<string, unknown>)
  ) {
    return (json as Record<string, unknown>).data;
  }
  return undefined;
}
