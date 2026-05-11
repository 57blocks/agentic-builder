import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ rows: [] }),
  end: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("pg", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Client: vi.fn(function () { return mockClient; } as any),
}));

import { createAppDatabase, sanitizeDbName } from "../database";

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.connect.mockResolvedValue(undefined);
  mockClient.query.mockResolvedValue({ rows: [] });
  mockClient.end.mockResolvedValue(undefined);
});

describe("sanitizeDbName", () => {
  it("lowercases and replaces non-alphanumeric with underscore", () => {
    expect(sanitizeDbName("My Cool App!")).toBe("my_cool_app_");
  });

  it("truncates to 63 chars (PostgreSQL identifier limit)", () => {
    expect(sanitizeDbName("a".repeat(100))).toHaveLength(63);
  });

  it("prepends 'app_' if starts with a digit", () => {
    expect(sanitizeDbName("123abc")).toBe("app_123abc");
  });
});

describe("createAppDatabase", () => {
  it("connects, runs CREATE DATABASE, and returns connection string", async () => {
    const result = await createAppDatabase({
      connectionString: "postgresql://user:pass@host:5432/postgres",
      appName: "my-app",
    });

    expect(mockClient.connect).toHaveBeenCalledOnce();
    expect(mockClient.query).toHaveBeenCalledWith('CREATE DATABASE "my_app"');
    expect(mockClient.end).toHaveBeenCalledOnce();
    expect(result).toBe("postgresql://user:pass@host:5432/my_app");
  });

  it("does not throw if database already exists (duplicate_database error)", async () => {
    mockClient.query.mockRejectedValueOnce(
      Object.assign(new Error("already exists"), { code: "42P04" })
    );

    await expect(
      createAppDatabase({
        connectionString: "postgresql://user:pass@host:5432/postgres",
        appName: "my-app",
      })
    ).resolves.toBe("postgresql://user:pass@host:5432/my_app");
  });
});
