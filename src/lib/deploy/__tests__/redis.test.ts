import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizeRedisName,
  allocatePort,
  generateRedisPassword,
  provisionAppRedis,
} from "../redis";

describe("sanitizeRedisName", () => {
  it("lowercases and replaces invalid chars", () => {
    expect(sanitizeRedisName("My Cool App!")).toBe("my-cool-app");
  });
  it("strips leading/trailing dashes", () => {
    expect(sanitizeRedisName("---foo---")).toBe("foo");
  });
  it("falls back to app- prefix for empty input", () => {
    expect(sanitizeRedisName("!!!").startsWith("app-")).toBe(true);
  });
  it("clips to 40 chars", () => {
    expect(sanitizeRedisName("a".repeat(100)).length).toBeLessThanOrEqual(40);
  });
});

describe("allocatePort", () => {
  it("default range is 5800-5999", () => {
    for (const name of ["alpha", "beta", "gamma", "delta-app"]) {
      const p = allocatePort(name);
      expect(p).toBeGreaterThanOrEqual(5800);
      expect(p).toBeLessThan(6000);
    }
  });
  it("respects custom base/span", () => {
    const p = allocatePort("alpha", 16000, 1000);
    expect(p).toBeGreaterThanOrEqual(16000);
    expect(p).toBeLessThan(17000);
  });
  it("is deterministic for the same input", () => {
    expect(allocatePort("foo")).toBe(allocatePort("foo"));
  });
  it("attempt shifts to next port", () => {
    const p0 = allocatePort("foo", 5800, 200, 0);
    const p1 = allocatePort("foo", 5800, 200, 1);
    expect(p1 - p0 === 1 || p1 - p0 === -199).toBe(true);
  });
});

describe("generateRedisPassword", () => {
  it("is url-safe and long enough", () => {
    const pw = generateRedisPassword();
    expect(pw.length).toBeGreaterThan(20);
    expect(pw).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("provisionAppRedis", () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it("posts to redis.create + redis.deploy, then GETs redis.one and builds URLs", async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: (init?.method as string) ?? "GET",
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      if (url.endsWith("/api/redis.create")) {
        return new Response(
          JSON.stringify({ redisId: "rid-1", appName: "my-app" }),
          { status: 200 },
        );
      }
      if (url.endsWith("/api/redis.deploy")) {
        return new Response("{}", { status: 200 });
      }
      if (url.endsWith("/api/redis.saveExternalPort")) {
        return new Response("{}", { status: 200 });
      }
      if (url.includes("/api/redis.one")) {
        return new Response(
          JSON.stringify({
            redisId: "rid-1",
            appName: "my-app",
            name: "my-app",
            externalPort: 16777,
            password: "secret!@#",
            applicationStatus: "done",
          }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof fetch;

    const r = await provisionAppRedis({
      baseUrl: "https://dokploy.example.com",
      token: "tok",
      appName: "My App!",
      projectId: "proj",
      environmentId: "env",
      publicHost: "dokploy.example.com",
    });

    expect(r.redisId).toBe("rid-1");
    expect(r.appName).toBe("my-app");
    expect(r.externalPort).toBe(16777);
    expect(r.publicUrl).toBe(
      `redis://default:${encodeURIComponent("secret!@#")}@dokploy.example.com:16777`,
    );
    expect(r.internalUrl).toBe(
      `redis://default:${encodeURIComponent("secret!@#")}@my-app:6379`,
    );

    const createCall = calls.find((c) => c.url.endsWith("/api/redis.create"));
    expect(createCall?.method).toBe("POST");
    expect((createCall?.body as Record<string, unknown>).dockerImage).toBe(
      "redis:7-alpine",
    );
    expect(
      (createCall?.body as Record<string, unknown>).command as string,
    ).toMatch(/maxmemory 128mb/);
  });

  it("retries saveExternalPort with next port on collision", async () => {
    let saveAttempts = 0;
    const portsAttempted: number[] = [];
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/redis.create")) {
        return new Response(
          JSON.stringify({ redisId: "rid-2", appName: "app2" }),
          { status: 200 },
        );
      }
      if (url.endsWith("/api/redis.saveExternalPort")) {
        saveAttempts++;
        const body = JSON.parse(init!.body as string);
        portsAttempted.push(body.externalPort);
        if (saveAttempts < 3) {
          return new Response("port in use", { status: 400 });
        }
        return new Response("{}", { status: 200 });
      }
      if (url.endsWith("/api/redis.deploy"))
        return new Response("{}", { status: 200 });
      if (url.includes("/api/redis.one")) {
        return new Response(
          JSON.stringify({
            redisId: "rid-2",
            appName: "app2",
            name: "app2",
            externalPort: portsAttempted[portsAttempted.length - 1],
            password: "pw",
            applicationStatus: "done",
          }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;

    const r = await provisionAppRedis({
      baseUrl: "https://x",
      token: "tok",
      appName: "retry-test",
      projectId: "p",
      environmentId: "e",
      publicHost: "x",
    });
    expect(saveAttempts).toBe(3);
    expect(portsAttempted[1] - portsAttempted[0]).toBe(1);
    expect(portsAttempted[2] - portsAttempted[1]).toBe(1);
    expect(r.externalPort).toBe(portsAttempted[2]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
});
