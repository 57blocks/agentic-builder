/**
 * normalizeGlobalTaskIds: global-unique re-numbering + dep re-link + foundation dedup.
 */
import { describe, it, expect } from "vitest";
import { normalizeGlobalTaskIds } from "../domain-breakdown";
import type { KickoffWorkItem } from "../../types";

function t(
  id: string,
  title: string,
  phase: string,
  opts: { deps?: string[]; subsystem?: string } = {},
): KickoffWorkItem {
  return {
    id,
    phase,
    title,
    dependencies: opts.deps ?? [],
    ...(opts.subsystem ? { subsystem: opts.subsystem } : {}),
  } as unknown as KickoffWorkItem;
}

describe("normalizeGlobalTaskIds", () => {
  const foundation = [
    t("T-001", "Scaffold", "Scaffolding"),
    t("T-002", "Global data layer", "Data Layer", { deps: ["T-001"] }),
  ];
  const byDomain = new Map<string, KickoffWorkItem[]>([
    [
      "auth",
      [
        t("T-001", "Implement frontend foundation", "Frontend", { subsystem: "auth" }), // dupe → stripped
        t("T-002", "Login form", "Frontend", { deps: ["T-001"], subsystem: "auth" }), // dep on stripped dupe → dropped
        t("T-003", "Auth service", "Backend", { deps: ["T-002"], subsystem: "auth" }), // in-scope dep → relinked
      ],
    ],
    [
      "billing",
      [t("T-001", "Billing model", "Backend", { deps: ["T-999"], subsystem: "billing" })], // dangling → dropped
    ],
  ]);
  const buildLayers = [["auth"], ["billing"]];

  const r = normalizeGlobalTaskIds(foundation, byDomain, buildLayers);

  it("assigns globally-unique sequential ids, foundation first", () => {
    const ids = r.allTasks.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length); // unique
    expect(ids[0]).toBe("T-001"); // foundation first
    expect(ids).toEqual(["T-001", "T-002", "T-003", "T-004", "T-005"]);
  });

  it("strips the per-domain foundation duplicate", () => {
    const authTitles = (r.byDomain.get("auth") ?? []).map((x) => x.title);
    expect(authTitles).not.toContain("Implement frontend foundation");
    expect(authTitles).toEqual(["Login form", "Auth service"]); // dupe gone, order kept
  });

  it("re-links in-scope deps and drops unresolved (cross-scope / dangling / stripped)", () => {
    const ids = new Set(r.allTasks.map((x) => x.id));
    for (const x of r.allTasks) {
      for (const d of x.dependencies ?? []) expect(ids.has(d)).toBe(true); // no dangling
    }
    // foundation: data layer dep on scaffold relinked to scaffold's new id
    const scaffold = r.foundationTasks.find((x) => x.title === "Scaffold")!;
    const dataLayer = r.foundationTasks.find((x) => x.title === "Global data layer")!;
    expect(dataLayer.dependencies).toEqual([scaffold.id]);
    // auth: "Login form" dep was on the stripped foundation dupe → dropped
    const login = (r.byDomain.get("auth") ?? []).find((x) => x.title === "Login form")!;
    expect(login.dependencies).toEqual([]);
    // auth: "Auth service" dep on "Login form" → relinked to Login's new id
    const authSvc = (r.byDomain.get("auth") ?? []).find((x) => x.title === "Auth service")!;
    expect(authSvc.dependencies).toEqual([login.id]);
    // billing: dangling T-999 dropped
    const billing = (r.byDomain.get("billing") ?? [])[0];
    expect(billing.dependencies).toEqual([]);
  });
});
