/**
 * Verifies that `generateSupplementaryTasks` (used by the coverage-gate
 * self-heal loop) forwards `prototypeContext` into the prompt, the same way
 * `generateTaskBreakdown` already does. Without this, self-heal-generated
 * tasks are blind to prototype pages and re-create components that are
 * already inlined in the page markup.
 */

import { describe, expect, it } from "vitest";

import { TaskBreakdownAgent } from "../task-breakdown-agent";
import type { ChatMessage } from "@/lib/llm-types";

function installCapture(agent: TaskBreakdownAgent): {
  getUserMessage: () => string;
} {
  let captured: ChatMessage[] = [];
  (agent as unknown as { config: Record<string, unknown> }).config.customChatCompletion =
    async (messages: ChatMessage[]) => {
      captured = messages;
      return {
        id: "test",
        model: "test-model",
        choices: [{ message: { role: "assistant", content: "[]" } }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      } as never;
    };
  return {
    getUserMessage: () =>
      captured.filter((m) => m.role === "user").map((m) => m.content).join("\n"),
  };
}

const BASE_PARAMS = {
  missingIds: ["CMP-001"],
  existingTaskSummary: [],
  startingTaskId: "T-050",
  prd: "## PRD\n\nFR-01 do a thing.",
};

describe("TaskBreakdownAgent.generateSupplementaryTasks — prototypeContext", () => {
  it("injects prototypeContext into the prompt when provided", async () => {
    const agent = new TaskBreakdownAgent("M");
    const cap = installCapture(agent);

    await agent.generateSupplementaryTasks({
      ...BASE_PARAMS,
      prototypeContext:
        "## PROTOTYPE ALREADY EXISTS\nCMP-001 already implemented in frontend/src/views/Home.tsx",
    });

    const msg = cap.getUserMessage();
    expect(msg).toContain("PROTOTYPE ALREADY EXISTS");
    expect(msg).toContain("CMP-001 already implemented");
  });

  it("does not inject anything when prototypeContext is omitted (legacy behaviour unchanged)", async () => {
    const agent = new TaskBreakdownAgent("M");
    const cap = installCapture(agent);

    await agent.generateSupplementaryTasks({ ...BASE_PARAMS });

    const msg = cap.getUserMessage();
    expect(msg).not.toContain("PROTOTYPE ALREADY EXISTS");
  });
});
