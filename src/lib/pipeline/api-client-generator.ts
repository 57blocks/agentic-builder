/**
 * Typed frontend API-surface generator (CODEGEN_HARDENING — frontend contract).
 *
 * WHY: LLM-authored frontends hand-write `fetch("/api/v1/…")` (or per-domain
 * `api/*.ts` wrappers) across button handlers. A typo'd path, a wrong field, or
 * a call to an endpoint that doesn't exist compiles fine and only fails at
 * RUNTIME when a user clicks the button — and only if an E2E test happens to
 * cover it. There is no compiler-enforced contract to the backend.
 *
 * This module DERIVES a single typed facade — `frontend/src/api/endpoints.ts` —
 * from the SAME single source of truth the backend contracts come from: the
 * `ENDPOINTS` registry in `.blueprint/shared-schema.ts` (see
 * endpoints-registry.ts). Every endpoint becomes `api.<service>.<method>(...)`
 * whose request/response types are the schema's own interfaces. A handler that
 * calls a missing method, mistypes a field, or misreads the response shape is a
 * TYPE ERROR — caught by the existing tsc gate, not by a user's click.
 *
 * It does NOT replace the scaffold's low-level `api/client.ts` (`apiClient`,
 * which owns baseURL / `/api/v1` prefix / envelope-unwrap / bearer auth). The
 * generated facade DELEGATES to `apiClient`, so it reuses all that plumbing —
 * views import the typed `api`, `apiClient` stays the one HTTP client.
 *
 * `buildApiFacadeSource` is a pure string→string transform (unit-testable);
 * `generateFrontendApiClient` is the IO orchestrator.
 */

import fs from "fs/promises";
import path from "path";
import {
  parseEndpointsRegistry,
  serviceFromEndpoint,
  type RegistryEndpoint,
} from "./endpoints-registry";

export type ApiClientTier = "S" | "M" | "L";

const SCHEMA_BLUEPRINT_REL = ".blueprint/shared-schema.ts";

/** Where the facade is written per tier. Sits next to the scaffold's
 *  low-level `client.ts` and imports it. Mirrors shared-schema-distributor. */
const FACADE_TARGETS_BY_TIER: Readonly<Record<ApiClientTier, readonly string[]>> = {
  S: ["src/api/endpoints.ts"],
  M: ["frontend/src/api/endpoints.ts"],
  L: ["frontend/src/api/endpoints.ts"],
};

export interface GenerateApiClientResult {
  /** True when the schema source existed and had a (possibly empty) registry. */
  found: boolean;
  /** Relative paths written under outputDir. */
  written: string[];
  /** Number of endpoint methods emitted. */
  endpointCount: number;
  sourcePath: string;
}

// ── pure helpers ────────────────────────────────────────────────────────────

/** camelCase a set of raw word-ish parts (already split). Empty → "". */
function camel(parts: string[]): string {
  const words = parts.flatMap((p) => p.split(/[^A-Za-z0-9]+/)).filter(Boolean);
  if (words.length === 0) return "";
  return words
    .map((w, i) =>
      i === 0 ? w[0]!.toLowerCase() + w.slice(1) : w[0]!.toUpperCase() + w.slice(1),
    )
    .join("");
}

/** Business path for the scaffold's apiClient: the recorded ENDPOINTS path with
 *  the `/api/vN` mount prefix stripped (apiClient re-adds it). `:x` kept as-is. */
function businessPath(endpoint: string): string {
  const stripped = endpoint.replace(/^\/api(?:\/v\d+)?/i, "");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

/** Path segments after `api/vN`, excluding the leading service segment. */
function restSegments(endpoint: string, service: string): string[] {
  const segs = endpoint
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "api" && !/^v\d+$/i.test(s));
  const idx = segs.indexOf(service);
  return idx >= 0 ? segs.slice(idx + 1) : segs;
}

/** Ordered `:param` names in an endpoint path. */
function pathParams(endpoint: string): string[] {
  return (endpoint.match(/:([A-Za-z0-9_]+)/g) ?? []).map((s) => s.slice(1));
}

const VERB_WORD: Record<string, string> = {
  GET: "get",
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "remove",
};

/** apiClient method name for an HTTP verb. */
const CLIENT_METHOD: Record<string, string> = {
  GET: "get",
  POST: "post",
  PUT: "put",
  PATCH: "patch",
  DELETE: "delete",
};

/** Deterministic, unique-per-service method name. Params become `By<Param>`. */
function methodName(ep: RegistryEndpoint, service: string): string {
  const rest = restSegments(ep.endpoint, service).map((s) =>
    s.startsWith(":") ? `by ${s.slice(1)}` : s,
  );
  const verb = VERB_WORD[ep.method] ?? ep.method.toLowerCase();
  const action = ep.method === "GET" && rest.length === 0 ? "list" : verb;
  return camel([action, ...rest]) || verb;
}

/** A TS identifier safe as an object key; quote when it isn't. */
function safeKey(id: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id) ? id : JSON.stringify(id);
}

/** Template-literal body for the business path, `:x` → `${x}`. */
function pathTemplate(bp: string): string {
  return bp.replace(/:([A-Za-z0-9_]+)/g, (_m, p) => "${" + p + "}");
}

/** Capitalised identifiers in a type expr (`RoleItem[]`→["RoleItem"]). */
function identifiersIn(expr: string): string[] {
  return expr.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? [];
}

interface BuiltMethod {
  service: string;
  name: string;
  ep: RegistryEndpoint;
  params: string[];
  reqType: string | null;
  resType: string; // TS type expr; "void" when none
}

/**
 * Build the typed facade module source from a parsed registry. `definedTypes`
 * is the set of exported type names in the shared schema — only those are
 * imported (so `Record<…>` / primitives / unknown refs don't break the import).
 */
export function buildApiFacadeSource(
  endpoints: RegistryEndpoint[],
  definedTypes: Set<string>,
): string {
  const byService = new Map<string, BuiltMethod[]>();
  const usedTypes = new Set<string>();

  for (const ep of endpoints) {
    const service = camel([serviceFromEndpoint(ep.endpoint)]) || "app";
    const name = methodName(ep, service);
    const reqType = ep.request && ep.request.trim() ? ep.request.trim() : null;
    const resType = ep.response && ep.response.trim() ? ep.response.trim() : "void";
    for (const t of [reqType ?? "", resType]) {
      for (const id of identifiersIn(t)) if (definedTypes.has(id)) usedTypes.add(id);
    }
    const list = byService.get(service) ?? [];
    list.push({ service, name, ep, params: pathParams(ep.endpoint), reqType, resType });
    byService.set(service, list);
  }

  // Disambiguate name collisions within a service (e.g. PUT+PATCH → "update" on
  // the same path) by appending the HTTP verb. Deterministic.
  for (const list of byService.values()) {
    const counts = new Map<string, number>();
    for (const m of list) counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
    for (const m of list) {
      if ((counts.get(m.name) ?? 0) > 1) m.name = camel([m.name, m.ep.method]);
    }
  }

  const importLine =
    usedTypes.size > 0
      ? `import type {\n${[...usedTypes].sort().map((t) => `  ${t},`).join("\n")}\n} from "../shared/schema";\n`
      : "";

  const services = [...byService.keys()].sort();
  const serviceBlocks = services
    .map((svc) => {
      const methods = byService
        .get(svc)!
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => {
          const clientVerb = CLIENT_METHOD[m.ep.method] ?? "get";
          const bodyless = clientVerb === "get" || clientVerb === "delete";
          const bp = pathTemplate(businessPath(m.ep.endpoint));
          const args: string[] = m.params.map((p) => `${p}: string`);
          if (m.reqType) args.push(`body: ${m.reqType}`);
          // apiClient signatures: get/delete<T>(path, opts?) take ONE generic and
          // no body param; post/put/patch<T, B>(path, body) take two. A GET/DELETE
          // that still declares a request type (e.g. DELETE with a confirm payload)
          // forwards it as query params — the only body channel those verbs expose.
          let call: string;
          if (bodyless) {
            call = m.reqType
              ? `apiClient.${clientVerb}<${m.resType}>(\`${bp}\`, { query: body as unknown as Record<string, string | number | boolean | null | undefined> })`
              : `apiClient.${clientVerb}<${m.resType}>(\`${bp}\`)`;
          } else {
            call = m.reqType
              ? `apiClient.${clientVerb}<${m.resType}, ${m.reqType}>(\`${bp}\`, body)`
              : `apiClient.${clientVerb}<${m.resType}>(\`${bp}\`)`;
          }
          return (
            `    /** ${m.ep.method} ${m.ep.endpoint}${m.ep.auth ? ` — auth: ${m.ep.auth}` : ""} */\n` +
            `    ${safeKey(m.name)}: (${args.join(", ")}): Promise<${m.resType}> =>\n` +
            `      ${call},`
          );
        })
        .join("\n");
      return `  ${safeKey(svc)}: {\n${methods}\n  },`;
    })
    .join("\n");

  return `${HEADER}import { apiClient } from "./client";\n${importLine}\nexport const api = {\n${serviceBlocks}\n} as const;\n\nexport default api;\n`;
}

const HEADER = `/**
 * GENERATED — do not edit by hand.
 *
 * Typed API surface derived from the ENDPOINTS registry in the shared schema
 * (the single source of truth for the frontend↔backend contract). Every
 * frontend network call MUST go through this \`api\` object rather than a
 * hand-written \`fetch\` or a direct \`apiClient\` call: a call to a missing
 * endpoint, a wrong request field, or a misread response shape then fails at
 * COMPILE time (tsc) instead of at runtime when a user clicks a button.
 *
 * Delegates to the scaffold's low-level \`apiClient\` (baseURL / \`/api/v1\`
 * prefix / envelope-unwrap / bearer auth all handled there). Each method's doc
 * carries the exact \`METHOD /path\` so you can find the one you need.
 *
 * Regenerated from .blueprint/shared-schema.ts on every coding run.
 */
`;

// ── IO orchestrator ──────────────────────────────────────────────────────────

/** Parse `export interface|type Name` declarations from a schema source. */
function definedTypeNames(schemaSrc: string): Set<string> {
  const set = new Set<string>();
  for (const m of schemaSrc.matchAll(/export\s+(?:interface|type)\s+([A-Za-z0-9_]+)/g)) {
    set.add(m[1]!);
  }
  return set;
}

/**
 * Read `.blueprint/shared-schema.ts`, parse its ENDPOINTS registry, and write a
 * typed facade to the frontend root(s) for the tier. No-op (found:false) when
 * the schema or its registry is absent — mirrors distributeSharedSchema so an
 * S-tier / TRD-less run doesn't fail.
 */
export async function generateFrontendApiClient(
  tier: ApiClientTier,
  outputDir: string,
  options?: { sourceDir?: string },
): Promise<GenerateApiClientResult> {
  const sourceDir = options?.sourceDir ?? process.cwd();
  const sourcePath = path.resolve(sourceDir, SCHEMA_BLUEPRINT_REL);

  let schemaSrc: string;
  try {
    schemaSrc = await fs.readFile(sourcePath, "utf8");
  } catch {
    return { found: false, written: [], endpointCount: 0, sourcePath };
  }
  const registry = parseEndpointsRegistry(schemaSrc);
  if (!registry) {
    return { found: false, written: [], endpointCount: 0, sourcePath };
  }

  const source = buildApiFacadeSource(registry, definedTypeNames(schemaSrc));
  const written: string[] = [];
  for (const rel of FACADE_TARGETS_BY_TIER[tier]) {
    const dest = path.join(outputDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, source, "utf8");
    written.push(rel);
  }
  return { found: true, written, endpointCount: registry.length, sourcePath };
}

/** Relative facade paths for a tier, without IO (for scaffoldProtectedPaths). */
export function plannedApiClientPaths(tier: ApiClientTier): string[] {
  return [...FACADE_TARGETS_BY_TIER[tier]];
}
