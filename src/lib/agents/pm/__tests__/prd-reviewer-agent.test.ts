import { describe, expect, it } from "vitest";

import {
  generatePrdReview,
  parsePrdReviewResponse,
  mergePrdFindings,
  PRD_REVIEWER_PROMPT_VERSION,
} from "../prd-reviewer-agent";
import type { OpenRouterResponse } from "@/lib/llm-types";
import type { PrdQualityFinding } from "@/lib/pipeline/gates/prd-quality-gate";

function fakeResponse(content: string): OpenRouterResponse {
  return {
    model: "claude-sonnet-4",
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  } as unknown as OpenRouterResponse;
}

const GOOD_JSON = JSON.stringify({
  overall: { score: 4, summary: "Several flows are underspecified." },
  findings: [
    {
      dimension: "completeness",
      severity: "blocker",
      section: "Checkout",
      problem: "No payment-failure path described.",
      downstreamImpact: "codegen omits the failed-payment branch.",
      suggestedFix: "Describe what happens when payment is declined.",
    },
    {
      dimension: "garbage-dim",
      severity: "screaming",
      section: "Orders",
      problem: "Sort order undefined.",
      downstreamImpact: "agent guesses ordering.",
      suggestedFix: "Define default sort.",
    },
    { dimension: "ambiguity", severity: "warn", problem: "   " }, // dropped (empty problem)
  ],
});

describe("parsePrdReviewResponse", () => {
  it("parses findings, ids them, and normalises bad dimension/severity", () => {
    const r = parsePrdReviewResponse(GOOD_JSON);
    expect(r.overall.score).toBe(4);
    expect(r.findings).toHaveLength(2); // empty-problem one dropped
    expect(r.findings[0].id).toBe("PQ-L2-001");
    expect(r.findings[0].dimension).toBe("completeness");
    // unknown dimension/severity coerced to safe defaults
    expect(r.findings[1].dimension).toBe("completeness");
    expect(r.findings[1].severity).toBe("warn");
  });

  it("degrades to an empty review on malformed output", () => {
    expect(parsePrdReviewResponse("not json at all").findings).toHaveLength(0);
    expect(parsePrdReviewResponse("{ broken").overall.score).toBe(0);
  });

  it("caps findings at 12", () => {
    const many = JSON.stringify({
      overall: { score: 5, summary: "x" },
      findings: Array.from({ length: 20 }, (_v, i) => ({
        dimension: "ambiguity",
        severity: "warn",
        section: `S${i}`,
        problem: `problem ${i}`,
        downstreamImpact: "x",
        suggestedFix: "y",
      })),
    });
    expect(parsePrdReviewResponse(many).findings).toHaveLength(12);
  });
});

describe("generatePrdReview (hermetic via injected impl)", () => {
  it("returns parsed findings + provenance without any network", async () => {
    let sawSystemPrompt = false;
    const result = await generatePrdReview("# PRD\nbody", null, {
      chatCompletionImpl: async (messages) => {
        sawSystemPrompt = messages[0].role === "system";
        return fakeResponse(GOOD_JSON);
      },
    });
    expect(sawSystemPrompt).toBe(true);
    expect(result.findings).toHaveLength(2);
    expect(result.model).toBe("claude-sonnet-4");
    expect(result.promptVersion).toBe(PRD_REVIEWER_PROMPT_VERSION);
    expect(result.overall.summary).toMatch(/underspecified/);
  });

  it("passes known Layer-1 findings into the prompt so they aren't repeated", async () => {
    let userContent = "";
    await generatePrdReview("# PRD", null, {
      knownFindings: [
        {
          id: "PQ-001",
          dimension: "page",
          severity: "blocker",
          section: "PAGE-001",
          problem: "Page has no route.",
          downstreamImpact: "404",
          suggestedFix: "add route",
        },
      ],
      chatCompletionImpl: async (messages) => {
        userContent = messages[1].content;
        return fakeResponse(GOOD_JSON);
      },
    });
    expect(userContent).toContain("DO NOT repeat");
    expect(userContent).toContain("Page has no route.");
  });
});

describe("mergePrdFindings", () => {
  const mk = (over: Partial<PrdQualityFinding>): PrdQualityFinding => ({
    id: "x",
    dimension: "page",
    severity: "warn",
    section: "S",
    problem: "P",
    downstreamImpact: "",
    suggestedFix: "",
    ...over,
  });

  it("merges, dedups by dimension+problem, and renumbers", () => {
    const l1 = [mk({ problem: "Page has no route." }), mk({ problem: "Dup me", dimension: "user-path" })];
    const l2 = [
      mk({ problem: "  dup me ", dimension: "user-path" }), // dup of l1[1]
      mk({ problem: "New semantic issue", dimension: "ambiguity" }),
    ];
    const merged = mergePrdFindings(l1, l2);
    expect(merged).toHaveLength(3); // one dup dropped
    expect(merged.map((f) => f.id)).toEqual(["PQ-001", "PQ-002", "PQ-003"]);
  });
});
