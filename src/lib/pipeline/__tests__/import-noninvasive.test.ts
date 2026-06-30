import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { analyzeProject } from "../import-analysis/build-profile";
import { writeProjectProfile } from "../project-profile";

const execFileAsync = promisify(execFile);
async function git(dir: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: dir });
  return stdout.trim();
}
async function write(root: string, rel: string, content: string) {
  const p = path.join(root, rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf-8");
}

/**
 * End-to-end check of the import feature's core promise: analyzing an external
 * project and backfilling its metadata must NOT modify or delete any existing
 * source file. We build a real React+Express repo, commit it, then run the
 * analyzer + write the profile, and assert git sees only untracked additions.
 */
describe("import flow is non-invasive on a real React+Express repo", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "import-e2e-"));
    // ── A small but realistic external project ──
    await write(dir, "frontend/package.json", JSON.stringify({
      dependencies: { react: "^18", "react-dom": "^18" },
      devDependencies: { vite: "^5", typescript: "^5" },
    }));
    await write(dir, "frontend/tsconfig.json", "{}");
    await write(dir, "frontend/src/App.tsx", "export default function App(){return null}");
    await write(dir, "frontend/src/pages/Home.tsx", "export default function Home(){return null}");
    await write(dir, "frontend/src/api/client.ts",
      `const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";\nexport default API_BASE;`);
    await write(dir, "backend/package.json", JSON.stringify({
      dependencies: { express: "^4" },
    }));
    await write(dir, "backend/src/index.js", "const app = require('express')()");
    await write(dir, "backend/src/routes/users.js",
      `router.get("/users", h); router.post("/users", h);`);
    await write(dir, ".env.example", "DATABASE_URL=\nSTRIPE_KEY=\n");

    // Commit it so git can tell apart "existing" from "added by import".
    await git(dir, ["init"]);
    await git(dir, ["config", "user.email", "t@t"]);
    await git(dir, ["config", "user.name", "t"]);
    await git(dir, ["add", "-A"]);
    await git(dir, ["commit", "-m", "initial external project"]);
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("detects the stack correctly", async () => {
    const report = await analyzeProject(dir);
    expect(report.profile.stack.frontend?.framework).toBe("vite-react");
    expect(report.profile.stack.frontend?.pageDir).toBe("src/pages");
    expect(report.profile.stack.backend?.framework).toBe("express");
    expect(report.profile.detectedEndpoints.length).toBeGreaterThanOrEqual(2);
    expect(report.profile.envKeys).toEqual(
      expect.arrayContaining(["DATABASE_URL", "STRIPE_KEY"]),
    );
  });

  it("writing profile + contracts metadata does not touch existing source", async () => {
    const report = await analyzeProject(dir);
    // Persist the metadata a backfill would write.
    await writeProjectProfile(dir, report.profile);
    await fs.writeFile(
      path.join(dir, "API_CONTRACTS.json"),
      JSON.stringify(report.profile.detectedEndpoints, null, 2),
      "utf-8",
    );

    const status = await git(dir, ["status", "--porcelain"]);
    const lines = status.split("\n").filter(Boolean);
    // EVERY change must be an untracked addition (status code "??"); no existing
    // tracked file may be Modified / Deleted / Renamed.
    for (const line of lines) {
      const code = line.slice(0, 2);
      expect(code, `unexpected change: ${line}`).toBe("??");
    }
    // And the additions are exactly our metadata, never project source.
    const addedPaths = lines.map((l) => l.slice(3));
    for (const p of addedPaths) {
      expect(
        p.startsWith(".blueprint/") || p === "API_CONTRACTS.json",
        `non-metadata file added: ${p}`,
      ).toBe(true);
    }
    expect(addedPaths.length).toBeGreaterThan(0);
  });
});
