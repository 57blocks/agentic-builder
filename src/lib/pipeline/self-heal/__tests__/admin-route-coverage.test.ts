/**
 * Unit tests for admin-route-coverage.ts — verifies the text-based
 * detector correctly identifies frontend `/admin/*` calls that lack a
 * matching backend route, handles dynamic segments on both sides,
 * respects HTTP method, ignores non-admin paths, and honors the
 * `// admin-route-coverage-ignore` pragma.
 */

import { describe, expect, it } from "vitest";
import {
  checkAdminRouteCoverage,
  normaliseAdminPath,
  type AdminRouteCoverageFile,
} from "../admin-route-coverage";

function file(p: string, content: string): AdminRouteCoverageFile {
  return { path: p, content };
}

describe("normaliseAdminPath", () => {
  it("collapses template-literal interpolations to :param", () => {
    expect(normaliseAdminPath("/admin/users/${userId}")).toBe(
      "/admin/users/:param",
    );
  });

  it("collapses koa router params to :param", () => {
    expect(normaliseAdminPath("/admin/users/:id")).toBe("/admin/users/:param");
  });

  it("strips trailing slash and query string", () => {
    expect(normaliseAdminPath("/admin/users/?role=admin")).toBe(
      "/admin/users",
    );
  });

  it("preserves multi-segment paths exactly", () => {
    expect(normaliseAdminPath("/admin/audit/v2/logs")).toBe(
      "/admin/audit/v2/logs",
    );
  });

  it("treats template + literal mix correctly", () => {
    expect(normaliseAdminPath("/admin/orgs/${orgId}/users/:userId")).toBe(
      "/admin/orgs/:param/users/:param",
    );
  });
});

describe("checkAdminRouteCoverage — happy paths", () => {
  it("returns empty findings when every frontend call has a matching backend route", () => {
    const front = file(
      "frontend/src/api/admin.ts",
      `
        import { apiClient } from "./client";
        export const listUsers = () => apiClient.get("/admin/users");
        export const getUser = (id: string) =>
          apiClient.get(\`/admin/users/\${id}\`);
        export const deleteUser = (id: string) =>
          apiClient.delete<{ ok: true }>(\`/admin/users/\${id}\`);
      `,
    );
    const back = file(
      "backend/src/api/modules/admin-aliases/admin-aliases.routes.ts",
      `
        import Router from "@koa/router";
        export function registerAdminAliasesRoutes(router: Router) {
          router.get("/admin/users", listUsers);
          router.get("/admin/users/:id", getUser);
          router.delete("/admin/users/:id", deleteUser);
        }
      `,
    );

    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [back],
    });

    expect(r.findings).toEqual([]);
    expect(r.totalAdminCalls).toBe(3);
    expect(r.totalAdminRoutes).toBe(3);
  });

  it("ignores non-admin paths entirely", () => {
    const front = file(
      "frontend/src/api/users.ts",
      `apiClient.get("/v1/users"); apiClient.post("/v1/auth/login", {});`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [],
    });
    expect(r.findings).toEqual([]);
    expect(r.totalAdminCalls).toBe(0);
  });

  it("handles zero files gracefully", () => {
    const r = checkAdminRouteCoverage({ frontendFiles: [], backendFiles: [] });
    expect(r.findings).toEqual([]);
    expect(r.frontendFilesScanned).toBe(0);
    expect(r.backendFilesScanned).toBe(0);
  });
});

describe("checkAdminRouteCoverage — missing-route detection", () => {
  it("emits a finding for an unmatched literal path", () => {
    const front = file(
      "frontend/src/api/admin.ts",
      `apiClient.get("/admin/audit");`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [],
    });
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].method).toBe("GET");
    expect(r.findings[0].url).toBe("/admin/audit");
    expect(r.findings[0].normalisedPath).toBe("/admin/audit");
    expect(r.findings[0].filePath).toBe("frontend/src/api/admin.ts");
    expect(r.findings[0].line).toBe(1);
    expect(r.findings[0].message).toMatch(/admin-aliases\.routes\.ts/);
  });

  it("emits a finding when the HTTP method does not match", () => {
    const front = file("frontend/src/api/admin.ts", `apiClient.delete("/admin/users");`);
    const back = file(
      "backend/src/api/modules/admin-aliases/admin-aliases.routes.ts",
      `router.get("/admin/users", h);`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [back],
    });
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].method).toBe("DELETE");
  });

  it("matches template-literal frontend paths against :param backend routes", () => {
    const front = file(
      "frontend/src/api/admin.ts",
      `apiClient.put(\`/admin/orgs/\${orgId}/seats\`, body);`,
    );
    const back = file(
      "backend/src/api/modules/admin-aliases/admin-aliases.routes.ts",
      `router.put("/admin/orgs/:orgId/seats", h);`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [back],
    });
    expect(r.findings).toEqual([]);
  });

  it("does NOT match a partial path prefix (avoid false negatives)", () => {
    const front = file("frontend/src/api/admin.ts", `apiClient.get("/admin/users/me");`);
    const back = file("backend/.../routes.ts", `router.get("/admin/users", h);`);
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [back],
    });
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].normalisedPath).toBe("/admin/users/me");
  });

  it("honors the // admin-route-coverage-ignore pragma", () => {
    const front = file(
      "frontend/src/api/admin.ts",
      `apiClient.get("/admin/legacy"); // admin-route-coverage-ignore`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [],
    });
    expect(r.findings).toEqual([]);
  });

  it("counts admin calls (totalAdminCalls) even when pragma-suppressed", () => {
    const front = file(
      "frontend/src/api/admin.ts",
      `apiClient.get("/admin/legacy"); // admin-route-coverage-ignore
       apiClient.post("/admin/active");`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [],
    });
    // Both calls are counted; only the un-pragma'd one produces a finding.
    expect(r.totalAdminCalls).toBe(2);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].normalisedPath).toBe("/admin/active");
  });
});

describe("checkAdminRouteCoverage — call-site syntax variations", () => {
  it("matches `apiClient.raw.<method>` escape-hatch calls", () => {
    const front = file(
      "frontend/src/api/admin.ts",
      `apiClient.raw.get("/admin/health");`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [],
    });
    expect(r.totalAdminCalls).toBe(1);
    expect(r.findings).toHaveLength(1);
  });

  it("matches `apiClient.get<Type>(...)` with a generic", () => {
    const front = file(
      "frontend/src/api/admin.ts",
      `apiClient.get<{ id: string }[]>("/admin/users");`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [],
    });
    expect(r.totalAdminCalls).toBe(1);
  });

  it("accepts apiRouter / adminRouter aliases on the backend side", () => {
    const front = file("frontend/src/api/admin.ts", `apiClient.get("/admin/x");`);
    const back = file(
      "backend/src/api/modules/admin-aliases/admin-aliases.routes.ts",
      `adminRouter.get("/admin/x", h);`,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [back],
    });
    expect(r.findings).toEqual([]);
    expect(r.totalAdminRoutes).toBe(1);
  });
});

describe("checkAdminRouteCoverage — dedup-friendly output", () => {
  it("produces one finding per (method, normalisedPath, callsite) — repair adapter dedups by (method, normalisedPath)", () => {
    const front = file(
      "frontend/src/api/admin.ts",
      `
        apiClient.get("/admin/users");
        apiClient.get("/admin/users");
        apiClient.get(\`/admin/users/\${id}\`);
      `,
    );
    const r = checkAdminRouteCoverage({
      frontendFiles: [front],
      backendFiles: [],
    });
    // detector emits one per call site
    expect(r.findings).toHaveLength(3);
    // but two of them share `(GET, /admin/users)` so the repair layer
    // will collapse them to one task.
    const uniqueKeys = new Set(
      r.findings.map((f) => `${f.method} ${f.normalisedPath}`),
    );
    expect(uniqueKeys.size).toBe(2);
  });
});
