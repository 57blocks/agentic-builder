import { describe, it, expect, vi, beforeEach } from "vitest";

const STORE = new Map<string, Record<string, unknown>>();

vi.mock("@/lib/memory", () => ({
  getSystemMemory: () => ({
    get: vi.fn(async (id: string) => STORE.get(id) ?? null),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      const cur = STORE.get(id);
      if (!cur) throw new Error("not found");
      const merged = {
        ...cur,
        ...patch,
        tags: patch.tags ?? cur.tags,
        metrics: { ...(cur.metrics as object), ...((patch.metrics as object) ?? {}) },
      };
      STORE.set(id, merged);
      return merged;
    }),
    setScore: vi.fn(async (id: string, score: number) => {
      const cur = STORE.get(id);
      if (cur) STORE.set(id, { ...cur, metrics: { ...(cur.metrics as object), score } });
    }),
    delete: vi.fn(async (id: string) => STORE.delete(id)),
  }),
}));
vi.mock("@/lib/memory/env", () => ({ memoryEnabled: () => true }));

import { POST as approve } from "@/app/api/memory/prd/[id]/approve/route";
import { POST as reject } from "@/app/api/memory/prd/[id]/reject/route";

function makeRecord(id: string, status: "pending" | "active" | "deprecated") {
  const body = JSON.stringify({
    schemaVersion: 1,
    industry: "saas",
    productType: "dashboard",
    tier: "M",
    title: "t",
    summary: "s",
    sections: {},
    fullPrd: "x",
    status,
  });
  STORE.set(id, {
    id,
    kind: "prd-knowledge",
    body,
    tags: [`status:${status}`, "industry:saas", "productType:dashboard", "tier:M", "phase:prd", "kind:prd-knowledge"],
    metrics: { score: 0 },
  });
}

describe("approve endpoint", () => {
  beforeEach(() => STORE.clear());

  it("flips status to active and bumps score to 0.4", async () => {
    makeRecord("rec1", "pending");
    const req = new Request("http://test", { method: "POST" });
    const res = await approve(req, { params: Promise.resolve({ id: "rec1" }) });
    expect(res.status).toBe(200);
    const stored = STORE.get("rec1")!;
    const parsed = JSON.parse(stored.body as string);
    expect(parsed.status).toBe("active");
    expect((stored.tags as string[])).toContain("status:active");
    expect((stored.tags as string[])).not.toContain("status:pending");
    expect((stored.metrics as { score: number }).score).toBe(0.4);
  });
});

describe("reject endpoint", () => {
  beforeEach(() => STORE.clear());

  it("flips status to deprecated and sets score to -1", async () => {
    makeRecord("rec2", "pending");
    const req = new Request("http://test", { method: "POST" });
    const res = await reject(req, { params: Promise.resolve({ id: "rec2" }) });
    expect(res.status).toBe(200);
    const stored = STORE.get("rec2")!;
    const parsed = JSON.parse(stored.body as string);
    expect(parsed.status).toBe("deprecated");
    expect((stored.metrics as { score: number }).score).toBe(-1);
  });
});
