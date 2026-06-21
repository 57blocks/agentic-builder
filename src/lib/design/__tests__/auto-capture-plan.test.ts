import { describe, it, expect } from "vitest";
import { buildAutoCapturePlan, isSameRoutePath } from "../auto-capture-plan";
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";

const pages: PrdPageHint[] = [
  { id: "PAGE-001", name: "FamilyDashboardPage", route: "/family/dashboard" },
  { id: "PAGE-002", name: "AuthPage", route: "/auth" },
  {
    id: "PAGE-003",
    name: "PrivateEnrollmentPage",
    route: "/family/courses/private/:courseId",
    isParamRoute: true,
  },
  { id: "PAGE-004", name: "ActivitiesPage" }, // no route
];

describe("buildAutoCapturePlan", () => {
  it("joins entry origin + static routes, bound to the page id", () => {
    const { plan } = buildAutoCapturePlan("https://demo.app", pages);
    expect(plan).toContainEqual({
      url: "https://demo.app/family/dashboard",
      pageHint: "PAGE-001",
      routeTemplate: "/family/dashboard",
    });
    expect(plan).toContainEqual({
      url: "https://demo.app/auth",
      pageHint: "PAGE-002",
      routeTemplate: "/auth",
    });
  });

  it("ignores the entry URL's own path (origin only)", () => {
    const { plan } = buildAutoCapturePlan("https://demo.app/some/landing", pages);
    expect(plan.every((p) => p.url.startsWith("https://demo.app/"))).toBe(true);
    expect(plan.some((p) => p.url === "https://demo.app/auth")).toBe(true);
  });

  it("skips param routes with no crawled instance, and reports them", () => {
    const { plan, skipped } = buildAutoCapturePlan("https://demo.app", pages);
    expect(plan.some((p) => p.pageHint === "PAGE-003")).toBe(false);
    expect(skipped.some((s) => s.page === "PrivateEnrollmentPage")).toBe(true);
  });

  it("resolves a param route from a matching crawled link", () => {
    const { plan } = buildAutoCapturePlan("https://demo.app", pages, [
      "https://demo.app/family/courses/private/abc123",
      "https://demo.app/unrelated/page",
    ]);
    expect(plan).toContainEqual({
      url: "https://demo.app/family/courses/private/abc123",
      pageHint: "PAGE-003",
      routeTemplate: "/family/courses/private/:courseId",
    });
  });

  it("does NOT resolve a param route from a path with extra segments", () => {
    const { plan } = buildAutoCapturePlan("https://demo.app", pages, [
      "https://demo.app/family/courses/private/abc/extra",
    ]);
    expect(plan.some((p) => p.pageHint === "PAGE-003")).toBe(false);
  });

  it("skips no-route pages", () => {
    const { skipped } = buildAutoCapturePlan("https://demo.app", pages);
    expect(skipped.some((s) => s.page === "ActivitiesPage")).toBe(true);
  });

  it("rejects an invalid entry URL", () => {
    const { plan, skipped } = buildAutoCapturePlan("not-a-url", pages);
    expect(plan).toEqual([]);
    expect(skipped[0].reason).toMatch(/valid http/);
  });

  it("dedupes identical target URLs", () => {
    const dupePages: PrdPageHint[] = [
      { id: "PAGE-001", name: "A", route: "/x" },
      { id: "PAGE-002", name: "B", route: "/x" },
    ];
    const { plan } = buildAutoCapturePlan("https://demo.app", dupePages);
    expect(plan.filter((p) => p.url === "https://demo.app/x").length).toBe(1);
  });
});

describe("isSameRoutePath (role-redirect detection)", () => {
  it("true when the page landed on the requested route", () => {
    expect(
      isSameRoutePath("https://d.app/teacher/dashboard", "https://d.app/teacher/dashboard"),
    ).toBe(true);
  });

  it("ignores query, hash, and trailing slash", () => {
    expect(
      isSameRoutePath("https://d.app/teacher/schedule", "https://d.app/teacher/schedule/?tab=week#x"),
    ).toBe(true);
  });

  it("false when a role guard redirected to login", () => {
    expect(isSameRoutePath("https://d.app/teacher/dashboard", "https://d.app/auth")).toBe(false);
  });

  it("false when redirected to another role's home", () => {
    expect(
      isSameRoutePath("https://d.app/admin/finance", "https://d.app/family/dashboard"),
    ).toBe(false);
  });
});
