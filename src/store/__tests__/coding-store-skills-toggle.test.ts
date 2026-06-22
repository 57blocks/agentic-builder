import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readUseEngineeringSkills,
  writeUseEngineeringSkills,
} from "../coding-store";

describe("useEngineeringSkills persistence helpers", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
  });

  it("defaults to false when nothing stored", () => {
    expect(readUseEngineeringSkills("proj-1")).toBe(false);
  });

  it("round-trips true per project", () => {
    writeUseEngineeringSkills("proj-1", true);
    expect(readUseEngineeringSkills("proj-1")).toBe(true);
    expect(readUseEngineeringSkills("proj-2")).toBe(false);
  });

  it("never throws when projectId is empty", () => {
    expect(() => writeUseEngineeringSkills("", true)).not.toThrow();
    expect(readUseEngineeringSkills("")).toBe(false);
  });
});
