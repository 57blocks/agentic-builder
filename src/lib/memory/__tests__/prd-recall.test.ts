import { describe, it, expect, vi, beforeEach } from "vitest";

const RECORDS: Array<{ id: string; kind: string; tags: string[]; body: string; metrics: { score: number } }> = [];

vi.mock("@/lib/memory", () => ({
  getSystemMemory: () => ({
    recall: vi.fn(async (q: { kinds?: string[]; tags?: { all?: string[]; any?: string[] }; limit?: number }) => {
      return RECORDS.filter((r) => {
        if (q.kinds && !q.kinds.includes(r.kind)) return false;
        if (q.tags?.all && !q.tags.all.every((t) => r.tags.includes(t))) return false;
        if (q.tags?.any && !q.tags.any.some((t) => r.tags.includes(t))) return false;
        return true;
      }).slice(0, q.limit ?? 100);
    }),
    bumpHit: vi.fn(),
  }),
}));
vi.mock("@/lib/memory/recall-context", () => ({
  recallAndPrepareInject: vi.fn(async () => ({ block: "", records: [], usage: {} })),
}));
vi.mock("@/lib/memory/env", () => ({
  memoryInjectEnabledForPrd: () => true,
  memoryInjectEnabledForDesign: () => true,
}));

import { recallPrdContext } from "@/lib/memory/preparation-recall";

function pkRecord(id: string, status: "pending" | "active", industry: string) {
  RECORDS.push({
    id,
    kind: "prd-knowledge",
    tags: [`status:${status}`, `industry:${industry}`, `productType:dashboard`, `tier:M`, `phase:prd`, `kind:prd-knowledge`],
    body: JSON.stringify({
      schemaVersion: 1,
      industry,
      productType: "dashboard",
      tier: "M",
      title: `Case ${id}`,
      summary: "Short summary.",
      sections: { userStories: ["us1"], metrics: ["m1"] },
      fullPrd: "...",
      status,
    }),
    metrics: { score: status === "active" ? 0.4 : 0 },
  });
}

describe("recallPrdContext (prd-knowledge merge)", () => {
  beforeEach(() => { RECORDS.length = 0; });

  it("only injects active prd-knowledge records", async () => {
    pkRecord("a", "active", "saas");
    pkRecord("b", "pending", "saas");
    const result = await recallPrdContext({
      sessionId: "k",
      featureBrief: "saas analytics dashboard",
      projectRoot: process.cwd(),
    });
    expect(result.contextChunk).toContain("Case a");
    expect(result.contextChunk).not.toContain("Case b");
  });

  it("caps to top 2 cases", async () => {
    for (const id of ["a", "b", "c", "d"]) pkRecord(id, "active", "saas");
    const result = await recallPrdContext({
      sessionId: "k",
      featureBrief: "saas dashboard",
      projectRoot: process.cwd(),
    });
    const matches = result.contextChunk.match(/<case /g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(2);
  });
});
