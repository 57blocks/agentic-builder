/**
 * Preparation-phase recall helpers.
 *
 * Wrappers around `recallAndPrepareInject` for the PRD and Design steps.
 * These steps live before any code is generated, so they only consult L1
 * (cross-project) memory and use the phase-specific inject toggles
 * (`MEMORY_PRD_INJECT` / `MEMORY_DESIGN_INJECT`).
 *
 * The returned `block` is meant to be passed verbatim as the
 * `additionalContext` argument of the PRD / Design agent so it ends up at
 * the top of the user message, preserving the agent's existing system
 * prompt unchanged.
 *
 * Design recall additionally merges `design-knowledge` records from the 57B
 * design library, filtered by the detected industry vertical of the PRD.
 */

import {
  memoryInjectEnabledForPrd,
  memoryInjectEnabledForDesign,
} from "./env";
import { getSystemMemory } from "./index";
import { renderMemoryContext } from "./inject";
import { recallAndPrepareInject, type RecallContextResult } from "./recall-context";
import type { ProjectTier } from "../agents/shared/project-classifier";
import type { DesignIndustry } from "./knowledge/57b-library";

export interface PreparationRecallInput {
  sessionId: string;
  /** Free-form description of what the PRD/Design is being generated for. */
  featureBrief: string;
  /** Project tier — used as a tag filter so S-tier projects pull S-tier patterns. */
  tier?: ProjectTier;
  /** Optional project type / domain identifier (e.g. "calculator", "dashboard"). */
  projectType?: string;
  /** Optional project root for L2 memory; PRD/Design typically only use L1. */
  projectRoot?: string;
}

const TIER_TAG = (tier?: ProjectTier): string | undefined =>
  tier ? `tier:${tier}` : undefined;

const PROJECT_TYPE_TAG = (projectType?: string): string | undefined =>
  projectType ? `projectType:${projectType.toLowerCase().replace(/\s+/g, "-")}` : undefined;

function buildAnyTags(input: PreparationRecallInput): string[] {
  const any: string[] = [];
  const tier = TIER_TAG(input.tier);
  const projectType = PROJECT_TYPE_TAG(input.projectType);
  if (tier) any.push(tier);
  if (projectType) any.push(projectType);
  return any;
}

/**
 * Detect the industry vertical from free-form text (PRD or feature brief).
 * Returns null when no recognisable industry keywords are found, which causes
 * the design-knowledge recall to fall back to returning records without an
 * industry tag filter (all knowledge records).
 */
export function detectIndustry(text: string): DesignIndustry | null {
  const t = text.toLowerCase();
  if (
    /\b(ai|llm|gpt|ml\b|nlp|neural|machine[\s-]learning|computer[\s-]vision|generative|large[\s-]language|embedding|vector[\s-]search|agent[\s-]builder|agentic)\b/.test(
      t,
    )
  )
    return "ai";
  if (
    /\b(web3|blockchain|defi|nft|crypto|stablecoin|wallet|token|dao|dapp|smart[\s-]contract|layer[\s-]2|l2|l1|on[\s-]chain|off[\s-]chain|fintech|fin[\s-]tech|trading|lending[\s-]pool|yield|amm)\b/.test(
      t,
    )
  )
    return "fintech-web3";
  if (
    /\b(saas|dashboard|analytics|enterprise|b2b|admin[\s-]panel|management[\s-]platform|crm|erp|workflow|subscription|billing|multi[\s-]tenant)\b/.test(
      t,
    )
  )
    return "saas";
  return null;
}

/**
 * Wrap a recall block with a heading the PRD/Design agent prompt can
 * reliably target. Returns an empty string when the block is empty so
 * callers can safely concat without producing stray section headers.
 */
function wrapPatternBlock(phase: "PRD" | "Design", block: string): string {
  if (!block.trim()) return "";
  return [
    `## Lessons from past ${phase} generations`,
    "",
    `The following ${phase}-pattern records were recalled from memory because they match the current project's tier / domain. Treat them as soft hints — apply the ones that fit.`,
    "",
    block,
    "",
    `If you used any of the records above, declare it on the FIRST line of your output via:`,
    `  <memory-cite ids="${phase.toUpperCase()}-xxx,${phase.toUpperCase()}-yyy" />`,
    "",
  ].join("\n");
}

/**
 * Wrap the design-knowledge block (company style library + daily trends).
 */
function wrapKnowledgeBlock(knowledgeText: string, industry: DesignIndustry | null): string {
  if (!knowledgeText.trim()) return "";
  const industryLabel = industry
    ? ` (matched industry: ${industry})`
    : " (no industry match — using all available guides)";
  return [
    `## Company Design Guidelines${industryLabel}`,
    "",
    "The following style guidelines come from the 57B design knowledge library. Apply them when generating tokens, colors, typography, and component aesthetics. These are authoritative — prioritise them over generic defaults.",
    "",
    knowledgeText,
    "",
  ].join("\n");
}

export interface PreparationRecallResult extends RecallContextResult {
  /** Already wrapped block (with section header + cite hint), ready to splice. */
  contextChunk: string;
}

export async function recallPrdContext(
  input: PreparationRecallInput,
): Promise<PreparationRecallResult> {
  const any = buildAnyTags(input);
  const result = await recallAndPrepareInject({
    agent: "pm",
    role: "pm",
    task: {
      id: input.sessionId,
      title: input.featureBrief.slice(0, 80),
      description: input.featureBrief,
    },
    projectRoot: input.projectRoot,
    kickoffId: input.sessionId,
    layers: ["L1"],
    kinds: ["prd-pattern"],
    tokenBudget: 1500,
    injectEnabled: memoryInjectEnabledForPrd,
    ...(any.length > 0 ? { /* recall-context will not forward arbitrary tags; we rely on text */ } : {}),
  });
  void any;
  return { ...result, contextChunk: wrapPatternBlock("PRD", result.block) };
}

export async function recallDesignContext(
  input: PreparationRecallInput & { prdContent?: string },
): Promise<PreparationRecallResult> {
  // Use the PRD content (when available) as the recall query so design
  // patterns match the actual product the user is building, not just the
  // raw feature brief.
  const queryText = input.prdContent
    ? input.prdContent.slice(0, 600)
    : input.featureBrief;

  // 1. Recall design-pattern records (past session learnings)
  const patternResult = await recallAndPrepareInject({
    agent: "design",
    role: "designer",
    task: {
      id: input.sessionId,
      title: input.featureBrief.slice(0, 80),
      description: queryText,
    },
    projectRoot: input.projectRoot,
    kickoffId: input.sessionId,
    layers: ["L1"],
    kinds: ["design-pattern"],
    tokenBudget: 1500,
    injectEnabled: memoryInjectEnabledForDesign,
  });

  // 2. Detect industry and fetch matching design-knowledge records (57B library
  //    + daily refresh records). These records carry `manual:approved` so they
  //    bypass the score threshold in the normal recall path; here we query
  //    directly to apply industry-tag filtering.
  const industry = detectIndustry(queryText);
  let knowledgeBlock = "";

  if (memoryInjectEnabledForDesign()) {
    try {
      const knowledgeRecords = await getSystemMemory().recall({
        layer: "L1",
        kinds: ["design-knowledge"],
        tags: industry ? { any: [`industry:${industry}`] } : undefined,
        limit: 4,
      });

      if (knowledgeRecords.length > 0) {
        const rendered = renderMemoryContext(knowledgeRecords, {
          tokenBudget: 3000,
        });
        knowledgeBlock = wrapKnowledgeBlock(rendered.text, industry);
      }
    } catch (err) {
      console.warn(
        "[memory] recallDesignContext: design-knowledge fetch failed (skipping):",
        (err as Error).message,
      );
    }
  }

  // 3. Merge: knowledge block first (authoritative), then pattern block (hints)
  const sections = [knowledgeBlock, wrapPatternBlock("Design", patternResult.block)].filter(
    Boolean,
  );
  const contextChunk = sections.join("\n");

  return {
    ...patternResult,
    block: [patternResult.block, knowledgeBlock].filter(Boolean).join("\n\n"),
    contextChunk,
  };
}
