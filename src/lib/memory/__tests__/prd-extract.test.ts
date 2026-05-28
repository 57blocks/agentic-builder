import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractPrdKnowledge } from "@/lib/memory/knowledge/prd-knowledge/extract";

vi.mock("@/lib/openrouter", () => ({
  chatCompletion: vi.fn(),
  resolveModel: () => "test-model",
}));

import { chatCompletion } from "@/lib/openrouter";

describe("extractPrdKnowledge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses LLM JSON output into PrdKnowledgeRecord shape", async () => {
    (chatCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              industry: "saas",
              productType: "dashboard",
              title: "Analytics dashboard PRD",
              summary: "Two-line summary.",
              sections: {
                userStories: ["As a PM, I want X.", "As an admin, I want Y."],
                metrics: ["DAU > 500", "p95 < 300ms"],
              },
            }),
          },
        },
      ],
    });

    const result = await extractPrdKnowledge({
      finalPrd: "# PRD\n\n## User Stories\n- ...\n",
      projectType: "dashboard",
      tier: "standard",
    });

    expect(result).not.toBeNull();
    expect(result!.industry).toBe("saas");
    expect(result!.productType).toBe("dashboard");
    expect(result!.sections.userStories).toHaveLength(2);
    expect(result!.tier).toBe("standard");
  });

  it("falls back to input projectType when LLM omits it", async () => {
    (chatCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ industry: "generic", summary: "x", sections: {} }) } }],
    });

    const result = await extractPrdKnowledge({
      finalPrd: "# PRD body".repeat(100),
      projectType: "marketplace",
      tier: "lite",
    });

    expect(result!.productType).toBe("marketplace");
  });

  it("returns null on LLM failure", async () => {
    (chatCompletion as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));

    const result = await extractPrdKnowledge({
      finalPrd: "x".repeat(300),
      projectType: "dashboard",
      tier: "standard",
    });
    expect(result).toBeNull();
  });
});
