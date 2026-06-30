import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import {
  collectRepoDigest,
  buildBaselinePrdPrompt,
  generateBaselinePrd,
} from "../import-analysis/generate-baseline-prd";
import type { ProjectProfile, SubRepo } from "../project-profile";

async function write(root: string, rel: string, content: string) {
  const p = path.join(root, rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf-8");
}

function repo(name: string, partial: Partial<SubRepo> = {}): SubRepo {
  return {
    name,
    rootDir: name,
    stack: { monorepo: "multi-repo", packageManager: "go-mod" },
    detectedEndpoints: [],
    designSystem: { approach: "unknown" },
    envKeys: [],
    ...partial,
  };
}

describe("collectRepoDigest", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "digest-"));
    await write(dir, "README.md", "# Auth Service\nHandles OAuth.");
    await write(dir, "main.go", "package main\nfunc main(){}");
    await write(
      dir,
      "internal/handler/oauth.go",
      `func Register(r *gin.Engine){ r.POST("/oauth/token", h) }`,
    );
    await write(dir, "util/strings.go", "package util");
  });
  afterEach(async () => fs.rm(dir, { recursive: true, force: true }));

  it("collects README first, then entry/route-hinted files", async () => {
    const d = await collectRepoDigest(dir, repo("auth"), 12000);
    expect(d.files[0].path).toMatch(/README/i);
    const paths = d.files.map((f) => f.path);
    // main.go (entry) and the handler should be present and ahead of util.
    expect(paths).toContain("main.go");
    expect(paths.some((p) => p.includes("oauth.go"))).toBe(true);
    expect(paths.indexOf("main.go")).toBeLessThan(
      paths.indexOf("util/strings.go"),
    );
  });

  it("respects the char budget", async () => {
    const d = await collectRepoDigest(dir, repo("auth"), 20);
    const total = d.files.reduce((s, f) => s + f.content.length, 0);
    expect(total).toBeLessThanOrEqual(20);
  });
});

describe("buildBaselinePrdPrompt", () => {
  it("frames multi-repo and includes endpoint inventory + digests", () => {
    const profile: ProjectProfile = {
      imported: true,
      analyzedAt: "x",
      stack: { monorepo: "multi-repo", packageManager: "unknown" },
      detectedEndpoints: [],
      designSystem: { approach: "unknown" },
      envKeys: [],
      repos: [
        repo("auth", {
          detectedEndpoints: [{ method: "POST", path: "/oauth/token" }],
        }),
        repo("ui"),
      ],
    };
    const prompt = buildBaselinePrdPrompt(profile, [
      { name: "auth", rootDir: "auth", stack: "backend: go", endpointCount: 1, files: [{ path: "main.go", content: "X" }] },
      { name: "ui", rootDir: "ui", stack: "frontend: vite", endpointCount: 0, files: [] },
    ]);
    expect(prompt).toContain("MULTI-REPO");
    expect(prompt).toContain("auth: POST /oauth/token");
    expect(prompt).toContain("auth/main.go");
  });
});

describe("generateBaselinePrd (injected chat)", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "baseline-prd-"));
    await write(dir, "auth/README.md", "# Auth\nOAuth server.");
    await write(dir, "auth/main.go", "package main");
    await write(dir, "ui/README.md", "# UI\nDashboard.");
  });
  afterEach(async () => fs.rm(dir, { recursive: true, force: true }));

  it("writes a system-level PRD to .blueprint/PRD.md", async () => {
    const profile: ProjectProfile = {
      imported: true,
      analyzedAt: "x",
      stack: { monorepo: "multi-repo", packageManager: "unknown" },
      detectedEndpoints: [],
      designSystem: { approach: "unknown" },
      envKeys: [],
      repos: [
        repo("auth", { detectedEndpoints: [{ method: "POST", path: "/oauth/token" }] }),
        repo("ui"),
      ],
    };
    let sawPrompt = "";
    const chat = async (p: string) => {
      sawPrompt = p;
      return "# System PRD\n\n## Overview\nReverse-engineered.";
    };
    const r = await generateBaselinePrd(dir, profile, { chat });
    expect(r.repoCount).toBe(2);
    expect(r.content).toContain("System PRD");
    // Prompt included both repos' README content.
    expect(sawPrompt).toContain("OAuth server");
    expect(sawPrompt).toContain("Dashboard");
    // PRD.md persisted where readImportedPrd expects it.
    const written = await fs.readFile(
      path.join(dir, ".blueprint", "PRD.md"),
      "utf-8",
    );
    expect(written).toContain("System PRD");
  });

  it("synthesizes a single '.' repo when profile has no repos[]", async () => {
    const single = await fs.mkdtemp(path.join(os.tmpdir(), "single-"));
    await write(single, "README.md", "# Single app");
    const profile: ProjectProfile = {
      imported: true,
      analyzedAt: "x",
      stack: {
        monorepo: "flat",
        packageManager: "npm",
        backend: { framework: "express", language: "js", rootDir: "." },
      },
      detectedEndpoints: [{ method: "GET", path: "/x" }],
      designSystem: { approach: "unknown" },
      envKeys: [],
    };
    const r = await generateBaselinePrd(single, profile, {
      chat: async () => "# PRD",
    });
    expect(r.repoCount).toBe(1);
    await fs.rm(single, { recursive: true, force: true });
  });
});
