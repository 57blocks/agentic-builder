import { describe, expect, it } from "vitest";

import {
  requestHumanDecision,
  resolveHumanDecision,
  getPendingDecision,
  type HumanDecisionOption,
} from "../index";

const OPTS: HumanDecisionOption[] = [
  { id: "fix_test", label: "Fix test", description: "…", requiresDirective: true },
  { id: "abort", label: "Abort", description: "…" },
];

describe("human-decision primitive (directive channel)", () => {
  it("carries the human's directive back to the waiting promise", async () => {
    const p = requestHumanDecision("s1", OPTS, "ctx");
    expect(getPendingDecision("s1")?.options).toHaveLength(2);
    expect(resolveHumanDecision("s1", "fix_test", "  the test is wrong  ")).toBe(
      true,
    );
    await expect(p).resolves.toEqual({
      optionId: "fix_test",
      directive: "the test is wrong",
    });
  });

  it("treats an empty/whitespace directive as undefined", async () => {
    const p = requestHumanDecision("s2", OPTS, "ctx");
    resolveHumanDecision("s2", "abort", "   ");
    await expect(p).resolves.toEqual({ optionId: "abort", directive: undefined });
  });

  it("auto-resolves to { optionId: 'timeout' } when no one responds", async () => {
    const p = requestHumanDecision("s3", OPTS, "ctx", 10); // 10ms timeout
    await expect(p).resolves.toEqual({ optionId: "timeout" });
  });

  it("returns false when resolving a session with nothing pending", () => {
    expect(resolveHumanDecision("does-not-exist", "fix_test")).toBe(false);
  });
});
