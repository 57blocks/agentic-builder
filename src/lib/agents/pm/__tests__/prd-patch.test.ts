import { describe, expect, it } from "vitest";

import {
  applyPrdPatches,
  hasPrdDiffMarkers,
  parsePrdDiffSegments,
  resolvePrdDiff,
  resolveAllPrdDiff,
  wrapWholeDocDiff,
  stripChangeMarkers,
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
