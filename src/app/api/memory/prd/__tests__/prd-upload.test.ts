import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/knowledge/prd-knowledge/persist", () => ({
  persistPrdKnowledge: vi.fn(),
  PrdKnowledgeDuplicateError: class extends Error {},
  PrdKnowledgeExtractError: class extends Error {
    constructor(msg?: string) {
      super(msg);
      this.name = "PrdKnowledgeExtractError";
    }
  },
}));
vi.mock("@/lib/memory/env", () => ({ memoryEnabled: () => true }));

import {
  persistPrdKnowledge,
  PrdKnowledgeExtractError,
} from "@/lib/memory/knowledge/prd-knowledge/persist";
import { POST } from "@/app/api/memory/prd/upload/route";

function makeReq(file: File): Request {
  const fd = new FormData();
  fd.append("file", file);
  return new Request("http://test/", { method: "POST", body: fd });
}

function md(name: string, contents: string): File {
  return new File([contents], name, { type: "text/markdown" });
}

describe("POST /api/memory/prd/upload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a .md file, calls persist, returns 200 with id/title/industry/productType", async () => {
    (persistPrdKnowledge as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "PK-deadbeef",
      record: {
        title: "Uploaded PRD",
        industry: "saas",
        productType: "dashboard",
      },
    });

    const res = await POST(makeReq(md("good.md", "# PRD\n".repeat(60))));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      id: "PK-deadbeef",
      title: "Uploaded PRD",
      industry: "saas",
      productType: "dashboard",
    });
    const call = (persistPrdKnowledge as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.source).toBe("manual");
    expect(call.tier).toBe("M");
    expect(call.idempotencyCheck).toBe(false);
  });

  it("rejects non-md extension with 400 invalid_extension", async () => {
    const res = await POST(makeReq(md("notes.txt", "# PRD\n".repeat(60))));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_extension" });
    expect(persistPrdKnowledge).not.toHaveBeenCalled();
  });

  it("rejects short content with 400 file_too_short", async () => {
    const res = await POST(makeReq(md("short.md", "# tiny")));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "file_too_short" });
    expect(persistPrdKnowledge).not.toHaveBeenCalled();
  });

  it("returns 400 extract_failed when persist throws PrdKnowledgeExtractError", async () => {
    (persistPrdKnowledge as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new PrdKnowledgeExtractError(),
    );
    const res = await POST(makeReq(md("ok.md", "# PRD\n".repeat(60))));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "extract_failed" });
  });

  it("returns 413 file_too_large when file > 2MB", async () => {
    const big = md("huge.md", "a".repeat(2 * 1024 * 1024 + 1));
    const res = await POST(makeReq(big));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ ok: false, error: "file_too_large" });
    expect(persistPrdKnowledge).not.toHaveBeenCalled();
  });

  it("accepts .markdown extension (case-insensitive)", async () => {
    (persistPrdKnowledge as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "PK-x",
      record: { title: "t", industry: "saas", productType: "p" },
    });
    const res = await POST(makeReq(md("FOO.MARKDOWN", "# PRD\n".repeat(60))));
    expect(res.status).toBe(200);
  });
});
