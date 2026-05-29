import { ServiceDetectorAgent } from "@/lib/agents/infra/service-detector";
import type { RequiredServices } from "./types";

/**
 * Tech-stack detection. Uses an LLM classifier as the primary path (more
 * accurate for multi-store selection discussions in TRDs), with a regex
 * fallback for resilience: if the LLM fails or returns invalid output, we
 * still get a reasonable answer instead of provisioning nothing.
 *
 * Set INFRA_DETECT_REGEX_ONLY=1 to force the regex path (offline tests).
 */

const POSTGRES_PATTERNS = [
  /\bpostgres(?:ql)?\b/i,
  /\bpg\b/i,
  /\bprisma\b/i,
  /\bdrizzle\b/i,
  /\bsequelize\b/i,
  /\btypeorm\b/i,
  /\brelational\s+(?:db|database)\b/i,
];

const REDIS_PATTERNS = [
  /\bredis\b/i,
  /\bbullmq\b/i,
  /\bioredis\b/i,
  /\b(?:cache|session\s+store|rate\s*limit(?:er|ing)?|queue)\b/i,
];

function anyMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function detectRequiredServicesByRegex(
  designDocs: string,
): RequiredServices {
  return {
    needsPostgres: anyMatch(designDocs, POSTGRES_PATTERNS),
    needsRedis: anyMatch(designDocs, REDIS_PATTERNS),
  };
}

export interface DetectResult {
  services: RequiredServices;
  /** "llm" | "regex" — which path produced the answer. */
  source: "llm" | "regex";
  /** LLM evidence quotes (only set when source=llm). */
  evidence?: Array<{ service: string; quote: string }>;
  /** Cost of the LLM call when source=llm. */
  costUsd?: number;
  /** Reason regex fallback fired (only set when source=regex && LLM was attempted). */
  fallbackReason?: string;
}

export async function detectRequiredServices(
  designDocs: string,
): Promise<DetectResult> {
  if (
    process.env.INFRA_DETECT_REGEX_ONLY === "1" ||
    process.env.INFRA_DETECT_REGEX_ONLY === "true"
  ) {
    return {
      services: detectRequiredServicesByRegex(designDocs),
      source: "regex",
    };
  }
  try {
    const agent = new ServiceDetectorAgent();
    const r = await agent.detect(designDocs);
    if (r.ok && r.decision) {
      return {
        services: {
          needsPostgres: r.decision.needsPostgres,
          needsRedis: r.decision.needsRedis,
        },
        source: "llm",
        evidence: r.decision.evidence,
        costUsd: r.costUsd,
      };
    }
    return {
      services: detectRequiredServicesByRegex(designDocs),
      source: "regex",
      fallbackReason: (r.errors ?? ["unknown"]).join("; "),
    };
  } catch (e) {
    return {
      services: detectRequiredServicesByRegex(designDocs),
      source: "regex",
      fallbackReason: e instanceof Error ? e.message : String(e),
    };
  }
}
