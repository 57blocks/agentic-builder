/**
 * Resolve a NAMED schema type (e.g. `LoginResponse`, `Course[]`) into a
 * `SchemaNode` by reading the shared `schema.ts` source (CODEGEN_HARDENING — P0②).
 *
 * Why this exists: after P1②, `API_CONTRACTS.json` references shared-schema type
 * NAMES (`requestType` / `responseType`) instead of re-authoring inline
 * `requestSchema` / `responseSchema` strings. The integration data-gate's
 * response-shape validation was keyed off those inline strings — so once they're
 * gone, shape validation silently no-ops. This module closes that gap: it parses
 * `schema.ts`, indexes every `interface` / object `type` alias, and expands a type
 * reference into the same `SchemaNode` shape the data-gate already validates
 * against — recursively resolving nested named fields (depth- and cycle-guarded).
 *
 * Loose by design, matching `validateShape`: the goal is "did the handler return
 * roughly the contracted shape (right top-level keys, right primitive families)",
 * not strict structural typing. Unknown/unresolvable types degrade to `unknown`
 * (which `validateShape` tolerates) rather than producing false mismatches.
 */

import type { SchemaNode } from "./contract-schema-parse";

const PRIMITIVE_TOKENS: Record<string, "string" | "number" | "boolean" | "null"> =
  {
    string: "string",
    number: "number",
    int: "number",
    integer: "number",
    float: "number",
    bigint: "number",
    boolean: "boolean",
    bool: "boolean",
    null: "null",
    undefined: "null",
  };

const DEFAULT_MAX_DEPTH = 6;

/** Leading identifier of a type reference (`Course[]` → `Course`, `Promise<X>` → `Promise`). */
function leadingIdent(s: string): string {
  const m = s.trim().match(/^[A-Za-z_$][\w$]*/);
  return m ? m[0] : "";
}

/**
 * Index every named object type in a schema source.
 * Maps type name → the `{ ... }` body string (or, for non-object aliases, the
 * right-hand side, e.g. `type Id = string`).
 */
export function indexSchemaTypes(src: string): Map<string, string> {
  const index = new Map<string, string>();

  // interface Name (extends ...)? { ... }
  const ifaceRe = /\b(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)[^{]*\{/g;
  let m: RegExpExecArray | null;
  while ((m = ifaceRe.exec(src)) !== null) {
    const name = m[1]!;
    const openBrace = ifaceRe.lastIndex - 1;
    const body = extractBraceBlock(src, openBrace);
    if (body != null) index.set(name, body);
  }

  // type Name = <rhs>;
  const typeRe = /\b(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*/g;
  while ((m = typeRe.exec(src)) !== null) {
    const name = m[1]!;
    const start = typeRe.lastIndex;
    if (src[start] === "{") {
      const body = extractBraceBlock(src, start);
      if (body != null) index.set(name, body);
    } else {
      // scalar / union / array alias — capture up to the statement end.
      const end = findAliasEnd(src, start);
      index.set(name, src.slice(start, end).trim());
    }
  }

  return index;
}

/** Given the index of `{` at `open`, return the substring (incl. braces) of the matched block. */
function extractBraceBlock(src: string, open: number): string | null {
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

/** End offset of a non-object type alias rhs (top-level `;` or newline, brace-aware). */
function findAliasEnd(src: string, start: number): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "{" || c === "<" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ">" || c === ")" || c === "]") depth--;
    else if (depth === 0 && (c === ";" || c === "\n")) return i;
  }
  return src.length;
}

/**
 * Split an object body (the `{ ... }` block, braces included or not) into its
 * top-level `key`/`optional`/`valueType` fields, respecting nested
 * braces/brackets/parens/angle-brackets.
 */
export function splitTopLevelFields(
  body: string,
): Array<{ key: string; optional: boolean; valueType: string }> {
  let s = body.trim();
  if (s.startsWith("{")) s = s.slice(1);
  if (s.endsWith("}")) s = s.slice(0, -1);

  const fields: Array<{ key: string; optional: boolean; valueType: string }> =
    [];
  let depth = 0;
  let buf = "";
  const flush = (): void => {
    const seg = buf.trim();
    buf = "";
    if (!seg) return;
    const colon = seg.indexOf(":");
    if (colon < 0) return; // method signature / index sig / malformed — skip
    let key = seg.slice(0, colon).trim();
    const valueType = seg.slice(colon + 1).trim();
    let optional = false;
    if (key.endsWith("?")) {
      optional = true;
      key = key.slice(0, -1).trim();
    }
    // Strip quotes from quoted keys; skip index signatures `[k: string]`.
    if (/^["'].*["']$/.test(key)) key = key.slice(1, -1);
    if (key.startsWith("[")) return;
    if (key) fields.push({ key, optional, valueType });
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "{" || c === "[" || c === "(" || c === "<") depth++;
    else if (c === "}" || c === "]" || c === ")" || c === ">") depth--;
    if (depth === 0 && (c === ";" || c === ",")) {
      flush();
      continue;
    }
    buf += c;
  }
  flush();
  return fields;
}

export interface ResolveOptions {
  maxDepth?: number;
}

/**
 * Resolve a type reference into a `SchemaNode`, expanding named object types
 * found in `schemaSrc` (string or pre-built index). Returns null for
 * unresolvable/empty refs so the caller can skip validation cleanly.
 */
export function resolveTypeRefToSchema(
  schemaSrc: string | Map<string, string>,
  typeRef: string | undefined | null,
  opts?: ResolveOptions,
): SchemaNode | null {
  if (!typeRef || !typeRef.trim()) return null;
  const index =
    typeof schemaSrc === "string" ? indexSchemaTypes(schemaSrc) : schemaSrc;
  const maxDepth = opts?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const node = resolve(typeRef, index, 0, maxDepth, new Set());
  // A bare "unknown" node carries no validation value — treat as "skip".
  if (node && node.kind === "primitive" && node.type === "unknown") return null;
  return node;
}

function resolve(
  ref: string,
  index: Map<string, string>,
  depth: number,
  maxDepth: number,
  seen: Set<string>,
): SchemaNode {
  let r = ref.trim();

  // Trailing array suffix(es): `Course[]`, `string[][]`.
  if (r.endsWith("[]")) {
    return { kind: "array", element: resolve(r.slice(0, -2), index, depth, maxDepth, seen) };
  }

  // Inline object literal.
  if (r.startsWith("{")) {
    return objectFromBody(r, index, depth, maxDepth, seen);
  }

  // Parenthesised / union — take the first concrete member.
  if (r.startsWith("(")) r = r.slice(1, r.endsWith(")") ? -1 : undefined).trim();
  if (r.includes("|")) {
    for (const member of r.split("|").map((x) => x.trim())) {
      const node = resolve(member, index, depth, maxDepth, seen);
      if (!(node.kind === "primitive" && (node.type === "null" || node.type === "unknown"))) {
        return node;
      }
    }
    return { kind: "primitive", type: "unknown" };
  }

  const base = leadingIdent(r);
  if (!base) return { kind: "primitive", type: "unknown" };

  // String literal type ("active") or known primitive.
  if (/^["'].*["']$/.test(r)) return { kind: "primitive", type: "string" };
  const prim = PRIMITIVE_TOKENS[base.toLowerCase()];
  if (prim) return { kind: "primitive", type: prim };
  if (base.toLowerCase().startsWith("date")) return { kind: "primitive", type: "string" };

  // Named type — expand if known and within budget.
  if (index.has(base) && depth < maxDepth && !seen.has(base)) {
    const body = index.get(base)!;
    const nextSeen = new Set(seen).add(base);
    if (body.trim().startsWith("{")) {
      return objectFromBody(body, index, depth + 1, maxDepth, nextSeen);
    }
    // Alias to a scalar/union/array — resolve its rhs.
    return resolve(body, index, depth + 1, maxDepth, nextSeen);
  }

  // Unknown/over-budget/cyclic named type → unknown (validateShape tolerates).
  return { kind: "primitive", type: "unknown" };
}

function objectFromBody(
  body: string,
  index: Map<string, string>,
  depth: number,
  maxDepth: number,
  seen: Set<string>,
): SchemaNode {
  const fields: Record<string, SchemaNode> = {};
  const optional = new Set<string>();
  for (const f of splitTopLevelFields(body)) {
    fields[f.key] = resolve(f.valueType, index, depth, maxDepth, seen);
    if (f.optional) optional.add(f.key);
  }
  return { kind: "object", fields, optional: optional.size ? optional : undefined };
}
