export interface EngineeringFrontmatter {
  name: string;
  description?: string;
  whenToUse: string[];
  body: string;
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

/**
 * Read the small subset of YAML frontmatter used by Engineering SKILL.md
 * files: a `name:` scalar, an optional `description:` scalar (plain inline or
 * YAML block scalar `>` / `|`), and an optional `when_to_use:` block list
 * (`  - item` lines). Everything else is ignored.
 * Returns the verbatim Markdown body (everything after the frontmatter).
 */
export function parseEngineeringFrontmatter(
  raw: string,
  sourceLabel: string,
): EngineeringFrontmatter {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) {
    throw new Error(`Engineering skill ${sourceLabel}: missing --- frontmatter ---.`);
  }
  const [, fm, body] = m;
  const lines = fm.split("\n");

  let name: string | undefined;
  let description: string | undefined;
  const whenToUse: string[] = [];
  let inWhen = false;

  // Block-scalar state for `description`
  type BlockMode = "folded" | "literal" | null;
  let blockMode: BlockMode = null;
  const blockLines: string[] = [];

  /** Flush accumulated block-scalar lines into `description` and reset state. */
  function flushBlock(): void {
    if (blockMode === null) return;
    const joined =
      blockMode === "folded"
        ? blockLines.join(" ").trim()
        : blockLines.join("\n").replace(/\n+$/, ""); // strip trailing newlines for literal
    description = joined || undefined;
    blockMode = null;
    blockLines.length = 0;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // While collecting a block scalar, look for continuation lines (indented).
    if (blockMode !== null) {
      // A line with leading whitespace is part of the block.
      if (/^\s+/.test(line)) {
        blockLines.push(line.trim());
        continue;
      }
      // Non-indented line ends the block — fall through to normal processing
      // (don't `continue`; we must handle this line as a regular key/item).
      flushBlock();
    }

    const scalar = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (scalar) {
      const key = scalar[1];
      const val = scalar[2].trim().replace(/^["']|["']$/g, "");
      inWhen = false;
      if (key === "name") {
        name = val;
      } else if (key === "description") {
        if (val === ">" || val === "|") {
          // Start collecting a block scalar.
          blockMode = val === ">" ? "folded" : "literal";
          blockLines.length = 0;
          description = undefined;
        } else {
          description = val || undefined;
        }
      } else if (key === "when_to_use") {
        inWhen = true; // value (if any) ignored; list follows
      }
      continue;
    }

    const item = line.match(/^\s*-\s+(.*)$/);
    if (inWhen && item) {
      const v = item[1].trim().replace(/^["']|["']$/g, "");
      if (v) whenToUse.push(v);
    }
  }

  // Flush any block still open at end of frontmatter.
  flushBlock();

  if (!name) {
    throw new Error(`Engineering skill ${sourceLabel}: required "name" frontmatter is missing.`);
  }
  return { name, description, whenToUse, body: body ?? "" };
}
