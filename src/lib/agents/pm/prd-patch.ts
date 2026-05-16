/**
 * PRD section-level patch applier.
 *
 * Given an existing PRD and a set of patches that each target a Markdown
 * heading (e.g. "### 5.1 Monitor Dashboard"), produce a new PRD where each
 * targeted section's body is replaced by the patch's newBody and visually
 * marked so the UI can highlight what changed.
 *
 * "Section body" = everything between a heading line and the next heading of
 * the same OR higher level. Subsections nested under the patched heading are
 * therefore replaced too (they're part of the body), which is what callers
 * typically want — the LLM patch contains the full new subtree.
 */

export interface PrdPatch {
  /** The heading line as it appears in the existing PRD, e.g. "### 5.1 Monitor Dashboard".
   *  Must include the leading hashes. The match is whitespace-trimmed but otherwise exact. */
  heading: string;
  /** The new markdown that should replace the section body (NOT including the heading line). */
  newBody: string;
}

export interface ApplyPatchesResult {
  /** The patched PRD content, with changed sections wrapped in
   *  <div class="prd-changed-section"> ... </div> for visual highlight. */
  content: string;
  /** Headings that were successfully replaced. */
  applied: string[];
  /** Headings the patch agent referenced but that don't exist in the PRD. */
  skipped: { heading: string; reason: string }[];
  /** Total source lines that were touched, for the >50% fallback heuristic. */
  changedLineCount: number;
  /** Original PRD line count, for the same heuristic. */
  originalLineCount: number;
}

const MARKER_OPEN = '<div class="prd-changed-section">';
const MARKER_CLOSE = "</div>";

/**
 * Returns the heading "level" (1 = `#`, 2 = `##`, 3 = `###`, etc.)
 * or 0 if the line is not an ATX heading.
 */
function headingLevel(line: string): number {
  const m = line.match(/^(#{1,6})\s+\S/);
  return m ? m[1].length : 0;
}

function normaliseHeading(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

export function applyPrdPatches(
  existingPrd: string,
  patches: PrdPatch[],
): ApplyPatchesResult {
  const lines = existingPrd.split("\n");
  const originalLineCount = lines.length;

  // Index each heading line: normalised text -> line index.
  // First match wins on duplicates (rare but possible).
  const headingIndex = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    if (headingLevel(lines[i]) > 0) {
      const key = normaliseHeading(lines[i]);
      if (!headingIndex.has(key)) headingIndex.set(key, i);
    }
  }

  // Plan replacements; we operate on line ranges and apply from BOTTOM UP
  // to keep earlier indices stable.
  type Plan = {
    headingLine: number;
    bodyStart: number; // inclusive (line after the heading)
    bodyEnd: number; // exclusive (next sibling-or-higher heading line, or lines.length)
    newBody: string;
    headingText: string;
  };

  const plans: Plan[] = [];
  const applied: string[] = [];
  const skipped: { heading: string; reason: string }[] = [];

  for (const patch of patches) {
    const key = normaliseHeading(patch.heading);
    const headingLine = headingIndex.get(key);
    if (headingLine == null) {
      skipped.push({ heading: patch.heading, reason: "heading not found" });
      continue;
    }
    const level = headingLevel(lines[headingLine]);
    if (level === 0) {
      skipped.push({ heading: patch.heading, reason: "not a heading line" });
      continue;
    }

    // Find end of section: next heading whose level <= current level.
    let end = lines.length;
    for (let j = headingLine + 1; j < lines.length; j++) {
      const lvl = headingLevel(lines[j]);
      if (lvl > 0 && lvl <= level) {
        end = j;
        break;
      }
    }

    plans.push({
      headingLine,
      bodyStart: headingLine + 1,
      bodyEnd: end,
      newBody: patch.newBody,
      headingText: lines[headingLine],
    });
    applied.push(patch.heading);
  }

  if (plans.length === 0) {
    return {
      content: existingPrd,
      applied,
      skipped,
      changedLineCount: 0,
      originalLineCount,
    };
  }

  // Detect overlap — if a patch's section contains a heading also in another
  // patch, keep only the OUTERMOST one (the smaller-indexed broader one)
  // and skip the nested patch (its content will be re-emitted by the outer).
  plans.sort((a, b) => a.headingLine - b.headingLine);
  const pruned: Plan[] = [];
  let frontier = -1;
  for (const p of plans) {
    if (p.headingLine < frontier) {
      // Nested within a prior patch's range → skip.
      skipped.push({
        heading: p.headingText,
        reason: "nested within an outer patched section",
      });
      // Remove from applied if we already added it.
      const idx = applied.indexOf(p.headingText);
      if (idx >= 0) applied.splice(idx, 1);
      continue;
    }
    pruned.push(p);
    frontier = p.bodyEnd;
  }

  // Apply from bottom up.
  pruned.sort((a, b) => b.headingLine - a.headingLine);

  let changedLineCount = 0;
  for (const plan of pruned) {
    // Replace body [bodyStart, bodyEnd) with newBody wrapped in markers.
    const removed = plan.bodyEnd - plan.bodyStart;
    const newBodyTrimmed = plan.newBody.replace(/^\n+|\n+$/g, "");
    const replacement = [
      "", // blank line so the heading stays a heading and the div is its own block
      MARKER_OPEN,
      "", // blank line inside the div so markdown renders correctly
      newBodyTrimmed,
      "",
      MARKER_CLOSE,
      "",
    ];
    lines.splice(plan.bodyStart, removed, ...replacement);
    changedLineCount += replacement.length;
  }

  return {
    content: lines.join("\n"),
    applied,
    skipped,
    changedLineCount,
    originalLineCount,
  };
}

/**
 * Strip the change markers — used when persisting the canonical PRD content
 * (we don't want the highlight wrapper to be saved into the doc forever).
 */
export function stripChangeMarkers(content: string): string {
  return content
    .replace(/\n?<div class="prd-changed-section">\s*\n/g, "\n")
    .replace(/\n?<\/div>\s*\n(?=\n|$)/g, "\n");
}
