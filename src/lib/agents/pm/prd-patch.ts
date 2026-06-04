/**
 * PRD section-level patch applier.
 *
 * Given an existing PRD and a set of patches that each target a Markdown
 * heading (e.g. "### 5.1 Monitor Dashboard"), produce a new PRD where each
 * targeted section's body is replaced by the patch's newBody — wrapped in a
 * diff block that carries BOTH the old and the new body so the UI can render
 * an inline old-vs-new diff with per-hunk accept/reject (Cursor-style).
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
  /** The patched PRD content, with changed sections wrapped in PRD-DIFF
   *  markers (old + new) so the UI can render an inline reviewable diff. */
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

// ─── Diff markers ───────────────────────────────────────────────────────────
// HTML comments so they never render even if a parse path misses them. Each
// changed section becomes:
//   <!--PRD-DIFF:START:{id}-->
//   <!--PRD-DIFF:OLD-->
//   {old body}
//   <!--PRD-DIFF:SEP-->
//   {new body}
//   <!--PRD-DIFF:END-->
const PRD_DIFF_START = "<!--PRD-DIFF:START:";
const PRD_DIFF_OLD = "<!--PRD-DIFF:OLD-->";
const PRD_DIFF_SEP = "<!--PRD-DIFF:SEP-->";
const PRD_DIFF_END = "<!--PRD-DIFF:END-->";

/** Matches one whole diff block → [, id, oldBody, newBody]. */
const PRD_DIFF_RE =
  /<!--PRD-DIFF:START:([^>]+?)-->\s*<!--PRD-DIFF:OLD-->\n?([\s\S]*?)\n?<!--PRD-DIFF:SEP-->\n?([\s\S]*?)\n?<!--PRD-DIFF:END-->/g;

export interface PrdDiffHunk {
  id: string;
  oldBody: string;
  newBody: string;
}

export type PrdSegment =
  | { type: "md"; text: string }
  | ({ type: "diff" } & PrdDiffHunk);

/** True when the content still has unresolved PRD-DIFF blocks. */
export function hasPrdDiffMarkers(content: string): boolean {
  PRD_DIFF_RE.lastIndex = 0;
  return PRD_DIFF_RE.test(content);
}

/**
 * Split content into ordered segments: plain markdown and diff hunks. Lets the
 * UI render unchanged prose via the normal markdown renderer and each changed
 * section as an inline reviewable diff.
 */
export function parsePrdDiffSegments(content: string): PrdSegment[] {
  const segments: PrdSegment[] = [];
  let lastIndex = 0;
  PRD_DIFF_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PRD_DIFF_RE.exec(content)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: "md", text: content.slice(lastIndex, m.index) });
    }
    segments.push({
      type: "diff",
      id: m[1],
      oldBody: m[2].trim(),
      newBody: m[3].trim(),
    });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "md", text: content.slice(lastIndex) });
  }
  return segments;
}

/** Resolve a single hunk: accept → keep new body, reject → keep old body. */
export function resolvePrdDiff(
  content: string,
  id: string,
  action: "accept" | "reject",
): string {
  PRD_DIFF_RE.lastIndex = 0;
  return content.replace(PRD_DIFF_RE, (whole, hunkId, oldBody, newBody) =>
    hunkId === id
      ? (action === "accept" ? newBody : oldBody).trim()
      : whole,
  );
}

/** Resolve every remaining hunk the same way. */
export function resolveAllPrdDiff(
  content: string,
  action: "accept" | "reject",
): string {
  PRD_DIFF_RE.lastIndex = 0;
  return content.replace(PRD_DIFF_RE, (_whole, _id, oldBody, newBody) =>
    (action === "accept" ? newBody : oldBody).trim(),
  );
}

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
    // Replace body [bodyStart, bodyEnd) with a diff block carrying BOTH the
    // old and new body. Bottom-up splicing keeps lower indices valid, so this
    // slice is the original old body.
    const removed = plan.bodyEnd - plan.bodyStart;
    const oldBodyTrimmed = lines
      .slice(plan.bodyStart, plan.bodyEnd)
      .join("\n")
      .replace(/^\n+|\n+$/g, "");
    const newBodyTrimmed = plan.newBody.replace(/^\n+|\n+$/g, "");
    const id = `d${plan.headingLine}`;
    const replacement = [
      "", // blank line so the heading stays a heading
      `${PRD_DIFF_START}${id}-->`,
      PRD_DIFF_OLD,
      oldBodyTrimmed,
      PRD_DIFF_SEP,
      newBodyTrimmed,
      PRD_DIFF_END,
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
 * Wrap a whole-document replacement (old vs new) as a single diff hunk. Used
 * by the full-rewrite fallback so even that path is shown as one reviewable
 * inline diff instead of re-streaming the whole PRD.
 */
export function wrapWholeDocDiff(oldContent: string, newContent: string): string {
  return [
    `${PRD_DIFF_START}full-->`,
    PRD_DIFF_OLD,
    oldContent.replace(/^\n+|\n+$/g, ""),
    PRD_DIFF_SEP,
    newContent.replace(/^\n+|\n+$/g, ""),
    PRD_DIFF_END,
    "",
  ].join("\n");
}

/**
 * Strip change markers — used when persisting the canonical PRD content (we
 * don't want UI-only wrappers saved into the doc). Any UNRESOLVED PRD-DIFF
 * block resolves to its NEW body (the proposed change is the default), and the
 * legacy prd-changed-section highlight wrapper is removed.
 */
export function stripChangeMarkers(content: string): string {
  let out = content;
  // Resolve any leftover diff blocks to their new body.
  PRD_DIFF_RE.lastIndex = 0;
  out = out.replace(PRD_DIFF_RE, (_whole, _id, _oldBody, newBody) =>
    String(newBody).trim(),
  );
  // Legacy highlight wrapper.
  out = out
    .replace(/\n?<div class="prd-changed-section">\s*\n/g, "\n")
    .replace(/\n?<\/div>\s*\n(?=\n|$)/g, "\n");
  return out;
}
