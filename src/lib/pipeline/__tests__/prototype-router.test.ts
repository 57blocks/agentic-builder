// src/lib/pipeline/__tests__/prototype-router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  toViewComponentName,
  renderPrototypeRouter,
  writePrototypeRouter,
} from "../prototype-router";

describe("toViewComponentName", () => {
  it("PascalCases a multi-word page name", () => {
    expect(toViewComponentName("Family Dashboard")).toBe("FamilyDashboard");
  });
  it("strips punctuation and route slashes", () => {
    expect(toViewComponentName("login / sign-in")).toBe("LoginSignIn");
  });
  it("prefixes when the name starts with a digit", () => {
    expect(toViewComponentName("404 page")).toBe("Page404Page");
  });
  it("falls back to Page for an empty name", () => {
    expect(toViewComponentName("")).toBe("Page");
  });

  it("strips a fullwidth-parenthesised route note (PRD headings keep it)", () => {
    expect(toViewComponentName("AuthPage（`/auth`）")).toBe("AuthPage");
    expect(toViewComponentName("FamilyDashboardPage（`/family/dashboard`）")).toBe(
      "FamilyDashboardPage",
    );
  });

  it("strips an ascii-parenthesised note too", () => {
    expect(toViewComponentName("Settings (profile)")).toBe("Settings");
  });
});

describe("renderPrototypeRouter", () => {
  it("imports each view, registers each route, redirects / to the first page, keeps NotFound", () => {
    const out = renderPrototypeRouter([{ componentName: "Dashboard", route: "/dashboard" }]);
    expect(out).toContain(`import { Dashboard } from "./views/Dashboard";`);
    expect(out).toContain(`<Route path="/dashboard" element={<Dashboard />} />`);
    expect(out).toContain(`<Route path="/" element={<Navigate to="/dashboard" replace />} />`);
    expect(out).toContain(`<Route path="*" element={<NotFound />} />`);
    expect(out).toContain(`import { Routes, Route, Navigate } from "react-router-dom";`);
  });

  it("does NOT add a redirect when a page already owns the / route", () => {
    const out = renderPrototypeRouter([{ componentName: "Home", route: "/" }]);
    expect(out).not.toContain("Navigate");
    expect(out).toContain(`<Route path="/" element={<Home />} />`);
  });

  it("redirects / to the most root-level STATIC route, never a param route, regardless of order", () => {
    // completion order puts a param route first; index must still land on /en (Home)
    const out = renderPrototypeRouter([
      { componentName: "CourseDetail", route: "/en/programs/{program}/{courseId}" },
      { componentName: "CourseList", route: "/en/programs/{program}" },
      { componentName: "Home", route: "/en" },
      { componentName: "AboutUs", route: "/en/about-us" },
    ]);
    expect(out).toContain(`<Route path="/" element={<Navigate to="/en" replace />} />`);
    expect(out).not.toContain(`Navigate to="/en/programs`); // never a param route
  });

  it("prefers a shallower static route over a deeper one", () => {
    const out = renderPrototypeRouter([
      { componentName: "Deep", route: "/a/b/c" },
      { componentName: "Shallow", route: "/dashboard" },
    ]);
    expect(out).toContain(`Navigate to="/dashboard" replace`);
  });

  it("falls back to a param route only when every route is parameterised", () => {
    const out = renderPrototypeRouter([
      { componentName: "Item", route: "/items/:id" },
    ]);
    expect(out).toContain(`Navigate to="/items/:id" replace`);
  });
});

describe("writePrototypeRouter", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "proto-router-"));
    await fs.mkdir(path.join(dir, "src"), { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });
  it("writes src/router.tsx", async () => {
    await writePrototypeRouter(dir, [{ componentName: "Dashboard", route: "/dashboard" }]);
    const written = await fs.readFile(path.join(dir, "src", "router.tsx"), "utf-8");
    expect(written).toContain("AppRouter");
    expect(written).toContain(`import { Dashboard } from "./views/Dashboard";`);
  });
});
