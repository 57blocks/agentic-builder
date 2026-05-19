import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizePostgresName,
  sanitizePostgresDatabaseName,
  allocatePostgresPort,
  generatePostgresPassword,
  provisionAppPostgres,
} from "../postgres";

describe("sanitizePostgresName", () => {
  it("lowercases and replaces invalid chars", () => {
    expect(sanitizePostgresName("My App!")).toBe("my-app");
  });
});

describe("sanitizePostgresDatabaseName", () => {
  it("uses underscores (postgres-friendly)", () => {
    expect(sanitizePostgresDatabaseName("My App!")).toBe("my_app");
  });
  it("prepends app_ when starting with a digit", () => {
    expect(sanitizePostgresDatabaseName("123app").startsWith("app_")).toBe(true);
  });
});

describe("allocatePostgresPort", () => {
  it("default range is 5600-5799", () => {
    const p = allocatePostgresPort("anything");
    expect(p).toBeGreaterThanOrEqual(5600);
    expect(p).toBeLessThan(5800);
  });
  it("attempt shifts by 1", () => {
    const p0 = allocatePostgresPort("foo", 5600, 200, 0);
    const p1 = allocatePostgresPort("foo", 5600, 200, 1);
    expect(p1 - p0 === 1 || p1 - p0 === -199).toBe(true);
  });
});

describe("generatePostgresPassword", () => {
  it("is url-safe", () => {
    expect(generatePostgresPassword()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("provisionAppPostgres", () => {
  const originalFetch = global.fetch;
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("posts to postgres.create + deploy, GETs postgres.one, builds URLs", async () => {
    const calls: { url: string }[] = [];
    global.fetch = vi.fn(async (url: string) => {
      calls.push({ url });
      if (url.endsWith("/api/postgres.create")) {
        return new Response(
          JSON.stringify({ postgresId: "pid-1", appName: "my-app" }),
          { status: 200 },
        );
      }
      if (url.endsWith("/api/postgres.deploy"))
        return new Response("{}", { status: 200 });
      if (url.endsWith("/api/postgres.saveExternalPort"))
        return new Response("{}", { status: 200 });
      if (url.includes("/api/postgres.one")) {
        return new Response(
          JSON.stringify({
            postgresId: "pid-1",
            appName: "my-app",
            name: "my-app",
            externalPort: 15500,
            databaseName: "my_app",
            databaseUser: "app",
            databasePassword: "secret",
            applicationStatus: "done",
          }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;

    const r = await provisionAppPostgres({
      baseUrl: "https://dokploy.example.com",
      token: "tok",
      appName: "My App!",
      projectId: "proj",
      environmentId: "env",
      publicHost: "dokploy.example.com",
    });

    expect(r.postgresId).toBe("pid-1");
    expect(r.externalPort).toBe(15500);
    expect(r.publicUrl).toBe(
      "postgresql://app:secret@dokploy.example.com:15500/my_app",
    );
    expect(r.internalUrl).toBe("postgresql://app:secret@my-app:5432/my_app");
    expect(
      calls.some((c) => c.url.endsWith("/api/postgres.create")),
    ).toBe(true);
  });
});
