/**
 * Unit tests for the INCREMENTAL-mode prompt branch of `TaskBreakdownAgent`.
 *
 * We do NOT make a real LLM call — the agent's `customChatCompletion` is
 * swapped for a capture stub that records the messages it was handed and
 * returns a canned JSON array. This lets us assert exactly what instructions
 * the model receives when `documents.incremental` is present, and that the
 * non-incremental path is left untouched.
 */

import { describe, expect, it } from "vitest";

import { TaskBreakdownAgent } from "../task-breakdown-agent";
import type { ChatMessage } from "@/lib/llm-types";

function installCapture(agent: TaskBreakdownAgent): {
  getUserMessage: () => string;
} {
  let captured: ChatMessage[] = [];
  // The agent stores its config (incl. customChatCompletion) on a protected
  // field; reach in for the test rather than hitting the network.
  (agent as unknown as { config: Record<string, unknown> }).config.customChatCompletion =
    async (messages: ChatMessage[]) => {
      captured = messages;
      return {
        id: "test",
        model: "test-model",
        choices: [{ message: { role: "assistant", content: "[]" } }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      } as never;
    };

  return {
    getUserMessage: () =>
      captured.filter((m) => m.role === "user").map((m) => m.content).join("\n"),
  };
}

const DOCS = { prd: "## PRD\n\nFR-01 do a thing." };

describe("TaskBreakdownAgent incremental mode", () => {
  it("injects incremental instructions, requirement IDs, and existing tasks", async () => {
    const agent = new TaskBreakdownAgent("M");
    const cap = installCapture(agent);

    await agent.generateTaskBreakdown({
      ...DOCS,
      incremental: {
        existingTasks: [
          { id: "T-010", title: "Backend services", coversRequirementIds: ["FR-02"] },
          { id: "T-011", title: "Dashboard page", coversRequirementIds: ["FR-03"] },
        ],
        requirementsToCover: ["FR-04", "FR-05"],
      },
    });

    const msg = cap.getUserMessage();
    expect(msg).toContain("INCREMENTAL MODE");
    // Only generate for the new IDs.
    expect(msg).toContain("FR-04");
    expect(msg).toContain("FR-05");
    // Existing tasks listed as already done.
    expect(msg).toContain("T-010");
    expect(msg).toContain("Dashboard page");
    // Continues ID convention: existing go up to T-011 → start at T-012.
    expect(msg).toContain("T-012");
    // Schema is unchanged — still a JSON array.
    expect(msg).toContain("array of task objects");
  });

  it("does NOT inject incremental instructions on the full-breakdown path", async () => {
    const agent = new TaskBreakdownAgent("M");
    const cap = installCapture(agent);

    await agent.generateTaskBreakdown({ ...DOCS });

    const msg = cap.getUserMessage();
    expect(msg).not.toContain("INCREMENTAL MODE");
    expect(msg).not.toContain("already done");
  });

  it("treats an empty requirementsToCover as the full-breakdown path", async () => {
    const agent = new TaskBreakdownAgent("M");
    const cap = installCapture(agent);

    await agent.generateTaskBreakdown({
      ...DOCS,
      incremental: { existingTasks: [], requirementsToCover: [] },
    });

    const msg = cap.getUserMessage();
    expect(msg).not.toContain("INCREMENTAL MODE");
  });
});
