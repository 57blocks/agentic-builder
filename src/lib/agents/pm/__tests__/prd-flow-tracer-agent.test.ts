import { describe, expect, it } from "vitest";

import {
  generateFlowTrace,
  parseFlowTraceResponse,
  PRD_FLOW_TRACER_PROMPT_VERSION,
} from "../prd-flow-tracer-agent";
import type { OpenRouterResponse } from "@/lib/llm-types";

function fakeResponse(content: string): OpenRouterResponse {
  return {
    model: "claude-sonnet-4",
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  } as unknown as OpenRouterResponse;
}

const GOOD_JSON = JSON.stringify({
  flows: [
    {
      name: "user places an order",
      trigger: "clicks Checkout",
      steps: ["add to cart", "enter address", "pay"],
      terminal: "order confirmed",
      complete: false,
    },
    {
      name: "user resets password",
      trigger: "clicks Forgot password",
      steps: ["request link", "open link", "set new password"],
      terminal: "logged in",
      complete: true,
    },
  ],
  findings: [
    {
      flow: "user places an order",
      step: "pay",
      missing: "page",
      severity: "blocker",
      section: "Checkout",
      problem: "No payment screen or failure path is described.",
      downstreamImpact: "codegen builds an order form that can't actually charge.",
      suggestedFix: "Add a payment page with success and declined states.",
    },
    { flow: "x", step: "y", problem: "   " }, // dropped (empty problem)
  ],
});

describe("parseFlowTraceResponse", () => {
  it("parses flows + findings, forces flow-completeness, and anchors to flow › step", () => {
    const r = parseFlowTraceResponse(GOOD_JSON);
    expect(r.flows).toHaveLength(2);
    expect(r.flows[0].complete).toBe(false);
    expect(r.flows[1].complete).toBe(true);
    expect(r.findings).toHaveLength(1); // empty-problem dropped
    expect(r.findings[0].id).toBe("PQ-L2F-001");
    expect(r.findings[0].dimension).toBe("flow-completeness");
    expect(r.findings[0].section).toBe('Flow "user places an order" › pay');
    expect(r.findings[0].severity).toBe("blocker");
  });

  it("forces flow-completeness even if the model emits another dimension", () => {
    const json = JSON.stringify({
      flows: [],
      findings: [
        { flow: "f", step: "s", dimension: "page", severity: "warn", problem: "gap" },
      ],
    });
    expect(parseFlowTraceResponse(json).findings[0].dimension).toBe("flow-completeness");
  });

  it("degrades to empty on malformed output", () => {
    expect(parseFlowTraceResponse("not json").findings).toHaveLength(0);
    expect(parseFlowTraceResponse("{ broken").flows).toHaveLength(0);
  });

  it("caps flows and findings at 12 each", () => {
    const json = JSON.stringify({
      flows: Array.from({ length: 20 }, (_v, i) => ({ name: `flow ${i}`, steps: [], complete: true })),
      findings: Array.from({ length: 20 }, (_v, i) => ({ flow: `f${i}`, step: "s", problem: `p${i}` })),
    });
    const r = parseFlowTraceResponse(json);
    expect(r.flows).toHaveLength(12);
    expect(r.findings).toHaveLength(12);
  });
});

describe("generateFlowTrace (hermetic via injected impl)", () => {
  it("returns parsed findings + provenance without any network", async () => {
    let sawSystemPrompt = false;
    const result = await generateFlowTrace("# PRD\nbody", null, {
      chatCompletionImpl: async (messages) => {
        sawSystemPrompt = messages[0].role === "system";
        return fakeResponse(GOOD_JSON);
      },
    });
    expect(sawSystemPrompt).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.flows).toHaveLength(2);
    expect(result.model).toBe("claude-sonnet-4");
    expect(result.promptVersion).toBe(PRD_FLOW_TRACER_PROMPT_VERSION);
  });

  it("passes known findings into the prompt so they aren't repeated", async () => {
    let userContent = "";
    await generateFlowTrace("# PRD", null, {
      knownFindings: [
        {
          id: "PQ-001",
          dimension: "flow-completeness",
          severity: "blocker",
          section: "WF-1",
          problem: "Workflow has no terminal state.",
          downstreamImpact: "loops forever",
          suggestedFix: "add end state",
        },
      ],
      chatCompletionImpl: async (messages) => {
        userContent = messages[1].content;
        return fakeResponse(GOOD_JSON);
      },
    });
    expect(userContent).toContain("DO NOT repeat");
    expect(userContent).toContain("Workflow has no terminal state.");
  });
});
