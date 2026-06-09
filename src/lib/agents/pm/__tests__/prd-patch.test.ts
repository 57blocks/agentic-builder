import { describe, expect, it } from "vitest";

import {
  applyPrdPatches,
  hasPrdDiffMarkers,
  parsePrdDiffSegments,
  resolvePrdDiff,
  resolveAllPrdDiff,
  wrapWholeDocDiff,
  stripChangeMarkers,
  looksDegenerate,
} from "../prd-patch";

const PRD = `# PRD

## 1. Overview

Old overview body.

## 2. Features

Old features body.
`;

describe("applyPrdPatches — diff markers", () => {
  it("wraps a changed section as a diff block carrying old + new", () => {
    const res = applyPrdPatches(PRD, [
      { heading: "## 2. Features", newBody: "New features body." },
    ]);
    expect(res.applied).toEqual(["## 2. Features"]);
    expect(hasPrdDiffMarkers(res.content)).toBe(true);

    const segs = parsePrdDiffSegments(res.content);
    const diff = segs.find((s) => s.type === "diff");
    expect(diff).toBeTruthy();
    if (diff && diff.type === "diff") {
      expect(diff.oldBody).toContain("Old features body.");
      expect(diff.newBody).toBe("New features body.");
    }
    // The unchanged section's body stays out of any diff block.
    const mdJoined = segs.filter((s) => s.type === "md").map((s) => (s as { text: string }).text).join("\n");
    expect(mdJoined).toContain("Old overview body.");
  });
});

describe("parse / resolve helpers", () => {
  const patched = applyPrdPatches(PRD, [
    { heading: "## 2. Features", newBody: "New features body." },
  ]).content;
  const diffId = (parsePrdDiffSegments(patched).find((s) => s.type === "diff") as { id: string }).id;

  it("accept keeps the NEW body and drops the markers", () => {
    const resolved = resolvePrdDiff(patched, diffId, "accept");
    expect(hasPrdDiffMarkers(resolved)).toBe(false);
    expect(resolved).toContain("New features body.");
    expect(resolved).not.toContain("Old features body.");
  });

  it("reject keeps the OLD body and drops the markers", () => {
    const resolved = resolvePrdDiff(patched, diffId, "reject");
    expect(hasPrdDiffMarkers(resolved)).toBe(false);
    expect(resolved).toContain("Old features body.");
    expect(resolved).not.toContain("New features body.");
  });

  it("resolveAll accept/reject resolves every hunk", () => {
    const two = applyPrdPatches(PRD, [
      { heading: "## 1. Overview", newBody: "New overview." },
      { heading: "## 2. Features", newBody: "New features." },
    ]).content;
    expect(parsePrdDiffSegments(two).filter((s) => s.type === "diff")).toHaveLength(2);

    const accepted = resolveAllPrdDiff(two, "accept");
    expect(hasPrdDiffMarkers(accepted)).toBe(false);
    expect(accepted).toContain("New overview.");
    expect(accepted).toContain("New features.");

    const rejected = resolveAllPrdDiff(two, "reject");
    expect(rejected).toContain("Old overview body.");
    expect(rejected).toContain("Old features body.");
  });
});

describe("stripChangeMarkers", () => {
  it("resolves leftover diff blocks to their NEW body", () => {
    const patched = applyPrdPatches(PRD, [
      { heading: "## 2. Features", newBody: "New features body." },
    ]).content;
    const stripped = stripChangeMarkers(patched);
    expect(hasPrdDiffMarkers(stripped)).toBe(false);
    expect(stripped).toContain("New features body.");
    expect(stripped).not.toContain("PRD-DIFF");
  });

  it("still strips the legacy prd-changed-section wrapper", () => {
    const legacy = `## X\n\n<div class="prd-changed-section">\n\nbody\n\n</div>\n`;
    const stripped = stripChangeMarkers(legacy);
    expect(stripped).not.toContain("prd-changed-section");
    expect(stripped).toContain("body");
  });
});

describe("applyPrdPatches — tolerant heading matching", () => {
  const RICH = `# PRD

### 5.1 监控看板 📊

old dash body.

## 2. Features

old features.
`;

  it("matches despite heading-level, emoji, and full-width-digit differences", () => {
    // Agent emitted "## ５.１ 监控看板" (wrong level, full-width digits, no emoji).
    const res = applyPrdPatches(RICH, [
      { heading: "## ５.１ 监控看板", newBody: "new dash body." },
    ]);
    expect(res.applied).toHaveLength(1);
    expect(res.skipped).toHaveLength(0);
    expect(res.content).toContain("new dash body.");
  });

  it("matches via a unique substring when the agent drops a trailing clause", () => {
    const res = applyPrdPatches(RICH, [
      { heading: "### 5.1 监控看板 (主页)", newBody: "new dash." },
    ]);
    expect(res.applied).toHaveLength(1);
  });

  it("skips an ambiguous heading (multiple sections match) instead of guessing", () => {
    const dup = `# PRD

## 状态

a body.

## 状态

b body.
`;
    const res = applyPrdPatches(dup, [{ heading: "## 状态", newBody: "x" }]);
    expect(res.applied).toHaveLength(0);
    expect(res.skipped[0].reason).toMatch(/ambiguous/i);
    expect(hasPrdDiffMarkers(res.content)).toBe(false);
  });

  it("still skips a genuinely absent heading as not-found", () => {
    const res = applyPrdPatches(RICH, [
      { heading: "## 9. Nonexistent", newBody: "x" },
    ]);
    expect(res.applied).toHaveLength(0);
    expect(res.skipped[0].reason).toMatch(/not found/i);
  });
});

describe("looksDegenerate", () => {
  it("flags instruction-echo repetition collapse", () => {
    const junk =
      "Some text. I'll do it. I'll output the full PRD. I'll do it. I'll output the entire PRD. I'll do it.";
    expect(looksDegenerate(junk)).toBe(true);
  });

  it("flags a short fragment echoed many times", () => {
    const junk = Array.from({ length: 12 }, () => "the system shall do the thing").join(". ");
    expect(looksDegenerate(junk)).toBe(true);
  });

  it("does not flag a healthy, varied PRD", () => {
    const ok = `# PRD
## Overview
The product lets users create courses and enroll students.
## Features
Admins approve refunds within 24 hours, subject to the cancellation policy.
Teachers can schedule classes and avoid time conflicts automatically.
## Data Model
Each course has a title, age range, category, and a roster of students.`;
    expect(looksDegenerate(ok)).toBe(false);
  });

  it("returns false on empty input", () => {
    expect(looksDegenerate("")).toBe(false);
  });
});

describe("wrapWholeDocDiff", () => {
  it("produces one diff hunk over the whole document", () => {
    const wrapped = wrapWholeDocDiff("old whole doc", "new whole doc");
    const segs = parsePrdDiffSegments(wrapped);
    const diff = segs.find((s) => s.type === "diff");
    expect(diff && diff.type === "diff" && diff.id).toBe("full");
    if (diff && diff.type === "diff") {
      expect(diff.oldBody).toBe("old whole doc");
      expect(diff.newBody).toBe("new whole doc");
    }
  });
});
