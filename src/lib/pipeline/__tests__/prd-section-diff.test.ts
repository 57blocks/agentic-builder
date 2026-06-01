import { describe, expect, it } from "vitest";

import {
  diffPrdSections,
  splitPrdSections,
} from "../prd-section-diff";

const PRD_V1 = `# PRD: Demo

## 1. Overview
The demo lists stablecoins.

## 2. Features

### 2.1 Listing
- FR-LS01: list coins.
- FR-LS02: filter by chain.

### 2.2 Detail
- FR-DT01: show coin score.

## 3. Out of scope
None.
`;

describe("splitPrdSections", () => {
  it("walks every ATX heading", () => {
    const sections = splitPrdSections(PRD_V1);
    expect(sections.map((s) => s.heading)).toEqual([
      "# PRD: Demo",
      "## 1. Overview",
      "## 2. Features",
      "### 2.1 Listing",
      "### 2.2 Detail",
      "## 3. Out of scope",
    ]);
  });

  it("captures the body of a subsection up to the next same-or-shallower heading", () => {
    const sections = splitPrdSections(PRD_V1);
    const listing = sections.find((s) => s.heading === "### 2.1 Listing");
    expect(listing?.body).toContain("FR-LS01");
    expect(listing?.body).toContain("FR-LS02");
    // Should NOT bleed into "### 2.2 Detail" or "## 3. Out of scope".
    expect(listing?.body).not.toContain("FR-DT01");
    expect(listing?.body).not.toContain("Out of scope");
  });
});

describe("diffPrdSections", () => {
  it("returns no changed sections when content is identical", () => {
    const result = diffPrdSections(PRD_V1, PRD_V1);
    expect(result.changed).toEqual([]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("flags a single section when only its prose changes (no ID delta)", () => {
    const v2 = PRD_V1.replace(
      "- FR-LS01: list coins.",
      "- FR-LS01: list coins (sorted alphabetically by symbol).",
    );
    const result = diffPrdSections(PRD_V1, v2);
    expect(result.changed.map((s) => s.heading)).toEqual([
      "### 2.1 Listing",
    ]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("flags an entirely new section as both added and changed", () => {
    const v2 =
      PRD_V1.trimEnd() +
      `\n\n### 2.3 Audit\n- FR-AU01: write every score to an audit log.\n`;
    const result = diffPrdSections(PRD_V1, v2);
    expect(result.added.map((s) => s.heading)).toEqual(["### 2.3 Audit"]);
    expect(result.changed.map((s) => s.heading)).toContain("### 2.3 Audit");
  });

  it("flags a removed section as both removed and changed", () => {
    const v2 = PRD_V1.replace(
      /### 2\.2 Detail[\s\S]*?\n## /,
      "## ",
    );
    const result = diffPrdSections(PRD_V1, v2);
    expect(result.removed.map((s) => s.heading)).toContain("### 2.2 Detail");
    expect(result.changed.map((s) => s.heading)).toContain("### 2.2 Detail");
  });

  it("ignores prd-changed-section marker wrappers (idempotent vs UI highlight)", () => {
    const wrapped = PRD_V1.replace(
      "### 2.1 Listing\n- FR-LS01: list coins.",
      '### 2.1 Listing\n<div class="prd-changed-section">\n- FR-LS01: list coins.',
    ).replace(
      "- FR-LS02: filter by chain.\n",
      "- FR-LS02: filter by chain.\n</div>\n",
    );
    const result = diffPrdSections(PRD_V1, wrapped);
    expect(result.changed).toEqual([]);
  });
});
