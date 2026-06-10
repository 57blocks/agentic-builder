/**
 * LLM-based code-quality judge. Samples a handful of source files from the
 * generated-code workspaces and asks a strong cross-vendor model to rate
 * readability / idiomaticity / architecture on a 0–100 rubric.
 *
 * Best-effort: any failure returns `present: false`; the report writer must
 * NOT throw.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { MODEL_CONFIG, resolveModelChain } from "@/lib/model-config";
import {
  chatCompletionWithFallback,
  estimateCost,
  resolveModel,
  type ChatMessage,
} from "@/lib/openrouter";
import { recordCodingSessionLlmUsage } from "@/lib/pipeline/coding-session-report";

export interface JudgeRating {
  score: number;
  reason: string;
}

export interface CodeQualityJudgeResult {
  present: boolean;
  readability?: JudgeRating;
  idiomaticity?: JudgeRating;
  architecture?: JudgeRating;
  sampledFiles?: string[];
  model?: string;
  costUsd?: number;
  error?: string;
}

export interface JudgeSample {
  path: string;
  size: number;
  content: string;
}

const MAX_SAMPLES_DEFAULT = 8;
const MAX_FILE_BYTES = 12_000;

export function parseJudgeResponse(raw: string): CodeQualityJudgeResult {
  const trimmed = raw
    .replace(/^```(?:json)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { return { present: false, error: "invalid JSON" }; }
  if (!parsed || typeof parsed !== "object") return { present: false, error: "not an object" };
  const obj = parsed as Record<string, { score?: number; reason?: string }>;
  for (const k of ["readability", "idiomaticity", "architecture"] as const) {
    if (!obj[k] || typeof obj[k].score !== "number") return { present: false, error: `missing ${k}` };
  }
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    present: true,
    readability:  { score: clamp(obj.readability.score as number),  reason: obj.readability.reason ?? "" },
    idiomaticity: { score: clamp(obj.idiomaticity.score as number), reason: obj.idiomaticity.reason ?? "" },
    architecture: { score: clamp(obj.architecture.score as number), reason: obj.architecture.reason ?? "" },
  };
}

export async function pickJudgeSamples(workspaceRoot: string, maxFiles = MAX_SAMPLES_DEFAULT): Promise<JudgeSample[]> {
  const candidates: Array<{ path: string; size: number }> = [];
  await walk(workspaceRoot, candidates);
  candidates.sort((a, b) => b.size - a.size);
  const out: JudgeSample[] = [];
  for (const c of candidates) {
    if (out.length >= maxFiles) break;
    const buf = await fs.readFile(c.path, "utf-8");
    out.push({ path: c.path, size: c.size, content: buf.slice(0, MAX_FILE_BYTES) });
  }
  return out;
}

async function walk(dir: string, out: Array<{ path: string; size: number }>): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "dist" || e.name === "build") continue;
      await walk(full, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.(ts|tsx)$/.test(e.name)) {
      const stat = await fs.stat(full);
      out.push({ path: full, size: stat.size });
    }
  }
}

export interface JudgeOptions {
  outputDir: string;
  sessionId: string;
  maxFiles?: number;
}

const SYSTEM_PROMPT = `You are an expert code reviewer. Rate the provided code on three independent dimensions, each 0–100:
- readability: naming, function length, comment quality, structural clarity
- idiomaticity: correct framework / language idioms (React hooks, TS types, error handling patterns)
- architecture: module responsibility, coupling, layering, abstraction

Respond with STRICT JSON only:
{"readability":{"score":<int>,"reason":"<one sentence>"},"idiomaticity":{"score":<int>,"reason":"<one sentence>"},"architecture":{"score":<int>,"reason":"<one sentence>"}}`;

export async function judgeCodeQuality(opts: JudgeOptions): Promise<CodeQualityJudgeResult> {
  try {
    const roots: string[] = [];
    for (const name of ["frontend", "backend"]) {
      const p = path.join(opts.outputDir, name);
      try { await fs.access(path.join(p, "package.json")); roots.push(p); } catch {}
    }
    if (roots.length === 0) roots.push(opts.outputDir);

    const max = opts.maxFiles ?? MAX_SAMPLES_DEFAULT;
    const perRoot = Math.max(1, Math.floor(max / roots.length));
    const samples: JudgeSample[] = [];
    for (const r of roots) {
      const picks = await pickJudgeSamples(r, perRoot);
      samples.push(...picks);
    }
    if (samples.length === 0) return { present: false, error: "no source files" };

    const userPrompt = samples
      .map((s) => `### ${path.relative(opts.outputDir, s.path)}\n\`\`\`\n${s.content}\n\`\`\``)
      .join("\n\n");

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];

    const chain = resolveModelChain(
      MODEL_CONFIG.qualityJudge,
      resolveModel,
    );
    const response = await chatCompletionWithFallback(messages, chain, {
      temperature: 0,
      response_format: { type: "json_object" },
    });
    const content = response.choices?.[0]?.message?.content ?? "";
    const costUsd = estimateCost(response.model, response.usage);
    recordCodingSessionLlmUsage({
      sessionId: opts.sessionId,
      stage: "quality_judge",
      model: response.model,
      costUsd,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    });
    const parsed = parseJudgeResponse(content);
    return { ...parsed, sampledFiles: samples.map((s) => s.path), model: response.model, costUsd };
  } catch (err) {
    return { present: false, error: err instanceof Error ? err.message : String(err) };
  }
}
