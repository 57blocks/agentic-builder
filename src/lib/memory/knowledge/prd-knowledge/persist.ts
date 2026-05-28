import { getSystemMemory } from "@/lib/memory";
import type { MemorySource } from "@/lib/memory/types";
import type { ProjectTier } from "@/lib/agents/shared/project-classifier";
import { extractPrdKnowledge } from "./extract";
import { buildPrdKnowledgeTags, type PrdKnowledgeRecord } from "./types";

export class PrdKnowledgeDuplicateError extends Error {
  constructor(public existingId: string) {
    super(`prd-knowledge already exists for this kickoff (id=${existingId})`);
    this.name = "PrdKnowledgeDuplicateError";
  }
}

export class PrdKnowledgeExtractError extends Error {
  constructor(message = "LLM extraction returned no usable result") {
    super(message);
    this.name = "PrdKnowledgeExtractError";
  }
}

export interface PersistPrdKnowledgeInput {
  finalPrd: string;
  projectType: string;
  tier: ProjectTier;
  source: MemorySource;
  sourceProjectId?: string;
  kickoffId?: string;
  /** When true and kickoffId is set, throws PrdKnowledgeDuplicateError if a record already exists for this kickoff. */
  idempotencyCheck?: boolean;
}

export interface PersistPrdKnowledgeResult {
  id: string;
  record: PrdKnowledgeRecord;
}

export async function persistPrdKnowledge(
  input: PersistPrdKnowledgeInput,
): Promise<PersistPrdKnowledgeResult> {
  const memory = getSystemMemory();

  if (input.idempotencyCheck && input.kickoffId) {
    const existing = await memory.recall({
      layer: "L1",
      kinds: ["prd-knowledge"],
      kickoffId: input.kickoffId,
      limit: 1,
    });
    if (existing.length > 0) {
      throw new PrdKnowledgeDuplicateError(existing[0].id);
    }
  }

  const extracted = await extractPrdKnowledge({
    finalPrd: input.finalPrd,
    projectType: input.projectType,
    tier: input.tier,
  });
  if (!extracted) {
    throw new PrdKnowledgeExtractError();
  }

  const record: PrdKnowledgeRecord = {
    schemaVersion: 1,
    ...extracted,
    fullPrd: input.finalPrd,
    sourceProjectId: input.sourceProjectId,
    status: "pending",
  };

  const saved = await memory.save({
    layer: "L1",
    kind: "prd-knowledge",
    title: extracted.title,
    body: JSON.stringify(record),
    tags: buildPrdKnowledgeTags({
      industry: extracted.industry,
      productType: extracted.productType,
      tier: input.tier,
      status: "pending",
    }),
    source: input.source,
    refs: input.kickoffId ? { kickoffId: input.kickoffId } : {},
    metrics: { score: 0 },
  });

  return { id: saved.id, record };
}
