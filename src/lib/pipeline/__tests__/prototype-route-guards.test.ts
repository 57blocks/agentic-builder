import { describe, it, expect } from "vitest";
import { isSafeProjectId } from "../prototype-route-guards";

describe("isSafeProjectId", () => {
  it("accepts undefined (shared/default manifest)", () => {
    expect(isSafeProjectId(undefined)).toBe(true);
  });
  it("accepts a normal slug", () => {
    expect(isSafeProjectId("my-project-123")).toBe(true);
  });
  it("rejects parent-dir traversal", () => {
    expect(isSafeProjectId("../../etc")).toBe(false);
  });
  it("rejects absolute paths", () => {
    expect(isSafeProjectId("/etc/passwd")).toBe(false);
  });
  it("rejects path separators", () => {
    expect(isSafeProjectId("a/b")).toBe(false);
    expect(isSafeProjectId("a\\b")).toBe(false);
  });
});
