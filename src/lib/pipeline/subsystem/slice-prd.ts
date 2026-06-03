/**
 * Deterministic PRD slicer. Given a PRD and a SubsystemPlan (which classifies
 * each H2 section as shared or owned by a subsystem), cut the PRD into:
 *   - a `shared` slice (preamble + all shared sections), and
 *   - one self-contained slice per subsystem (shared sections + own sections),
 * preserving the PRD's original section order within each group.
 *
 * Pure — no LLM, no I/O. Heading matching mirrors applyPrdPatches: normalised
 * (whitespace-trimmed) exact match, with a prefix-tolerant fallback for the
 * common case where a classifier truncated a heading at a full-width paren.
 */

import type { SubsystemPlan, SlicedPrd, PrdSlice } from "./types";

interface H2Section {
  heading: string; // verbatim heading line
  start: number; // line index of the heading
  end: number; // exclusive — next H2 or EOF
}

function isH2(line: string): boolean {
  return /^##\s+\S/.test(line) && !/^###/.test(line);
}

function norm(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function stripParen(s: string): string {
  return s.replace(/[（(].*$/, "").trim();
}

/** Parse the PRD into the preamble (before the first H2) + ordered H2 sections. */
export function parseH2Sections(prd: string): { preamble: string; sections: H2Section[] } {
  const lines = prd.split("\n");
  const sections: H2Section[] = [];
  let firstH2 = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (isH2(lines[i])) {
      if (firstH2 === lines.length) firstH2 = i;
      const start = i;
      let end = lines.length;
      for (let j = i + 1; j < lines.length; j++) {
        if (isH2(lines[j])) { end = j; break; }
      }
      sections.push({ heading: lines[i], start, end });
      i = end - 1;
    }
  }
  const preamble = lines.slice(0, firstH2).join("\n").trim();
  return { preamble, sections };
}

/** Resolve a (possibly truncated) heading to a section index. */
function resolve(sections: H2Section[], heading: string): number {
  const k = norm(heading);
  let i = sections.findIndex((s) => norm(s.heading) === k);
  if (i >= 0) return i;
  const target = stripParen(k);
  return sections.findIndex((s) => {
    const hk = norm(s.heading);
    return hk.startsWith(k) || k.startsWith(hk) || stripParen(hk) === target;
  });
}

function sectionText(prd: string, sec: H2Section): string {
  return prd.split("\n").slice(sec.start, sec.end).join("\n").trim();
}

export function slicePrd(prd: string, plan: SubsystemPlan): SlicedPrd {
  const { preamble, sections } = parseH2Sections(prd);
  const owner = new Array<string | null>(sections.length).fill(null); // subsystem id or "shared"

  for (const h of plan.sharedHeadings) {
    const i = resolve(sections, h);
    if (i >= 0 && owner[i] == null) owner[i] = "shared";
  }
  for (const sub of plan.subsystems) {
    for (const h of sub.sectionHeadings) {
      const i = resolve(sections, h);
      if (i >= 0 && owner[i] == null) owner[i] = sub.id;
    }
  }

  // Unassigned sections default to shared (safer to include than drop).
  const unassigned: string[] = [];
  sections.forEach((s, i) => {
    if (owner[i] == null) { owner[i] = "shared"; unassigned.push(s.heading.trim()); }
  });

  const textOf = (pred: (id: string) => boolean): string =>
    sections.filter((_s, i) => pred(owner[i]!)).map((s) => sectionText(prd, s)).join("\n\n");

  const sharedBody = textOf((id) => id === "shared");
  const sharedMd = [preamble, sharedBody].filter(Boolean).join("\n\n");

  const shared: PrdSlice = { id: "shared", name: "Shared contracts", markdown: sharedMd };

  const subsystems: PrdSlice[] = plan.subsystems.map((sub) => {
    const ownBody = textOf((id) => id === sub.id);
    const md = [
      `# ${sub.name} 子系统切片`,
      "",
      `> 自动生成的子系统切片(${sub.id})。包含【共享契约】+【${sub.name} 专属章节】。`,
      `> 共享契约由 \`shared\` 切片统一生成,此处作为实现参考,勿重复建模。`,
      sub.dependsOn.length ? `> 依赖:${sub.dependsOn.join(", ")}` : "",
      "",
      "---",
      "",
      "# 共享契约(参考)",
      "",
      sharedBody,
      "",
      "---",
      "",
      `# ${sub.name} 专属规格`,
      "",
      ownBody,
    ].filter((l) => l !== undefined).join("\n");
    return { id: sub.id, name: sub.name, markdown: md };
  });

  return { shared, subsystems, unassigned };
}
