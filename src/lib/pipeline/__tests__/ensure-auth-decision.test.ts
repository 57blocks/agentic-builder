import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { ensureAuthDecisionAfterPrd } from "../ensure-auth-decision";
import { authDecisionFileAbs, writeAuthDecision } from "../auth-decision-io";
import {
  type AuthDecision,
  buildDefaultAuthDecision,
} from "@/lib/agents/architect/auth-decision-types";

const decideMock = vi.fn();

vi.mock("@/lib/agents/architect/auth-decider-agent", () => {
  class FakeAgent {
    decide = decideMock;
  }
  return { AuthDeciderAgent: FakeAgent };
});

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ensure-auth-decision-"));
  decideMock.mockReset();
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined);
});

function fakeDecision(overrides: Partial<AuthDecision> = {}): AuthDecision {
  return {
    ...buildDefaultAuthDecision("fake decision for test"),
    ...overrides,
  };
}

describe("ensureAuthDecisionAfterPrd", () => {
  it("respects an existing user-overridden decision and does not call the decider", async () => {
    const override = fakeDecision({
      mode: "magic-link",
      scaffold: "auth-magic-link",
      userOverridden: true,
    });
    await writeAuthDecision(tmpRoot, override);

    const result = await ensureAuthDecisionAfterPrd({
      projectRoot: tmpRoot,
      prdContent: "PRD body that strongly suggests password-rbac",
    });

    expect(result.source).toBe("existing-user-override");
    expect(result.decision.mode).toBe("magic-link");
    expect(decideMock).not.toHaveBeenCalled();
  });

  it("writes a decider-produced decision when no file exists", async () => {
    const llmDecision = fakeDecision({
      mode: "magic-link",
      scaffold: "auth-magic-link",
    });
    decideMock.mockResolvedValue({
      decision: llmDecision,
      raw: "{}",
      source: "llm",
      model: "test",
      costUsd: 0,
      durationMs: 0,
    });

    const result = await ensureAuthDecisionAfterPrd({
      projectRoot: tmpRoot,
      prdContent: "PRD body mentioning magic link.",
    });

    expect(result.source).toBe("decider-llm");
    expect(result.decision.mode).toBe("magic-link");

    const onDisk = JSON.parse(
      await fs.readFile(authDecisionFileAbs(tmpRoot), "utf-8"),
    );
    expect(onDisk.mode).toBe("magic-link");
  });

  it("falls back to password-rbac when the decider throws", async () => {
    decideMock.mockRejectedValue(new Error("LLM offline"));

    const result = await ensureAuthDecisionAfterPrd({
      projectRoot: tmpRoot,
      prdContent: "PRD body.",
    });

    expect(result.source).toBe("decider-default-on-error");
    expect(result.decision.mode).toBe("password-rbac");
    expect(result.error).toContain("LLM offline");
  });

  it("falls back when PRD content is empty without calling the decider", async () => {
    const result = await ensureAuthDecisionAfterPrd({
      projectRoot: tmpRoot,
      prdContent: "   ",
    });

    expect(result.source).toBe("decider-default-on-error");
    expect(result.decision.mode).toBe("password-rbac");
    expect(decideMock).not.toHaveBeenCalled();
  });

  it("overwrites a non-overridden default with the latest decider output", async () => {
    await writeAuthDecision(
      tmpRoot,
      fakeDecision({ mode: "password-rbac", userOverridden: false }),
    );

    const llmDecision = fakeDecision({
      mode: "privy",
      scaffold: "auth-privy",
      userOverridden: false,
    });
    decideMock.mockResolvedValue({
      decision: llmDecision,
      raw: "{}",
      source: "llm",
      model: "test",
      costUsd: 0,
      durationMs: 0,
    });

    const result = await ensureAuthDecisionAfterPrd({
      projectRoot: tmpRoot,
      prdContent: "PRD that names Privy.",
    });

    expect(result.source).toBe("decider-llm");
    expect(result.decision.mode).toBe("privy");
    expect(decideMock).toHaveBeenCalledTimes(1);
  });

  it("reports decider-heuristic when the agent indicates it fell back to keywords", async () => {
    decideMock.mockResolvedValue({
      decision: fakeDecision({ mode: "password-rbac" }),
      raw: "",
      source: "heuristic",
      model: "test",
      costUsd: 0,
      durationMs: 0,
      parseError: "no LLM output",
    });

    const result = await ensureAuthDecisionAfterPrd({
      projectRoot: tmpRoot,
      prdContent: "PRD body.",
    });

    expect(result.source).toBe("decider-heuristic");
  });
});
