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
