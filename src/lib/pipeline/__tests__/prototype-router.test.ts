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
  });
});
