// src/lib/agents/prototype/__tests__/build-freegen-message.test.ts
import { describe, it, expect } from "vitest";
import { extractPageSection, buildFreegenMessage } from "../build-freegen-message";
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";

const prd = [
  "# PRD",
  "",
  "## 5. Pages",
  "",
  "### 5.1 Dashboard (`/dashboard`)",
  "Shows KPIs and a recent-activity feed. Has a refresh button.",
  "",
  "### 5.2 Settings (`/settings`)",
  "Profile and notification preferences.",
  "",
  "## 6. Other",
  "Not a page.",
].join("\n");

describe("extractPageSection", () => {
  it("returns the heading + body for the matching page, stopping at the next heading", () => {
    const hint: PrdPageHint = { id: "PAGE-001", name: "Dashboard", route: "/dashboard" };
    const sec = extractPageSection(prd, hint);
    expect(sec).toContain("Dashboard");
    expect(sec).toContain("recent-activity feed");
    expect(sec).not.toContain("Profile and notification");
    expect(sec).not.toContain("## 6. Other");
  });

  it("falls back to the page name line when no section matches", () => {
    const hint: PrdPageHint = { id: "PAGE-099", name: "Ghost Page", route: "/ghost" };
    expect(extractPageSection(prd, hint)).toContain("Ghost Page");
  });
});

describe("buildFreegenMessage", () => {
  const hint: PrdPageHint = { id: "PAGE-001", name: "Dashboard", route: "/dashboard" };
  it("asks to free-generate from the design system + PRD section, with logic-stub seams and the component contract", () => {
    const msg = buildFreegenMessage({
      componentName: "Dashboard",
      hint,
      prdContent: prd,
      designContext: "TOKENS: --color-bg",
    });
    expect(msg).toContain("export function Dashboard()");
    expect(msg).toContain("/dashboard");
    expect(msg).toContain("recent-activity feed");
    expect(msg).not.toContain("## 6. Other");
    expect(msg).toContain("TOKENS: --color-bg");
    expect(msg).toContain("TODO(logic");
    expect(msg).toContain("no captured");
  });

  it("forbids var(--…) / invented tokens and mandates scaffold semantic classes", () => {
    const msg = buildFreegenMessage({
      componentName: "Dashboard",
      hint,
      prdContent: prd,
      designContext: "TOKENS: --color-bg",
    });
    expect(msg.toLowerCase()).toContain("do not use");
    expect(msg).toContain("var(--");
    expect(msg.toLowerCase()).toContain("semantic");
  });
});
