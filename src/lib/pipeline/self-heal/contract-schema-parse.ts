/**
 * Lightweight parser for the TS-ish `requestSchema` / `responseSchema` strings
 * carried in `API_CONTRACTS.json`, e.g.
 *
 *   "{ user: { id: number; name: string; email: string }; token: string }"
 *   "{ items: { id: number; title: string }[]; total: number }"
 *   "none"
 *
 * These are NOT valid TypeScript — they are human-authored hints. We parse them
 * just well enough to (a) synthesize a plausible request body for write probes
 * and (b) LOOSELY validate that a response JSON has the expected top-level keys
 * with the right primitive families. This is intentionally forgiving: the goal
 * is to catch "endpoint returns the wrong thing / nothing" — not to enforce a
 * strict contract.
 *
 * No LLM, no `eval` — a tiny hand-rolled recursive-descent parser over a brace
 * grammar.
 */

export type SchemaNode =
  | { kind: "primitive"; type: "string" | "number" | "boolean" | "null" | "unknown" }
  | { kind: "object"; fields: Record<string, SchemaNode>; optional?: Set<string> }
  | { kind: "array"; element: SchemaNode };

/** Returns null for "none" / empty / unparseable schemas. */
export function parseContractSchema(raw: string | null | undefined): SchemaNode | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || /^none$/i.test(trimmed) || /^void$/i.test(trimmed)) return null;
  try {
    const parser = new SchemaParser(trimmed);
    const node = parser.parseType();
    return node;
  } catch {
    return null;
  }
}

class SchemaParser {
  private i = 0;
  constructor(private readonly src: string) {}

  private peek(): string {
    return this.src[this.i] ?? "";
  }
  private eof(): boolean {
    return this.i >= this.src.length;
  }
  private ws(): void {
    while (!this.eof() && /\s/.test(this.peek())) this.i++;
  }

  parseType(): SchemaNode {
    this.ws();
    let node = this.parseNonArray();
    // Trailing `[]` (possibly repeated) → array wrapping.
    this.ws();
    while (this.src.startsWith("[]", this.i)) {
      this.i += 2;
      node = { kind: "array", element: node };
      this.ws();
    }
    return node;
  }

  private parseNonArray(): SchemaNode {
    this.ws();
    const c = this.peek();
    if (c === "{") return this.parseObject();
    if (c === "(") {
      // parenthesised — e.g. "(A | B)[]". Parse inner, then array handled by caller.
      this.i++;
      const inner = this.parseType();
      this.ws();
      if (this.peek() === ")") this.i++;
      return inner;
    }
    return this.parseScalarOrUnion();
  }

  private parseObject(): SchemaNode {
    this.i++; // consume "{"
    const fields: Record<string, SchemaNode> = {};
    const optional = new Set<string>();
    this.ws();
    while (!this.eof() && this.peek() !== "}") {
      this.ws();
      // key — identifier or quoted string
      let key = "";
      if (this.peek() === '"' || this.peek() === "'") {
        const q = this.peek();
        this.i++;
        while (!this.eof() && this.peek() !== q) key += this.src[this.i++];
        this.i++; // closing quote
      } else {
        while (!this.eof() && /[A-Za-z0-9_$]/.test(this.peek())) key += this.src[this.i++];
      }
      this.ws();
      let isOptional = false;
      if (this.peek() === "?") {
        isOptional = true;
        this.i++;
        this.ws();
      }
      if (this.peek() === ":") {
        this.i++;
        const value = this.parseType();
        if (key) {
          fields[key] = value;
          if (isOptional) optional.add(key);
        }
      } else if (key) {
        // Shorthand / malformed — treat as unknown.
        fields[key] = { kind: "primitive", type: "unknown" };
        if (isOptional) optional.add(key);
      }
      this.ws();
      // separators: , or ;
      if (this.peek() === "," || this.peek() === ";") {
        this.i++;
        this.ws();
      }
    }
    if (this.peek() === "}") this.i++;
    return { kind: "object", fields, optional: optional.size ? optional : undefined };
  }

  private parseScalarOrUnion(): SchemaNode {
    // Consume a token up to a separator/terminator, then if a union "|" follows,
    // collapse to the first non-null member (good enough for sampling).
    const first = this.consumeScalarToken();
    this.ws();
    let node = scalarToNode(first);
    while (this.peek() === "|") {
      this.i++;
      this.ws();
      const next = this.consumeScalarToken();
      const nextNode = scalarToNode(next);
      // Prefer a concrete (non-null/unknown) member.
      if (node.kind === "primitive" && (node.type === "null" || node.type === "unknown")) {
        node = nextNode;
      }
      this.ws();
    }
    return node;
  }

  private consumeScalarToken(): string {
    this.ws();
    // string/number literal in quotes → string family
    if (this.peek() === '"' || this.peek() === "'") {
      const q = this.peek();
      this.i++;
      let lit = "";
      while (!this.eof() && this.peek() !== q) lit += this.src[this.i++];
      this.i++;
      return "string";
    }
    let tok = "";
    while (!this.eof() && /[A-Za-z0-9_$.<>]/.test(this.peek())) tok += this.src[this.i++];
    return tok;
  }
}

function scalarToNode(token: string): SchemaNode {
  const t = token.toLowerCase();
  if (t === "string" || t.startsWith("date")) return { kind: "primitive", type: "string" };
  if (t === "number" || t === "int" || t === "integer" || t === "float" || t === "bigint")
    return { kind: "primitive", type: "number" };
  if (t === "boolean" || t === "bool") return { kind: "primitive", type: "boolean" };
  if (t === "null" || t === "undefined") return { kind: "primitive", type: "null" };
  // string literals like "active" | "archived" → string family
  if (/^[a-z0-9_]+$/i.test(t)) return { kind: "primitive", type: "string" };
  return { kind: "primitive", type: "unknown" };
}

// ─── Request-body synthesis ────────────────────────────────────────────────────

/**
 * Produce a plausible JSON value for a parsed schema, used as the body of a
 * write probe. Deterministic (no randomness) so runs are reproducible.
 */
export function sampleFromSchema(node: SchemaNode | null): unknown {
  if (!node) return {};
  switch (node.kind) {
    case "primitive":
      return samplePrimitive(node.type);
    case "array":
      return [sampleFromSchema(node.element)];
    case "object": {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node.fields)) {
        out[k] = sampleValueForField(k, v);
      }
      return out;
    }
  }
}

function samplePrimitive(type: string): unknown {
  switch (type) {
    case "string":
      return "smoke-test";
    case "number":
      return 1;
    case "boolean":
      return true;
    case "null":
      return null;
    default:
      return "smoke-test";
  }
}

/** Field-name-aware sampling so common fields get realistic values. */
function sampleValueForField(name: string, node: SchemaNode): unknown {
  if (node.kind === "primitive" && node.type === "string") {
    const n = name.toLowerCase();
    if (n.includes("email")) return "smoke-test@example.com";
    if (n === "password" || n === "confirmpassword") return "Smoke-test-1234";
    if (n.includes("url")) return "https://example.com";
    if (n.includes("name")) return "Smoke Test";
  }
  return sampleFromSchema(node);
}

// ─── Response-shape validation (loose) ─────────────────────────────────────────

export interface ShapeMismatch {
  path: string;
  reason: string;
}

/**
 * Loosely validate that `value` matches `node`. Only checks:
 *  - object: every NON-optional declared key is present (extra keys are fine)
 *  - array: value is an array; if non-empty, the first element matches
 *  - primitive: family matches (string/number/boolean), `unknown`/`null` always pass
 *
 * Returns the list of mismatches (empty = OK). Caps at `maxIssues` to keep
 * evidence short.
 */
export function validateShape(
  value: unknown,
  node: SchemaNode | null,
  opts?: { maxIssues?: number },
): ShapeMismatch[] {
  const issues: ShapeMismatch[] = [];
  const max = opts?.maxIssues ?? 6;
  if (!node) return issues;
  walk(value, node, "$", issues, max);
  return issues.slice(0, max);
}

function walk(value: unknown, node: SchemaNode, path: string, out: ShapeMismatch[], max: number): void {
  if (out.length >= max) return;
  switch (node.kind) {
    case "primitive": {
      if (node.type === "unknown" || node.type === "null") return;
      if (value === null || value === undefined) return; // tolerate nullable
      const actual = typeof value;
      if (node.type === "string" && actual !== "string")
        out.push({ path, reason: `expected string, got ${actual}` });
      else if (node.type === "number" && actual !== "number")
        out.push({ path, reason: `expected number, got ${actual}` });
      else if (node.type === "boolean" && actual !== "boolean")
        out.push({ path, reason: `expected boolean, got ${actual}` });
      return;
    }
    case "array": {
      if (!Array.isArray(value)) {
        out.push({ path, reason: `expected array, got ${typeof value}` });
        return;
      }
      if (value.length > 0) walk(value[0], node.element, `${path}[0]`, out, max);
      return;
    }
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        out.push({ path, reason: `expected object, got ${value === null ? "null" : Array.isArray(value) ? "array" : typeof value}` });
        return;
      }
      const obj = value as Record<string, unknown>;
      for (const [k, child] of Object.entries(node.fields)) {
        if (out.length >= max) return;
        const isOptional = node.optional?.has(k);
        if (!(k in obj)) {
          if (!isOptional) out.push({ path: `${path}.${k}`, reason: "missing key" });
          continue;
        }
        walk(obj[k], child, `${path}.${k}`, out, max);
      }
      return;
    }
  }
}
