import type { ProjectTier } from "@/lib/agents/shared/project-classifier";

export type PrdKnowledgeStatus = "pending" | "active" | "deprecated";

export interface PrdKnowledgeRecord {
  schemaVersion: 1;
  industry: string;
  productType: string;
  tier: ProjectTier;
  title: string;
  summary: string;
  sections: {
    background?: string;
    userStories?: string[];
    functionalRequirements?: string[];
    nonFunctional?: string[];
    metrics?: string[];
    outOfScope?: string[];
  };
  fullPrd: string;
  sourceProjectId?: string;
  status: PrdKnowledgeStatus;
}

export const PRD_KNOWLEDGE_STATUSES = ["pending", "active", "deprecated"] as const;

/**
 * Official industry enum used by both the LLM extractor (see extract.ts prompt)
 * and the filter UI. Keep these two in sync — extract.ts must list all of
 * these as the allowed `industry` values.
 */
export const KNOWN_PRD_INDUSTRIES = [
  "saas",
  "fintech",
  "ai-tools",
  "ecommerce",
  "devtools",
  "social",
  "generic",
] as const;

export type KnownPrdIndustry = (typeof KNOWN_PRD_INDUSTRIES)[number];

export function buildPrdKnowledgeTags(input: {
  industry: string;
  productType: string;
  tier: ProjectTier;
  status: PrdKnowledgeStatus;
}): string[] {
  return [
    `industry:${input.industry}`,
    `productType:${input.productType.toLowerCase().replace(/\s+/g, "-")}`,
    `tier:${input.tier}`,
    `phase:prd`,
    `status:${input.status}`,
    `kind:prd-knowledge`,
  ];
}
