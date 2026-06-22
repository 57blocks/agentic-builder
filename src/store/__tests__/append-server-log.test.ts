import { describe, it, expect } from "vitest";
import { appendServerLog, type ServerLogEntry } from "../coding-store";

const mk = (i: number): ServerLogEntry => ({
  level: "log",
  message: `line ${i}`,
  timestamp: `2026-06-22T00:00:${String(i).padStart(2, "0")}.000Z`,
});

describe("appendServerLog", () => {
  it("appends entries in order", () => {
    const out = appendServerLog([mk(1)], mk(2), 10);
    expect(out.map((e) => e.message)).toEqual(["line 1", "line 2"]);
  });

  it("drops oldest entries beyond the cap", () => {
    let logs: ServerLogEntry[] = [];
    for (let i = 0; i < 5; i++) logs = appendServerLog(logs, mk(i), 3);
    expect(logs).toHaveLength(3);
    expect(logs.map((e) => e.message)).toEqual(["line 2", "line 3", "line 4"]);
  });
});
