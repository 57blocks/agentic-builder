/**
 * Subsystem decomposer (Phase 1). Given a PRD's H2 section headings, an LLM
 * classifies them into distinct end-user subsystems (by role / persona /
 * bounded context) vs. cross-cutting "shared" sections (data model, API
 * contracts, glossary, auth, roles, NFR, error codes…).
 *
 * Classifying from the heading LIST (not the whole PRD body) keeps the call
 * cheap and reliable. Cross-vendor model (MODEL_CONFIG.prdReviewer) by default.
 * Defensive parse with an empty-plan fallback; a `chatCompletionImpl` seam
 * keeps unit tests hermetic.
 */

import { chatCompletion, resolveModel } from "@/lib/openrouter";
import type {
  ChatMessage,
  OpenRouterOptions,
  OpenRouterResponse,
} from "@/lib/llm-types";
import { MODEL_CONFIG } from "@/lib/model-config";
import type { SubsystemPlan, SubsystemDef } from "@/lib/pipeline/subsystem/types";

export const SUBSYSTEM_DECOMPOSER_PROMPT_VERSION = "v1-2026-06-02";

export interface DecomposeOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  chatCompletionImpl?: (
    messages: ChatMessage[],
    opts: OpenRouterOptions,
  ) => Promise<OpenRouterResponse>;
}

export interface DecomposeResult extends SubsystemPlan {
  model: string;
  promptVersion: string;
}

const SYSTEM_PROMPT = `You are a software architect. You are given the ordered list of H2 section headings of a large PRD. Identify the distinct END-USER SUBSYSTEMS the PRD describes (by role / persona / bounded context — e.g. a family portal, a teacher console, an admin back-office) and classify each heading.

Rules:
- A section is "shared" when it is cross-cutting and needed by every subsystem: glossary, product overview, users, scope, roles/permissions, information architecture, UI component library, auth, the full data model, enums, business rules, flows, state machines, storage contracts, third-party integrations, NFR, validation, acceptance, REST API endpoint design, entity-relationship, error codes, wireframe examples, performance.
- A section belongs to a SUBSYSTEM only when it is that subsystem's own page/feature spec (e.g. "家庭端模块详细规格" → family).
- Every subsystem depends on "shared".
- Use the heading lines VERBATIM (copy the exact "## …" text).

Output STRICT JSON, no commentary, no fences:
{
  "subsystems": [
    { "id": "family", "name": "家庭端", "summary": "…", "sectionHeadings": ["## 10. 家庭端模块详细规格 (FR-045)"], "dependsOn": ["shared"] }
  ],
  "sharedHeadings": ["## 13. 完整数据模型 (FR-285)", "..."],
  "notes": "one sentence"
}`;

export async function decomposeSubsystems(
  headings: string[],
  opts: DecomposeOptions = {},
): Promise<DecomposeResult> {
  // Cross-vendor reviewer model (claude-sonnet-4) — reuse the trdReviewer slot
  // which exists in every MODEL_CONFIG variant; override via opts.model.
  const modelId = opts.model ?? MODEL_CONFIG.trdReviewer ?? "claude-sonnet-4";
  const model = resolveModel(modelId);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `PRD H2 headings (in order):\n\n${headings.join("\n")}\n\nClassify them. Output the strict JSON now.`,
    },
  ];

  const complete = opts.chatCompletionImpl ?? chatCompletion;
  const response = await complete(messages, {
    model,
    temperature: opts.temperature ?? 0,
    max_tokens: opts.maxTokens ?? 4000,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const plan = parseDecomposeResponse(raw, headings);

  return { ...plan, model: response.model, promptVersion: SUBSYSTEM_DECOMPOSER_PROMPT_VERSION };
}

function asString(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : fb;
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function parseDecomposeResponse(raw: string, allHeadings: string[]): SubsystemPlan {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return emptyPlan(allHeadings, "parser_no_json");
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return emptyPlan(allHeadings, "parser_invalid_json");
  }

  const subsystems: SubsystemDef[] = (Array.isArray(obj.subsystems) ? obj.subsystems : [])
    .map((rawS, i): SubsystemDef | null => {
      if (!rawS || typeof rawS !== "object") return null;
      const o = rawS as Record<string, unknown>;
      const sectionHeadings = asStringArray(o.sectionHeadings);
      if (sectionHeadings.length === 0) return null;
      const name = asString(o.name).trim() || `subsystem-${i + 1}`;
      return {
        id: (asString(o.id).trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-+|-+$/g, "") || `sub-${i + 1}`,
        name,
        summary: asString(o.summary),
        sectionHeadings,
        dependsOn: asStringArray(o.dependsOn).length ? asStringArray(o.dependsOn) : ["shared"],
      };
    })
    .filter((s): s is SubsystemDef => s !== null);

  return {
    subsystems,
    sharedHeadings: asStringArray(obj.sharedHeadings),
    notes: asString(obj.notes) || undefined,
  };
}

/** Fallback: everything shared, no subsystems (caller treats as "do not split"). */
function emptyPlan(allHeadings: string[], reason: string): SubsystemPlan {
  return { subsystems: [], sharedHeadings: allHeadings, notes: `decomposer unparseable (${reason})` };
}
