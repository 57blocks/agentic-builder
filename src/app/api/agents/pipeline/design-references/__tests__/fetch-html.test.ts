import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pipeline/design-references", () => ({
  addDesignReference: vi.fn(),
}));

import { addDesignReference } from "@/lib/pipeline/design-references";
import { POST } from "../fetch-html/route";

const mockAddDesignReference = vi.mocked(addDesignReference);

function req(body: unknown, projectId?: string) {
  const url = `http://localhost/api/agents/pipeline/design-references/fetch-html${projectId ? `?projectId=${projectId}` : ""}`;
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockAddDesignReference.mockReset();
  mockAddDesignReference.mockResolvedValue({
    ok: true,
    entry: { id: "ref_1", pageHint: "PAGE-003" },
    manifest: [{ id: "ref_1" }],
  } as never);
});

describe("POST /design-references/fetch-html", () => {
  it("persists html as a kind:html reference bound to the pageHint", async () => {
    const res = await POST(req({ url: "https://demo.app/family/dashboard", html: "<html></html>", pageHint: "PAGE-003" }, "proj1") as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, referenceId: "ref_1", pageHint: "PAGE-003" });
    expect(mockAddDesignReference).toHaveBeenCalledTimes(1);
    const [, input] = mockAddDesignReference.mock.calls[0];
    expect(input).toMatchObject({
      mime: "text/html",
      label: "https://demo.app/family/dashboard",
      pageHint: "PAGE-003",
      source: "url",
      matchedBy: "manual",
      projectId: "proj1",
    });
    expect(input.fileName).toBe("demo-app-family-dashboard.html");
    expect(Buffer.isBuffer(input.bytes)).toBe(true);
  });

  it("rejects when html is missing", async () => {
    const res = await POST(req({ url: "https://demo.app/x" }) as never);
    expect(res.status).toBe(400);
    expect(mockAddDesignReference).not.toHaveBeenCalled();
  });

  it("surfaces addDesignReference failures", async () => {
    mockAddDesignReference.mockResolvedValue({ ok: false, error: "too big", status: 413 } as never);
    const res = await POST(req({ url: "https://demo.app/x", html: "<html></html>", pageHint: "PAGE-1" }) as never);
    expect(res.status).toBe(413);
  });
});
