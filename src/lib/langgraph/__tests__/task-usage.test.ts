import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeTaskUsage } from "../task-context-logger";

const RECORD = {
  timestamp: "2026-06-22T00:00:00.000Z",
  sessionId: "s1",
  taskId: "T-1",
  role: "backend",
  attempt: 1,
  model: "codeGen",
  engineeringSkillsEnabled: true,
  appliedSkills: [
    { id: "auth", filePath: ".blueprint/skills/backend/auth.md", version: "v1" },
  ],
  inputTokens: 100,
  outputTokens: 40,
  totalTokens: 140,
  costUsd: 0.01,
  llmCalls: 2,
};

describe("writeTaskUsage", () => {
  it("writes a well-formed usage.json into the task log dir", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "usage-"));
    await writeTaskUsage(dir, RECORD);
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, "usage.json"), "utf-8"));
    expect(parsed.engineeringSkillsEnabled).toBe(true);
    expect(parsed.appliedSkills[0].filePath).toBe(".blueprint/skills/backend/auth.md");
    expect(parsed.inputTokens).toBe(100);
    expect(parsed.outputTokens).toBe(40);
    expect(parsed.totalTokens).toBe(140);
  });

  it("never throws on a bad dir", async () => {
    await expect(
      writeTaskUsage("/nonexistent/\0/dir", RECORD),
    ).resolves.toBeUndefined();
  });
});
