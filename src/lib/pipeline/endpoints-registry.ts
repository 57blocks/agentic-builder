/**
 * Parser for the TRD shared-schema `ENDPOINTS` registry (CODEGEN_HARDENING — P1②).
 *
 * The TRD agent emits, alongside the entity + Request/Response interfaces, an
 * authored endpoint↔type registry in `.blueprint/shared-schema.ts`:
 *
 *   export const ENDPOINTS = {
 *     "POST /api/v1/auth/login": { request: "LoginRequest", response: "LoginResponse", auth: "public" },
 *     "GET  /api/v1/courses":    { request: null,           response: "CourseListResponse", auth: "bearer" },
 *   } as const;
 *
 * This registry is the SINGLE authored source of "which endpoints exist and what
 * types cross them". `generateApiContracts` DERIVES `API_CONTRACTS.json` from it
 * instead of re-authoring shapes by reading the PRD + scaffold (which drifts from
 * the schema). This module is the deterministic parser; no LLM, no eval.
 */

export interface RegistryEndpoint {
  method: string;
  endpoint: string;
  /** Request type name, or null when the endpoint takes no body. */
  request: string | null;
  /** Response type name. */
  response: string | null;
  /** Auth requirement as authored (e.g. "public" | "bearer" | "none"). */
  auth: string | null;
}

/** Extract the `{ ... }` block (braces included) starting at `open`. */
function braceBlock(src: string, open: number): string | null {
  if (src[open] !== "{") return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

/** Read a `key: "value" | null` field from a flat object body. */
function readField(body: string, key: string): string | null {
  const re = new RegExp(`\\b${key}\\s*:\\s*(?:(["'\`])([^"'\`]*)\\1|(null|undefined))`);
  const m = body.match(re);
  if (!m) return null;
  if (m[3]) return null; // null/undefined literal
  const v = (m[2] ?? "").trim();
  return v || null;
}

/**
 * Parse the `ENDPOINTS` registry from a schema source. Returns null when no
 * registry is present (legacy schemas predating P1①) so the caller can fall
 * back to LLM generation. Returns [] only when the registry exists but is empty.
 */
export function parseEndpointsRegistry(
  schemaSrc: string,
): RegistryEndpoint[] | null {
  const decl = schemaSrc.match(/\bexport\s+const\s+ENDPOINTS\s*(?::[^=]+)?=\s*\{/);
  if (!decl || decl.index === undefined) return null;
  const open = decl.index + decl[0].length - 1; // index of the `{`
  const block = braceBlock(schemaSrc, open);
  if (block == null) return null;

  const out: RegistryEndpoint[] = [];
  const seen = new Set<string>();
  // Each entry: "METHOD /path": { ...flat object... }
  // The value object can itself contain `{` / `}` — e.g. an inline-object
  // response type like `response: "ApiEnvelope<{ items: Course[] }>"`. A
  // `\{([^{}]*)\}` body capture CANNOT match those entries (it forbids nested
  // braces) and silently drops them, so we match only the KEY prefix here and
  // read the value with a balanced-brace scan (braces inside string values are
  // balanced in valid TS, so the scan terminates on the entry's real `}`).
  const keyRe = /(["'`])\s*([A-Za-z]+)\s+(\/[^"'`]*?)\s*\1\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(block)) !== null) {
    const method = m[2]!.toUpperCase();
    const endpoint = normalizePath(m[3]!);
    const braceStart = keyRe.lastIndex - 1; // index of the value's `{`
    const valueBlock = braceBlock(block, braceStart);
    if (valueBlock == null) continue;
    // Resume scanning AFTER this value block so nested braces / the next entry
    // are not re-matched from inside it.
    keyRe.lastIndex = braceStart + valueBlock.length;
    const body = valueBlock.slice(1, -1); // strip the outer braces
    const key = `${method} ${endpoint}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      method,
      endpoint,
      request: readField(body, "request"),
      response: readField(body, "response"),
      auth: readField(body, "auth"),
    });
  }
  return out;
}

/**
 * Cheap presence/shape summary of the `ENDPOINTS` registry in a schema source.
 * `hasRegistry` distinguishes "no `export const ENDPOINTS` block at all" (a
 * defective TRD — the registry was never authored) from "block present but
 * empty" (a legitimate API-less backend). Callers gate on `hasRegistry`:
 * absent ⇒ regenerate the TRD / hard-fail; empty ⇒ no endpoints, not an error.
 */
export function summarizeEndpointsRegistry(schemaSrc: string): {
  hasRegistry: boolean;
  count: number;
} {
  const reg = parseEndpointsRegistry(schemaSrc);
  return { hasRegistry: reg != null, count: reg?.length ?? 0 };
}

function normalizePath(p: string): string {
  let out = p.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/+/g, "/");
  return out.length > 1 ? out.replace(/\/$/, "") : out;
}

/** Derive a coarse service name from an endpoint path (first non-version segment). */
export function serviceFromEndpoint(endpoint: string): string {
  const segs = endpoint
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "api" && !/^v\d+$/i.test(s));
  return segs[0] ?? "app";
}
