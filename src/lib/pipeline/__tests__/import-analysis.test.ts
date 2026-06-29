import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { detectStack } from "../import-analysis/detect-stack";
import { extractApiContracts } from "../import-analysis/extract-api-contracts";
import { analyzeProject } from "../import-analysis/build-profile";
import {
  readProjectProfile,
  writeProjectProfile,
  type ProjectProfile,
} from "../project-profile";

async function write(root: string, rel: string, content: string) {
  const p = path.join(root, rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf-8");
}

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "import-analysis-"));
}

describe("detectStack — Vite+React FE + Koa+Sequelize BE (separate-fe-be)", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await tmpDir();
    await write(dir, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
    await write(
      dir,
      "frontend/package.json",
      JSON.stringify({
        dependencies: { react: "^18", "react-dom": "^18" },
        devDependencies: { vite: "^5", typescript: "^5" },
      }),
    );
    await write(dir, "frontend/tsconfig.json", "{}");
    await write(dir, "frontend/src/views/HomePage.tsx", "export default 1");
    await write(dir, "frontend/src/router.tsx", "export const r = 1");
    await write(
      dir,
      "frontend/src/api/client.ts",
      `const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";\nexport default API_BASE;`,
    );
    await write(
      dir,
      "backend/package.json",
      JSON.stringify({ dependencies: { koa: "^2", sequelize: "^6" } }),
    );
    await write(dir, "backend/tsconfig.json", "{}");
    await write(
      dir,
      "backend/src/api/modules/users.routes.ts",
      `export function registerUserRoutes(apiRouter){ apiRouter.get("/users/:id", h); apiRouter.post("/users", h); }`,
    );
    await write(dir, "backend/.env.example", "DATABASE_URL=\nJWT_SECRET=\n");
  });
  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("identifies layout, package manager, and both stacks", async () => {
    const r = await detectStack(dir);
    expect(r.stack.monorepo).toBe("separate-fe-be");
    expect(r.stack.packageManager).toBe("pnpm");
    expect(r.stack.frontend?.framework).toBe("vite-react");
    expect(r.stack.frontend?.language).toBe("ts");
    expect(r.stack.frontend?.pageDir).toBe("src/views");
    expect(r.stack.backend?.framework).toBe("koa");
    expect(r.stack.backend?.orm).toBe("sequelize");
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it("extracts the API client base and flags it includes the prefix", async () => {
    const r = await detectStack(dir);
    expect(r.stack.frontend?.apiClient?.path).toBe("src/api/client.ts");
    expect(r.stack.frontend?.apiClient?.baseUrl).toBe("/api/v1");
    expect(r.stack.frontend?.apiClient?.baseIncludesPrefix).toBe(true);
  });

  it("detects env keys", async () => {
    const r = await detectStack(dir);
    expect(r.envKeys).toContain("DATABASE_URL");
    expect(r.envKeys).toContain("JWT_SECRET");
  });

  it("reverse-extracts Koa/Express routes", async () => {
    const r = await detectStack(dir);
    const c = await extractApiContracts(dir, r.stack.backend ?? null);
    const keys = c.endpoints.map((e) => `${e.method} ${e.path}`);
    expect(keys).toContain("GET /users/:id");
    expect(keys).toContain("POST /users");
  });

  it("analyzeProject yields a profile + review report", async () => {
    const report = await analyzeProject(dir, { now: "2026-01-01T00:00:00.000Z" });
    expect(report.profile.imported).toBe(true);
    expect(report.profile.analyzedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(report.profile.detectedEndpoints.length).toBeGreaterThanOrEqual(2);
    expect(report.willGenerate.map((w) => w.file)).toContain(
      ".blueprint/project-profile.json",
    );
    expect(report.willGenerate.map((w) => w.file)).toContain("API_CONTRACTS.json");
  });
});

describe("detectStack — Next.js flat fullstack", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await tmpDir();
    await write(dir, "package-lock.json", "{}");
    await write(
      dir,
      "package.json",
      JSON.stringify({ dependencies: { next: "^15", react: "^18" } }),
    );
    await write(dir, "app/page.tsx", "export default 1");
  });
  afterAll(async () => fs.rm(dir, { recursive: true, force: true }));

  it("identifies next + flat + npm", async () => {
    const r = await detectStack(dir);
    expect(r.stack.frontend?.framework).toBe("next");
    expect(r.stack.monorepo).toBe("flat");
    expect(r.stack.packageManager).toBe("npm");
    expect(r.stack.frontend?.pageDir).toBe("app");
  });
});

describe("detectStack — Django backend", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await tmpDir();
    await write(dir, "backend/manage.py", "# django");
    await write(dir, "backend/requirements.txt", "Django==5.0\n");
  });
  afterAll(async () => fs.rm(dir, { recursive: true, force: true }));

  it("identifies python/django and notes the limitation", async () => {
    const report = await analyzeProject(dir, { now: "x" });
    expect(report.profile.stack.backend?.framework).toBe("django");
    expect(report.profile.stack.backend?.language).toBe("python");
    expect(report.notes.join(" ")).toMatch(/non-JS|not supported/i);
  });
});

describe("project-profile IO roundtrip", () => {
  it("writes and reads back a profile; returns null when absent", async () => {
    const dir = await tmpDir();
    expect(await readProjectProfile(dir)).toBeNull();
    const profile: ProjectProfile = {
      imported: true,
      analyzedAt: "2026-01-01T00:00:00.000Z",
      stack: { monorepo: "flat", packageManager: "npm" },
      detectedEndpoints: [{ method: "GET", path: "/x" }],
      designSystem: { approach: "tailwind", tokensFile: null },
      envKeys: ["FOO"],
    };
    await writeProjectProfile(dir, profile);
    const back = await readProjectProfile(dir);
    expect(back?.stack.frontend ?? null).toBeNull();
    expect(back?.detectedEndpoints[0]?.path).toBe("/x");
    expect(back?.envKeys).toEqual(["FOO"]);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
