import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { maybeDumpCodingContext } from "../coding-context-dump";
import type { ChatMessage } from "@/lib/llm-types";

const msgs: ChatMessage[] = [
  { role: "system", content: "You are a coding agent." },
  { role: "user", content: "DATABASE_URL=postgres://u:supersecret@h/db" },
  { role: "assistant", content: "ok" },
];

let tmp: string;
const prev = process.env.CODEGEN_CONTEXT_DUMP;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ctxdump-"));
});
afterEach(async () => {
  if (prev === undefined) delete process.env.CODEGEN_CONTEXT_DUMP;
  else process.env.CODEGEN_CONTEXT_DUMP = prev;
  await fs.rm(tmp, { recursive: true, force: true });
});

async function listDumps(): Promise<string[]> {
  const dir = path.join(tmp, ".ralph", "context-dumps");
  try {
    return (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

describe("maybeDumpCodingContext", () => {
  it("is a no-op when CODEGEN_CONTEXT_DUMP is unset", async () => {
    delete process.env.CODEGEN_CONTEXT_DUMP;
    await maybeDumpCodingContext(msgs, { taskId: "T-1", iteration: 0, outputDir: tmp });
    expect(await listDumps()).toHaveLength(0);
  });

  it('dumps every round when set to "all", with index + redaction', async () => {
    process.env.CODEGEN_CONTEXT_DUMP = "all";
    await maybeDumpCodingContext(msgs, { taskId: "T-7", iteration: 2, outputDir: tmp });

    const files = await listDumps();
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("T-7");
    expect(files[0]).toContain("iter02");

    const dir = path.join(tmp, ".ralph", "context-dumps");
    const payload = JSON.parse(await fs.readFile(path.join(dir, files[0]), "utf8"));
    expect(payload.messageCount).toBe(3);
    expect(payload.roleCounts).toEqual({ system: 1, user: 1, assistant: 1 });
    expect(payload.approxTokens).toBeGreaterThan(0);
    // secret in the DATABASE_URL message is redacted
    const userMsg = payload.messages.find((m: ChatMessage) => m.role === "user");
    expect(userMsg.content).toContain("***redacted***");
    expect(userMsg.content).not.toContain("supersecret");

    const index = await fs.readFile(path.join(dir, "index.jsonl"), "utf8");
    expect(index.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(index.trim()).taskId).toBe("T-7");
  });

  it("only dumps matching tasks when set to a taskId filter", async () => {
    process.env.CODEGEN_CONTEXT_DUMP = "T-9";
    await maybeDumpCodingContext(msgs, { taskId: "T-1", iteration: 0, outputDir: tmp });
    expect(await listDumps()).toHaveLength(0);
    await maybeDumpCodingContext(msgs, { taskId: "T-9", iteration: 0, outputDir: tmp });
    expect(await listDumps()).toHaveLength(1);
  });

  it("never throws on a bad output dir", async () => {
    process.env.CODEGEN_CONTEXT_DUMP = "all";
    await expect(
      maybeDumpCodingContext(msgs, { taskId: "T-1", outputDir: "/proc/nonexistent/\0bad" }),
    ).resolves.toBeUndefined();
  });
});
