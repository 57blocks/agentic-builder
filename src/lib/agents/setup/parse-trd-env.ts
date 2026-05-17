/**
 * Extract the list of env keys the TRD declares in its `.env.example` block.
 *
 * The TRD writer agent emits §12 with a fenced code block of `.env` syntax.
 * We pull out every line shaped like `KEY=...` (ignoring comments and the
 * shebang `# section headers`) and return the unique keys in document order.
 */

export function parseEnvKeysFromTrd(trdContent: string | null | undefined): string[] {
  if (!trdContent) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  // Find the .env.example fenced block first; if not found, scan the whole
  // doc — some TRDs put env keys in a NFR row's narrative.
  const fenceMatch = trdContent.match(/```(?:env|bash|shell|ini)?[^\n]*\n([\s\S]*?)```/g);
  const haystack = fenceMatch?.join("\n") ?? trdContent;

  // KEY=value lines. KEY must start with a letter, contain only A-Z 0-9 _.
  // Value may be empty (TRD's `.env.example` often has empty placeholders).
  const re = /^[ \t]*([A-Z][A-Z0-9_]{2,})[ \t]*=/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(haystack)) !== null) {
    const key = m[1];
    if (seen.has(key)) continue;
    // Skip common comment-style false positives ("NOTE", "TODO", "TBD")
    if (
      key === "NOTE" ||
      key === "TODO" ||
      key === "TBD" ||
      key === "FIXME"
    ) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }

  return out;
}
