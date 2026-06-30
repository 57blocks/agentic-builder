// src/lib/agents/prototype/extract-tsx.ts

/**
 * Pull the React component source out of an LLM reply. Prefers a fenced code
 * block that contains an `export`; falls back to the first fenced block, then
 * to the raw (trimmed) text. Always returns a trailing newline.
 */
export function extractTsxFromLlmOutput(raw: string): string {
  const fenceRe = /```\w*\s*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(raw)) !== null) {
    blocks.push(m[1]);
  }
  const chosen =
    blocks.find((b) => /export\s+(default\s+)?function|export\s+const/.test(b)) ??
    blocks[0] ??
    raw;
  return `${chosen.trim()}\n`;
}
