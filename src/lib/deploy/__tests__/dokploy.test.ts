import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  createDokployProject,
  createDokployCompose,
  updateDokployCompose,
  deployDokployCompose,
  pollDeployStatus,
} from "../dokploy";

const BASE = "https://dokploy.example.com";
const TOKEN = "test-token";

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDokployProject", () => {
  it("posts to /api/project.create and returns project + environment ids", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({
      project: { projectId: "proj-1" },
      environment: { environmentId: "env-1" },
    }));
    const result = await createDokployProject({ baseUrl: BASE, token: TOKEN, name: "my-app" });
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/api/project.create`,
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual({ projectId: "proj-1", environmentId: "env-1" });
  });
});

describe("createDokployCompose", () => {
  it("posts to /api/compose.create and returns composeId + appName", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ composeId: "comp-1", appName: "my-app-abc" }));
    const result = await createDokployCompose({
      baseUrl: BASE, token: TOKEN, name: "my-app", projectId: "proj-1", environmentId: "env-1",
    });
    expect(result).toEqual({ composeId: "comp-1", appName: "my-app-abc" });
  });
});

describe("updateDokployCompose", () => {
  it("posts to /api/compose.update with git source fields", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}));
    await updateDokployCompose({
      baseUrl: BASE,
      token: TOKEN,
      composeId: "comp-1",
      repository: "https://github.com/owner/app",
      branch: "main",
      env: "DATABASE_URL=postgresql://...\n",
    });
    const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1]!.body as string) as Record<string, string>;
    expect(body.composeId).toBe("comp-1");
    expect(body.sourceType).toBe("git");
    expect(body.customGitUrl).toBe("https://github.com/owner/app");
    expect(body.customGitBranch).toBe("main");
    expect(body.env).toContain("DATABASE_URL");
  });
});

describe("deployDokployCompose", () => {
  it("posts to /api/compose.deploy", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}));
    await deployDokployCompose({ baseUrl: BASE, token: TOKEN, composeId: "comp-1" });
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/api/compose.deploy`,
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("pollDeployStatus", () => {
  it("resolves with url when composeStatus becomes done", async () => {
    mockFetch
      .mockReturnValueOnce(jsonResponse({ composeStatus: "running", domains: [] }))
      .mockReturnValueOnce(jsonResponse({ composeStatus: "done", domains: [{ host: "app.example.com", https: true }] }));

    const url = await pollDeployStatus({
      baseUrl: BASE,
      token: TOKEN,
      composeId: "comp-1",
      intervalMs: 10,
      timeoutMs: 5000,
    });
    expect(url).toBe("https://app.example.com");
  });

  it("rejects when composeStatus is error", async () => {
    mockFetch.mockImplementation(() => jsonResponse({ composeStatus: "error", domains: [] }));
    await expect(
      pollDeployStatus({ baseUrl: BASE, token: TOKEN, composeId: "comp-1", intervalMs: 10, timeoutMs: 500 })
    ).rejects.toThrow("Dokploy deploy failed");
  });

  it("rejects on timeout", async () => {
    mockFetch.mockImplementation(() => jsonResponse({ composeStatus: "running", domains: [] }));
    await expect(
      pollDeployStatus({ baseUrl: BASE, token: TOKEN, composeId: "comp-1", intervalMs: 10, timeoutMs: 50 })
    ).rejects.toThrow("timed out");
  });
});
