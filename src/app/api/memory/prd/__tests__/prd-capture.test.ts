import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/knowledge/prd-knowledge/extract", () => ({
  extractPrdKnowledge: vi.fn(),
}));
vi.mock("@/lib/memory/prd-diff-summarize", () => ({
  summarizePrdDiff: vi.fn().mockResolvedValue(null),
}));

const saved: Array<Record<string, unknown>> = [];
vi.mock("@/lib/memory", () => ({
  getSystemMemory: () => ({
    save: vi.fn(async (input: Record<string, unknown>) => {
      const rec = { id: `r${saved.length + 1}`, ...input };
      saved.push(rec);
      return rec;
    }),
    recall: vi.fn().mockResolvedValue([]),
  }),
}));
vi.mock("@/lib/memory/env", () => ({ memoryEnabled: () => true }));
vi.mock("@/lib/memory/trace", () => ({ getTraceLogger: () => ({ log: vi.fn() }) }));

import { extractPrdKnowledge } from "@/lib/memory/knowledge/prd-knowledge/extract";
import { POST } from "@/app/api/memory/prd/capture/route";

describe("POST /api/memory/prd/capture", () => {
  beforeEach(() => {
    saved.length = 0;
    vi.clearAllMocks();
  });

  it("writes prd-pattern AND prd-knowledge (pending) when extract succeeds", async () => {
    (extractPrdKnowledge as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      industry: "saas",
      productType: "dashboard",
      tier: "M",
      title: "x",
      summary: "y",
      sections: { userStories: ["s1"] },
    });

    const finalPrd = "# PRD\n".repeat(40);
    const req = new Request("http://test/", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "kick-1",
        originalPrd: finalPrd,
        finalPrd,
        projectType: "dashboard",
        tier: "M",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const kinds = saved.map((s) => s.kind);
    expect(kinds).toContain("prd-pattern");
    expect(kinds).toContain("prd-knowledge");

    const pk = saved.find((s) => s.kind === "prd-knowledge")!;
    expect((pk.tags as string[])).toContain("status:pending");
    expect((pk.metrics as Record<string, number>).score).toBe(0);
  });

  it("still writes prd-pattern when extractPrdKnowledge returns null", async () => {
    (extractPrdKnowledge as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const finalPrd = "# PRD\n".repeat(40);
    const req = new Request("http://test/", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "kick-2",
        originalPrd: finalPrd,
        finalPrd,
        projectType: "dashboard",
        tier: "M",
      }),
    });
    await POST(req);
    const kinds = saved.map((s) => s.kind);
    expect(kinds).toContain("prd-pattern");
    expect(kinds).not.toContain("prd-knowledge");
  });
});
