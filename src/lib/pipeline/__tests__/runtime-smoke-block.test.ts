/**
 * Guards P0-C: the backend boot failure recorded in .ralph/runtime-smoke.json
 * is surfaced to the IntegrationVerifyFix worker so it stops fixing blind.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatRuntimeSmokeBlock } from "../runtime-smoke-block";

let tmpDir: string;
let ralphDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rt-smoke-block-"));
  ralphDir = path.join(tmpDir, ".ralph");
  await fs.mkdir(ralphDir, { recursive: true });
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeSnapshot(obj: unknown): Promise<void> {
  await fs.writeFile(
    path.join(ralphDir, "runtime-smoke.json"),
    JSON.stringify(obj),
    "utf-8",
  );
}

describe("formatRuntimeSmokeBlock", () => {
  it("returns empty when no snapshot exists", async () => {
    expect(await formatRuntimeSmokeBlock(tmpDir)).toBe("");
  });

  it("returns empty when the smoke gate passed", async () => {
    await writeSnapshot({ pass: true, bootFailed: false, failures: [] });
    expect(await formatRuntimeSmokeBlock(tmpDir)).toBe("");
  });

  it("renders the boot failure directive and stderr tail", async () => {
    await writeSnapshot({
      pass: false,
      bootFailed: true,
      sessionId: "S1",
      failures: [
        {
          code: "backend_did_not_start",
          target: "_boot",
          directive: "Backend pnpm dev did not reach a listening state.",
          evidence:
            'CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" ("email")',
        },
      ],
    });
    const block = await formatRuntimeSmokeBlock(tmpDir, { sessionId: "S1" });
    expect(block).toMatch(/Runtime smoke gate/i);
    expect(block).toMatch(/Backend did not start/i);
    expect(block).toMatch(/listening state/);
    expect(block).toMatch(/users_email_unique_idx/);
  });

  it("suppresses a snapshot from a different session", async () => {
    await writeSnapshot({
      pass: false,
      bootFailed: true,
      sessionId: "OTHER",
      failures: [
        {
          code: "backend_did_not_start",
          target: "_boot",
          directive: "boot failed",
          evidence: "stack",
        },
      ],
    });
    expect(await formatRuntimeSmokeBlock(tmpDir, { sessionId: "S1" })).toBe("");
    // …but is shown when no session filter is requested.
    expect(await formatRuntimeSmokeBlock(tmpDir)).toMatch(/Backend did not start/i);
  });

  it("renders endpoint failures when the backend booted but endpoints failed", async () => {
    await writeSnapshot({
      pass: false,
      bootFailed: false,
      failures: [
        {
          code: "endpoint_404",
          target: "GET /api/coins",
          directive: "Register the coins route.",
          evidence: "404",
        },
      ],
    });
    const block = await formatRuntimeSmokeBlock(tmpDir);
    expect(block).toMatch(/Endpoint failures/);
    expect(block).toMatch(/GET \/api\/coins/);
    expect(block).toMatch(/Register the coins route/);
  });
});
