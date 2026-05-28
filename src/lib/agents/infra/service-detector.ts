import { z } from "zod";
import { BaseAgent } from "../shared/base-agent";
import { MODEL_CONFIG } from "@/lib/model-config";

/**
 * Infrastructure tech-stack classifier.
 *
 * Given a project's TRD + SystemDesign + ImplGuide, return a strict JSON
 * indicating which managed services the kickoff pipeline should provision.
 * Output schema is constrained — anything outside it falls back to
 * regex detection in `kickoff-infra/detect.ts`.
 */

const SYSTEM_PROMPT = `You are an Infrastructure Classifier Agent.

Read the provided TRD / System Design / Implementation Guide and decide which
managed backing services the project will actually need at runtime.

Output STRICT JSON — no prose, no markdown fences:
{
  "needsPostgres": true|false,
  "needsRedis":    true|false,
  "evidence": [
    { "service": "postgres"|"redis", "quote": "<≤120 chars from the docs>" }
  ]
}

Rules:
- A service is needed only if the project will ACTUALLY USE it at runtime — not
  if it's only mentioned in passing or compared in a tech selection discussion.
- Redis is needed only when the project requires cache, session store, queue,
  rate-limiting, or pub/sub. Mentioning "Redis" in passing is not enough.
- Every "true" decision MUST have at least one matching evidence entry.
- "false" decisions should have no evidence entries for that service.
- Quotes must come from the input docs verbatim (or trimmed to ≤120 chars).`;

const EvidenceSchema = z.object({
  service: z.enum(["postgres", "redis"]),
  quote: z.string().min(1).max(200),
});

const ServiceDecisionSchema = z
  .object({
    needsPostgres: z.boolean(),
    needsRedis: z.boolean(),
    evidence: z.array(EvidenceSchema).default([]),
  })
  .superRefine((d, ctx) => {
    for (const svc of ["postgres", "redis"] as const) {
      const flag = svc === "postgres" ? d.needsPostgres : d.needsRedis;
      const has = d.evidence.some((e) => e.service === svc);
      if (flag && !has) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `needs${svc[0].toUpperCase()}${svc.slice(1)}=true but no evidence entry for ${svc}`,
        });
      }
    }
  });

export type ServiceDecision = z.infer<typeof ServiceDecisionSchema>;

function stripCodeFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  return t;
}

function extractJson(s: string): string {
  const cleaned = stripCodeFence(s);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
}

export interface ServiceDetectorResult {
  ok: boolean;
  decision?: ServiceDecision;
  errors?: string[];
  rawContent?: string;
  costUsd?: number;
}

export class ServiceDetectorAgent extends BaseAgent {
  constructor() {
    super({
      name: "Service Detector",
      role: "Infra Classifier",
      systemPrompt: SYSTEM_PROMPT,
      defaultModel: MODEL_CONFIG.serviceDetect,
      temperature: 0.0,
      maxTokens: 1024,
    });
  }

  async detect(designDocs: string): Promise<ServiceDetectorResult> {
    if (!designDocs.trim()) {
      return { ok: false, errors: ["empty designDocs"] };
    }
    const result = await this.run(
      "Classify the required managed services. Respond with JSON only.",
      designDocs,
      "step-service-detect",
    );
    const raw = extractJson(result.content);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return {
        ok: false,
        errors: [`invalid JSON: ${(e as Error).message}`],
        rawContent: result.content,
        costUsd: result.costUsd,
      };
    }
    const safe = ServiceDecisionSchema.safeParse(parsed);
    if (!safe.success) {
      return {
        ok: false,
        errors: safe.error.issues.map((i) => i.message),
        rawContent: result.content,
        costUsd: result.costUsd,
      };
    }
    return {
      ok: true,
      decision: safe.data,
      rawContent: result.content,
      costUsd: result.costUsd,
    };
  }
}
