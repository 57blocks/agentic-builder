import { chatCompletion, resolveModel, type ChatMessage } from "@/lib/openrouter";
import { MODEL_CONFIG } from "@/lib/model-config";
import type { PrdKnowledgeRecord } from "./types";
import type { ProjectTier } from "@/lib/agents/shared/project-classifier";

const MAX_PRD_CHARS = 8000;

const SYSTEM_PROMPT = `You convert a finalised PRD into a structured "PRD knowledge" JSON record.

INPUTS:
- The full final PRD markdown (post user edit).
- The project type hint and tier (S / standard / L style label).

OUTPUT — strictly valid JSON, no preamble, no code fences:
{
  "industry": "saas" | "fintech" | "ai-tools" | "ecommerce" | "devtools" | "social" | "generic",
  "productType": "<short lowercase phrase, e.g. 'dashboard', 'marketplace'>",
  "title": "<≤80 char human-readable case title>",
  "summary": "<2-3 short sentences describing what this product is and the most distinctive aspect of the PRD>",
  "sections": {
    "background": "<optional one-paragraph background>",
    "userStories": ["<each story as one string>"],
    "functionalRequirements": ["<bullet>"],
    "nonFunctional": ["<bullet>"],
    "metrics": ["<bullet>"],
    "outOfScope": ["<bullet>"]
  }
}

Rules:
- If the PRD does not contain a section, omit that key (don't emit empty arrays).
- Keep each bullet ≤ 200 chars.
- Output JSON only — no markdown.`;

export interface ExtractInput {
  finalPrd: string;
  projectType: string;
  tier: ProjectTier;
}

export async function extractPrdKnowledge(
  input: ExtractInput,
): Promise<Omit<PrdKnowledgeRecord, "fullPrd" | "sourceProjectId" | "status" | "schemaVersion"> | null> {
  const truncatedPrd =
    input.finalPrd.length > MAX_PRD_CHARS
      ? input.finalPrd.slice(0, MAX_PRD_CHARS) + "\n... (truncated)"
      : input.finalPrd;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Project type hint: ${input.projectType}\nTier: ${input.tier}\n\n## PRD\n${truncatedPrd}`,
    },
  ];

  try {
    const model = resolveModel(MODEL_CONFIG.qa);
    const response = await chatCompletion(messages, {
      model,
      temperature: 0.2,
      max_tokens: 1200,
    });
    const raw = response.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) return null;
    const parsed = safeParse(raw);
    if (!parsed) return null;

    return {
      industry: typeof parsed.industry === "string" && parsed.industry.length > 0 ? parsed.industry : "generic",
      productType:
        typeof parsed.productType === "string" && parsed.productType.length > 0
          ? parsed.productType
          : input.projectType,
      tier: input.tier,
      title:
        typeof parsed.title === "string" && parsed.title.length > 0
          ? parsed.title.slice(0, 120)
          : `${input.tier} ${input.projectType} PRD`,
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 600) : "",
      sections: sanitizeSections(parsed.sections ?? {}),
    };
  } catch (err) {
    console.warn("[memory] extractPrdKnowledge failed:", (err as Error).message);
    return null;
  }
}

function safeParse(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    const value = JSON.parse(cleaned);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function sanitizeSections(input: unknown): PrdKnowledgeRecord["sections"] {
  const sections: PrdKnowledgeRecord["sections"] = {};
  if (typeof input !== "object" || input === null) return sections;
  const obj = input as Record<string, unknown>;
  if (typeof obj.background === "string") sections.background = obj.background.slice(0, 1200);
  for (const key of ["userStories", "functionalRequirements", "nonFunctional", "metrics", "outOfScope"] as const) {
    const val = obj[key];
    if (Array.isArray(val)) {
      const list = val.filter((x): x is string => typeof x === "string" && x.length > 0).map((s) => s.slice(0, 300));
      if (list.length > 0) sections[key] = list;
    }
  }
  return sections;
}
