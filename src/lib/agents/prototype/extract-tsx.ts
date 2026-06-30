// src/lib/agents/prototype/extract-tsx.ts

/** Fence language tags we treat as component-source candidates (plus the empty/untagged fence). */
const CODE_LANGS = new Set(["tsx", "jsx", "ts", "typescript", "react", "js", "javascript", ""]);

interface FencedBlock {
  lang: string;
  body: string;
}

/**
 * Pull the React component source out of an LLM reply. Parses every fenced block,
 * then selects in priority order:
 *   1. a CODE-language block containing an `export` declaration,
 *   2. any CODE-language block,
 *   3. any block containing an `export` declaration,
 *   4. the first fenced block,
 *   5. the raw (trimmed) text.
 * Always returns a trailing newline. Non-code fences (e.g. ```json) are never
 * preferred just because their text happens to contain "export".
 *
 * Known limitation: a fenced block whose body itself contains ``` is truncated
 * at the first inner fence (regex-based parsing).
 */
export function extractTsxFromLlmOutput(raw: string): string {
  const fenceRe = /```(\w*)\s*\n([\s\S]*?)```/g;
  const blocks: FencedBlock[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(raw)) !== null) {
    blocks.push({ lang: m[1].toLowerCase(), body: m[2] });
  }
  const hasExport = (b: FencedBlock) =>
    /export\s+(default\s+)?function|export\s+const|export\s+class/.test(b.body);
  const isCode = (b: FencedBlock) => CODE_LANGS.has(b.lang);

  const chosen =
    blocks.find((b) => isCode(b) && hasExport(b)) ??
    blocks.find(isCode) ??
    blocks.find(hasExport) ??
    blocks[0] ??
    null;

  return `${(chosen ? chosen.body : raw).trim()}\n`;
}
