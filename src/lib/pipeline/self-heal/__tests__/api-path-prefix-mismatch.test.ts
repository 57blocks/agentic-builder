/**
 * Unit tests for the `api-path-prefix-mismatch` rule in
 * runtime-integration-audit.ts.
 *
 * The rule reads the ACTUAL client base URL + backend mount prefix from the
 * generated files, then flags frontend apiClient calls whose composed URL
 * (base + path) can never hit a registered backend route — the silent-404
 * class this hardening targets. Tests use a real tmp outputDir because the
 * rule resolves files through fsRead/listFiles.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { runRuntimeIntegrationAudit } from "../runtime-integration-audit";

let outputDir: string;

beforeEach(async () => {
  outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "api-prefix-audit-"));
});

afterEach(async () => {
  await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
});

async function writeFile(rel: string, content: string): Promise<void> {
  const abs = path.join(outputDir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
}

const CLIENT = (base: string) => `
const API_BASE = import.meta.env.VITE_API_BASE_URL || "${base}";
export const apiClient = {
  get(p) { return fetch(\`\${API_BASE}\${p}\`); },
};
`;

const MODULES_INDEX = (prefix: string) => `
import Router from "@koa/router";
export function createApiRouter() {
  const apiRouter = new Router({ prefix: "${prefix}" });
  return apiRouter;
}
`;

/** Run the audit and return only the api-path-prefix-mismatch findings. */
async function prefixFindings(): Promise<
  { file: string; reason: string; directive: string }[]
> {
  const res = await runRuntimeIntegrationAudit({
    outputDir,
    appliedOptionalFeatures: [],
    declaredEnvKeys: [],
  });
  return res.findings
    .filter((f) => f.ruleId === "api-path-prefix-mismatch")
    .map((f) => ({ file: f.file, reason: f.reason, directive: f.directive }));
}

describe("api-path-prefix-mismatch", () => {
  it("passes when base + caller path composes under the backend mount prefix", async () => {
    // base "/api/v1" + "/users/me" → "/api/v1/users/me" ⊂ mount "/api/v1".
    await writeFile("frontend/src/api/client.ts", CLIENT("/api/v1"));
    await writeFile("backend/src/api/modules/index.ts", MODULES_INDEX("/api/v1"));
    await writeFile(
      "frontend/src/api/users.ts",
      `import { apiClient } from "./client";
       export const getMe = () => apiClient.get("/users/me");`,
    );
    expect(await prefixFindings()).toHaveLength(0);
  });

  it("also passes the legacy split convention (base /api + caller /v1/...)", async () => {
    // base "/api" + "/v1/users/me" → "/api/v1/users/me" ⊂ mount "/api/v1".
    await writeFile("frontend/src/api/client.ts", CLIENT("/api"));
    await writeFile("backend/src/api/modules/index.ts", MODULES_INDEX("/api/v1"));
    await writeFile(
      "frontend/src/api/users.ts",
      `import { apiClient } from "./client";
       export const getMe = () => apiClient.get("/v1/users/me");`,
    );
    expect(await prefixFindings()).toHaveLength(0);
  });

  it("flags a double prefix (caller repeats the base)", async () => {
    // base "/api/v1" + "/api/v1/users" → "/api/v1/api/v1/users" 404.
    await writeFile("frontend/src/api/client.ts", CLIENT("/api/v1"));
    await writeFile("backend/src/api/modules/index.ts", MODULES_INDEX("/api/v1"));
    await writeFile(
      "frontend/src/api/users.ts",
      `import { apiClient } from "./client";
       export const getMe = () => apiClient.get("/api/v1/users");`,
    );
    const findings = await prefixFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0].reason).toMatch(/doubles the prefix/);
    expect(findings[0].directive).toMatch(/\/users/);
  });

  it("flags a missing version segment (composed path escapes the mount)", async () => {
    // base "/api" + "/users" → "/api/users", but backend mounts at "/api/v1".
    await writeFile("frontend/src/api/client.ts", CLIENT("/api"));
    await writeFile("backend/src/api/modules/index.ts", MODULES_INDEX("/api/v1"));
    await writeFile(
      "frontend/src/api/users.ts",
      `import { apiClient } from "./client";
       export const getMe = () => apiClient.get("/users");`,
    );
    const findings = await prefixFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0].reason).toMatch(/not under that prefix/);
  });

  it("does not fire in absolute-URL mode (empty base default)", async () => {
    // base "" → caller carries the full path; nothing to compose-check.
    await writeFile("frontend/src/api/client.ts", CLIENT(""));
    await writeFile("backend/src/api/modules/index.ts", MODULES_INDEX("/api/v1"));
    await writeFile(
      "frontend/src/api/users.ts",
      `import { apiClient } from "./client";
       export const getMe = () => apiClient.get("/users");`,
    );
    expect(await prefixFindings()).toHaveLength(0);
  });

  it("does not fire when anchors are missing (no client or no modules index)", async () => {
    // Only the client present — without the backend mount prefix we can't
    // compose-check, so the rule must stay silent rather than guess.
    await writeFile("frontend/src/api/client.ts", CLIENT("/api/v1"));
    await writeFile(
      "frontend/src/api/users.ts",
      `import { apiClient } from "./client";
       export const getMe = () => apiClient.get("/api/v1/users");`,
    );
    expect(await prefixFindings()).toHaveLength(0);
  });

  it("ignores full URLs and template-variable paths", async () => {
    await writeFile("frontend/src/api/client.ts", CLIENT("/api/v1"));
    await writeFile("backend/src/api/modules/index.ts", MODULES_INDEX("/api/v1"));
    await writeFile(
      "frontend/src/api/misc.ts",
      `import { apiClient } from "./client";
       export const a = () => apiClient.get("https://other.example.com/api/v1/x");
       export const b = (p) => apiClient.get(\`\${p}/users\`);`,
    );
    expect(await prefixFindings()).toHaveLength(0);
  });
});
