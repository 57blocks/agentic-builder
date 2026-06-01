/**
 * PRD section-level diff.
 *
 * Splits a PRD markdown into `{ heading, level, body }` sections and compares
 * two versions to surface which sections changed. Pure, no LLM, no I/O.
 *
 * Used by the incremental-rerun flow to detect prose-only edits that the
 * ID-based diff (`diffPrdRequirements`) misses — e.g. user rewrites the
 * description of FR-DI03 without adding/removing any FR-XX ID.
 *
 * Section model: a section's body runs from the line *after* its heading up
 * to (exclusive) the next heading at the same OR shallower level. This mirrors
 * `applyPrdPatches()`'s notion of a section so the two stay consistent.
 */

export interface PrdSection {
  /** Heading line as it appears in the PRD, including leading hashes. */
  heading: string;
  /** Heading depth (1–6). 0 means "no heading" (preamble before first heading). */
  level: number;
  /** Section body — everything until the next heading of the same or shallower level. */
  body: string;
}

export interface PrdSectionDiff {
  /** Headings whose body changed (added, removed, or modified text). */
  changed: PrdSection[];
  /** Sections present only in the new PRD. Reported as `changed` too. */
  added: PrdSection[];
  /** Sections present only in the old PRD. Reported as `changed` too. */
  removed: PrdSection[];
}

function headingLevel(line: string): number {
  const m = line.match(/^(#{1,6})\s+\S/);
  return m ? m[1]!.length : 0;
}

function normaliseHeading(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

/**
 * Split a PRD into sections by ATX heading. Preamble text before the first
 * heading is returned as a section with `level: 0` and `heading: ""` so prose
 * edits in that area still surface.
 */
export function splitPrdSections(markdown: string): PrdSection[] {
  const lines = markdown.split("\n");
  const sections: PrdSection[] = [];

  let currentHeading = "";
  let currentLevel = 0;
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const lvl = headingLevel(lines[i]!);
    if (lvl === 0) continue;

    // Flush the section that ended at line i-1.
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      body: lines.slice(bodyStart, i).join("\n"),
    });
    currentHeading = normaliseHeading(lines[i]!);
    currentLevel = lvl;
    bodyStart = i + 1;
  }

  // Flush the final section.
  sections.push({
    heading: currentHeading,
    level: currentLevel,
    body: lines.slice(bodyStart).join("\n"),
  });

  // Drop a leading empty preamble (no heading + empty body) — it carries no
  // signal and pollutes the diff result.
  return sections.filter(
    (s, idx) => !(idx === 0 && s.level === 0 && s.body.trim() === ""),
  );
}

/** Normalize a body for equality comparison: collapse trailing whitespace,
 *  drop blank-only diffs, and strip the `<div class="prd-changed-section">`
 *  visual-highlight wrappers that `applyPrdPatches()` injects so a re-run
 *  against a marker-wrapped snapshot doesn't look "changed" for that reason. */
function canonicalizeBody(body: string): string {
  return body
    .replace(/<div class="prd-changed-section">\s*/g, "")
    .replace(/\s*<\/div>/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Compare two PRDs section by section. Returns the set of sections whose body
 * differs (including sections that exist in only one side). Pure.
 *
 * Two sections are considered "the same section" when their normalised
 * heading text matches. This is intentionally simple — renamed headings show
 * up as one `removed` + one `added`, which is the conservative outcome (both
 * get flagged as changed).
 */
export function diffPrdSections(
  oldPrd: string,
  newPrd: string,
): PrdSectionDiff {
  const oldSections = splitPrdSections(oldPrd);
  const newSections = splitPrdSections(newPrd);

  const oldByHeading = new Map<string, PrdSection>();
  for (const s of oldSections) oldByHeading.set(s.heading, s);
  const newByHeading = new Map<string, PrdSection>();
  for (const s of newSections) newByHeading.set(s.heading, s);

  const changed: PrdSection[] = [];
  const added: PrdSection[] = [];
  const removed: PrdSection[] = [];

  for (const s of newSections) {
    const prev = oldByHeading.get(s.heading);
    if (!prev) {
      added.push(s);
      changed.push(s);
      continue;
    }
    if (canonicalizeBody(prev.body) !== canonicalizeBody(s.body)) {
      changed.push(s);
    }
  }
  for (const s of oldSections) {
    if (!newByHeading.has(s.heading)) {
      removed.push(s);
      changed.push(s);
    }
  }

  return { changed, added, removed };
}
