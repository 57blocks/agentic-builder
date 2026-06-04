/**
 * Feature-checklist audit — L3 judge (functional LLM verdict).
 *
 * L1 (structural) and L2 (anchor scan) in `feature-checklist-audit.ts` can only
 * see whether a covering task produced files and whether the requirement id (or
 * an alias) appears textually in the source. That leaves a noisy `partial`
 * bucket: tasks DID produce files, but no literal anchor was found — the feature
 * might be fully implemented (just no `// FR-X` comment) OR a stub was shipped
 * (a button with an empty handler). L1/L2 cannot tell these apart.
 *
 * L3 closes that gap. For each `partial` id it hands the LLM the actual code the
 * covering tasks produced and asks for a FUNCTIONAL verdict:
 *
 *   - implemented — a real, working code path satisfies the requirement.
 *   - wiring      — the control/element EXISTS but its behaviour is dead (empty
 *                   handler, no onClick/onSubmit, a TODO, a no-op). This is the
 *                   "placed a button, never implemented it" class.
 *   - missing     — no real implementation in the provided code.
 *
 * The verdict + a `category` (coverage | wiring) feed straight into the existing
 * repair dispatcher, which already routes `wiring` gaps to different fix
 * instructions than `coverage` gaps (see audit-repair-dispatch.ts).
 *
 * Cost is naturally bounded: the judge ONLY runs when there are `partial`
 * entries (a clean L2 ⇒ zero LLM calls), files are capped per batch, and the
 * whole thing is behind a kill switch (`FEATURE_AUDIT_L3=0`). Parsing is
 * defensive — any failure degrades to "leave the L2 verdict untouched" rather
 * than throwing, so L3 can never make the audit worse than L2 alone.
 */

import fs from "fs/promises";
import path from "path";
import {
  chatCompletion,
  resolveModel,
  estimateCost,
} from "@/lib/openrouter";
import type {
  ChatMessage,
  OpenRouterOptions,
  OpenRouterResponse,
} from "@/lib/llm-types";
import { MODEL_CONFIG } from "@/lib/model-config";

export type JudgeVerdict = "implemented" | "partial" | "missing";
export type JudgeCategory = "coverage" | "wiring";

/** One requirement to be judged, with the code its covering tasks produced. */
export interface JudgeFeatureEntry {
  id: string;
  /** Human labels (page/component name, route, alias) to orient the judge. */
  labels: string[];
  coveringTaskIds: string[];
  /** Relative paths the covering tasks created/modified. */
  candidateFiles: string[];
}

export interface JudgeFeatureVerdict {
  id: string;
  verdict: JudgeVerdict;
  category: JudgeCategory;
  reason: string;
  /** file:line-ish evidence strings (for implemented/wiring verdicts). */
  evidence: string[];
}

export interface JudgeFeatureEntriesInput {
  entries: JudgeFeatureEntry[];
  outputDir: string;
  /** Override model id (defaults to MODEL_CONFIG.featureAuditJudge). */
  model?: string;
  /** Ids per LLM call (default 20). */
  batchSize?: number;
  /** Max candidate files read per batch (default 30). */
  maxFilesPerBatch?: number;
  /** Max bytes read from a single file (default 8000). */
  maxBytesPerFile?: number;
  /** Test seam: inject a chat-completion impl to keep unit tests hermetic. */
  chatCompletionImpl?: (
    messages: ChatMessage[],
    opts: OpenRouterOptions,
  ) => Promise<OpenRouterResponse>;
}

export interface JudgeFeatureEntriesResult {
  /** id → functional verdict. Ids the judge could not rule on are absent. */
  verdicts: Map<string, JudgeFeatureVerdict>;
  ran: boolean;
  reason?: string;
  model?: string;
  costUsd: number;
  durationMs: number;
}

const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
  ".html",
]);

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_FILES_PER_BATCH = 30;
const DEFAULT_MAX_BYTES_PER_FILE = 8_000;

export function isL3Enabled(): boolean {
  const raw = (process.env.FEATURE_AUDIT_L3 ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

const SYSTEM_PROMPT = `You are a strict code auditor. For each PRD requirement you are given the code its tasks produced. Decide whether the requirement is FUNCTIONALLY implemented — not merely mentioned.

Verdicts:
- "implemented": there is a real, working code path for the requirement (a component that renders AND wires its actions, a route that is registered, a handler that calls the real API / updates state, a service/model that backs it).
- "wiring": the UI control or element EXISTS but its behaviour is dead or missing — an empty handler, no onClick/onSubmit, a TODO/placeholder, a button that does nothing. The feature is half-built: present but inert.
- "missing": no real implementation of the requirement is present in the provided code.

Category:
- "wiring" for a "wiring" verdict (control exists, behaviour dead).
- "coverage" otherwise (feature absent or only partially built at the data/logic layer).

Rules:
- Judge ONLY from the code provided. Do not assume code you cannot see exists.
- "implemented" REQUIRES concrete evidence — cite file:line (or file and a short quote) in evidence[].
- A mere import, a string literal, a comment, or a type definition is NOT implementation.
- Be strict: when in doubt between implemented and wiring, choose "wiring".

## Output — STRICT JSON, no commentary, no markdown fences
{
  "verdicts": [
    {
      "id": "the requirement id, exactly as given",
      "verdict": "implemented | wiring | missing",
      "category": "coverage | wiring",
      "reason": "one sentence, concrete",
      "evidence": ["path/to/file.tsx:42 — short quote", "..."]
    }
  ]
}
Output ONLY the JSON object. Every id you were given MUST appear exactly once.`;

function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

function isScannable(rel: string): boolean {
  return SCAN_EXTENSIONS.has(path.extname(rel).toLowerCase());
}

async function readCappedFiles(
  outputDir: string,
  relPaths: string[],
  maxFiles: number,
  maxBytesPerFile: number,
): Promise<Array<{ path: string; content: string }>> {
  const seen = new Set<string>();
  const out: Array<{ path: string; content: string }> = [];
  for (const rel of relPaths) {
    if (out.length >= maxFiles) break;
    const norm = rel.replace(/\\/g, "/");
    if (seen.has(norm) || !isScannable(norm)) continue;
    seen.add(norm);
    try {
      const buf = await fs.readFile(path.join(outputDir, norm), "utf-8");
      const content =
        buf.length > maxBytesPerFile
          ? buf.slice(0, maxBytesPerFile) + "\n/* …truncated… */"
          : buf;
      out.push({ path: norm, content });
    } catch {
      // unreadable / deleted — skip; the judge sees one fewer file
    }
  }
  return out;
}

function buildUserMessage(
  batch: JudgeFeatureEntry[],
  files: Array<{ path: string; content: string }>,
): string {
  const reqLines = batch.map((e) => {
    const labels = e.labels.filter((l) => l && l.length > 0).slice(0, 6);
    const labelStr = labels.length ? ` — look for: ${labels.join(", ")}` : "";
    return `- ${e.id}${labelStr} (tasks: ${e.coveringTaskIds.join(", ") || "n/a"})`;
  });
  const fileBlocks = files.map(
    (f) => `### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``,
  );
  return [
    "## Requirements to judge",
    "",
    reqLines.join("\n"),
    "",
    "## Code produced by the covering tasks",
    "",
    files.length > 0 ? fileBlocks.join("\n\n") : "(no readable files were produced)",
    "",
    "Render the strict JSON verdict for EVERY requirement id above now.",
  ].join("\n");
}

function asVerdict(v: unknown): JudgeVerdict | null {
  const s = String(v ?? "").toLowerCase();
  if (s === "implemented" || s === "missing" || s === "partial") return s;
  // The prompt uses "wiring" as a verdict word; map it to the audit's `partial`
  // verdict while the category carries the wiring distinction.
  if (s === "wiring") return "partial";
  return null;
}

function asCategory(v: unknown, verdict: JudgeVerdict, rawVerdict: unknown): JudgeCategory {
  const s = String(v ?? "").toLowerCase();
  if (s === "wiring" || s === "coverage") return s;
  // Fall back: a "wiring" verdict word implies the wiring category.
  if (String(rawVerdict ?? "").toLowerCase() === "wiring") return "wiring";
  return verdict === "implemented" ? "coverage" : "coverage";
}

function asStringArray(v: unknown, cap = 5): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : String(x ?? "")))
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, cap);
}

/** Defensive parser — exported for tests. Returns id → verdict. */
export function parseJudgeResponse(raw: string): Map<string, JudgeFeatureVerdict> {
  const out = new Map<string, JudgeFeatureVerdict>();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return out;
  }
  const arr = (parsed as Record<string, unknown>)?.verdicts;
  if (!Array.isArray(arr)) return out;
  for (const raw0 of arr) {
    if (!raw0 || typeof raw0 !== "object") continue;
    const o = raw0 as Record<string, unknown>;
    const id = String(o.id ?? "").trim().toUpperCase();
    if (!id) continue;
    const verdict = asVerdict(o.verdict);
    if (!verdict) continue;
    out.set(id, {
      id,
      verdict,
      category: asCategory(o.category, verdict, o.verdict),
      reason: String(o.reason ?? "").trim() || "(no reason given)",
      evidence: asStringArray(o.evidence),
    });
  }
  return out;
}

/**
 * Run the L3 functional judge over a set of `partial` requirement entries.
 * Naturally a no-op (ran=false, zero cost) when disabled or given no entries.
 */
export async function judgeFeatureEntries(
  input: JudgeFeatureEntriesInput,
): Promise<JudgeFeatureEntriesResult> {
  const verdicts = new Map<string, JudgeFeatureVerdict>();
  const startMs = Date.now();

  if (!isL3Enabled()) {
    return { verdicts, ran: false, reason: "FEATURE_AUDIT_L3 disabled", costUsd: 0, durationMs: 0 };
  }
  if (input.entries.length === 0) {
    return { verdicts, ran: false, reason: "no partial entries to judge", costUsd: 0, durationMs: 0 };
  }

  const modelId = input.model ?? MODEL_CONFIG.featureAuditJudge;
  const model = resolveModel(modelId);
  const complete = input.chatCompletionImpl ?? chatCompletion;
  const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxFiles = input.maxFilesPerBatch ?? DEFAULT_MAX_FILES_PER_BATCH;
  const maxBytes = input.maxBytesPerFile ?? DEFAULT_MAX_BYTES_PER_FILE;

  let costUsd = 0;
  let resolvedModel = model;

  for (const batch of chunk(input.entries, batchSize)) {
    // Candidate files = union of every covering task's produced files in this batch.
    const candidateFiles: string[] = [];
    for (const e of batch) candidateFiles.push(...e.candidateFiles);
    const files = await readCappedFiles(
      input.outputDir,
      candidateFiles,
      maxFiles,
      maxBytes,
    );

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(batch, files) },
    ];
    const callOpts: OpenRouterOptions = {
      model,
      temperature: 0,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    };

    try {
      const response = await complete(messages, callOpts);
      resolvedModel = response.model || model;
      costUsd += estimateCost(response.model, response.usage);
      const raw = response.choices[0]?.message?.content ?? "";
      const batchVerdicts = parseJudgeResponse(raw);
      // Only accept verdicts for ids actually in this batch.
      const batchIds = new Set(batch.map((e) => e.id.toUpperCase()));
      for (const [id, v] of batchVerdicts) {
        if (batchIds.has(id)) verdicts.set(id, v);
      }
    } catch (err) {
      // A failed batch leaves its entries at their L2 verdict — never throw.
      console.warn(
        `[FeatureAudit:L3] batch judge failed (kept L2 verdict): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    verdicts,
    ran: true,
    model: resolvedModel,
    costUsd,
    durationMs: Date.now() - startMs,
  };
}
