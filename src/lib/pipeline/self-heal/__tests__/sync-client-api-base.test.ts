import { describe, it, expect } from "vitest";
import {
  computeSyncedClientSource,
  extractMountPrefix,
  extractClientBase,
} from "../sync-client-api-base";

const CLIENT = (base: string) =>
  `const API_BASE = import.meta.env.VITE_API_BASE_URL || "${base}";\n`;

const MODULES = (prefix: string) =>
  `import Router from "@koa/router";\nexport function createApiRouter() {\n  const apiRouter = new Router({ prefix: "${prefix}" });\n  return apiRouter;\n}\n`;

describe("extractMountPrefix", () => {
  it("reads the apiRouter prefix and normalises it", () => {
    expect(extractMountPrefix(MODULES("/api/v1"))).toBe("/api/v1");
    expect(extractMountPrefix(MODULES("/api/v1/"))).toBe("/api/v1");
    expect(extractMountPrefix(MODULES("api"))).toBe("/api");
  });
  it("returns null when no Router prefix is present", () => {
    expect(extractMountPrefix("export const x = 1;")).toBeNull();
  });
});

describe("extractClientBase", () => {
  it("reads the || default", () => {
    expect(extractClientBase(CLIENT("/api/v1"))).toBe("/api/v1");
  });
  it("reads the ?? default", () => {
    expect(
      extractClientBase(
        `const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";`,
      ),
    ).toBe("/api");
  });
  it("reads an empty-string default", () => {
    expect(extractClientBase(CLIENT(""))).toBe("");
  });
  it("returns null when the pattern is absent", () => {
    expect(extractClientBase("const x = 1;")).toBeNull();
  });
});

describe("computeSyncedClientSource", () => {
  it("rewrites the base to match the backend mount prefix", () => {
    const res = computeSyncedClientSource(CLIENT("/api"), MODULES("/api/v1"));
    expect(res.changed).toBe(true);
    expect(res.mountPrefix).toBe("/api/v1");
    expect(res.previousBase).toBe("/api");
    expect(extractClientBase(res.source)).toBe("/api/v1");
  });

  it("aligns down too (mount /api, client /api/v1)", () => {
    const res = computeSyncedClientSource(CLIENT("/api/v1"), MODULES("/api"));
    expect(res.changed).toBe(true);
    expect(extractClientBase(res.source)).toBe("/api");
  });

  it("is a no-op when already aligned", () => {
    const res = computeSyncedClientSource(
      CLIENT("/api/v1"),
      MODULES("/api/v1"),
    );
    expect(res.changed).toBe(false);
    expect(res.source).toBe(CLIENT("/api/v1"));
  });

  it("preserves the ?? operator and quote style", () => {
    const src = `const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';`;
    const res = computeSyncedClientSource(src, MODULES("/api/v1"));
    expect(res.changed).toBe(true);
    expect(res.source).toContain("?? '/api/v1'");
  });

  it("no-ops when the mount prefix can't be derived", () => {
    const res = computeSyncedClientSource(
      CLIENT("/api"),
      "export const x = 1;",
    );
    expect(res.changed).toBe(false);
    expect(res.mountPrefix).toBeNull();
  });

  it("no-ops when the client base literal is absent", () => {
    const res = computeSyncedClientSource("const x = 1;", MODULES("/api/v1"));
    expect(res.changed).toBe(false);
    expect(res.previousBase).toBeNull();
  });

  it("only touches the default literal, not a VITE_API_BASE_URL reference", () => {
    const res = computeSyncedClientSource(CLIENT("/api"), MODULES("/api/v1"));
    expect(res.source).toContain("import.meta.env.VITE_API_BASE_URL ||");
  });
});
