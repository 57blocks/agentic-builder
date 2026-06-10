import { describe, it, expect } from "vitest";
import { parseJudgeResponse, pickJudgeSamples } from "@/lib/pipeline/code-quality-judge";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

describe("parseJudgeResponse", () => {
  it("parses well-formed JSON", () => {
    const out = parseJudgeResponse(`{"readability":{"score":85,"reason":"clear"},"idiomaticity":{"score":78,"reason":"ok"},"architecture":{"score":92,"reason":"clean"}}`);
    expect(out.present).toBe(true);
    expect(out.readability?.score).toBe(85);
    expect(out.architecture?.reason).toBe("clean");
  });
  it("strips markdown code fence", () => {
    const out = parseJudgeResponse("```json\n{\"readability\":{\"score\":50,\"reason\":\"\"},\"idiomaticity\":{\"score\":50,\"reason\":\"\"},\"architecture\":{\"score\":50,\"reason\":\"\"}}\n```");
    expect(out.present).toBe(true);
    expect(out.readability?.score).toBe(50);
  });
  it("returns present=false on malformed input", () => {
    expect(parseJudgeResponse("not json").present).toBe(false);
  });
  it("returns present=false on missing keys", () => {
    expect(parseJudgeResponse(`{"readability":{"score":80,"reason":""}}`).present).toBe(false);
  });
  it("clamps score to 0-100", () => {
    const out = parseJudgeResponse(`{"readability":{"score":150,"reason":""},"idiomaticity":{"score":-10,"reason":""},"architecture":{"score":50,"reason":""}}`);
    expect(out.readability?.score).toBe(100);
    expect(out.idiomaticity?.score).toBe(0);
  });
});

describe("pickJudgeSamples", () => {
  it("picks largest non-test source files up to budget", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "judge-pick-"));
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });
    await fs.writeFile(path.join(tmp, "src", "small.ts"), "x".repeat(100));
    await fs.writeFile(path.join(tmp, "src", "big.ts"), "y".repeat(2000));
    await fs.writeFile(path.join(tmp, "src", "huge.test.ts"), "z".repeat(5000));
    const samples = await pickJudgeSamples(tmp, 2);
    expect(samples).toHaveLength(2);
    expect(samples[0].path.endsWith("big.ts")).toBe(true);
    expect(samples.every(s => !s.path.endsWith(".test.ts"))).toBe(true);
  });
});
