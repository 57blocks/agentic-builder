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
import { condenseStyleSpecForRecall } from "./knowledge/style-spec/compose-body";
import type { MemoryRecord } from "./types";

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
 * Wrap the design-knowledge block (company style library + Style Specs).
 */
function wrapKnowledgeBlock(knowledgeText: string, industry: DesignIndustry | null): string {
  if (!knowledgeText.trim()) return "";
  const industryLabel = industry
    ? ` (matched industry: ${industry})`
    : " (no exact industry match — using best-fit guides)";
  return [
    `## Design Knowledge Base${industryLabel}`,
    "",
    "The following records come from the 57B design knowledge library and from AI-analysed reference screenshots (Style Specs). Each Style Spec includes a colour palette, typography, spacing, radius, CSS variables and named UI element regions derived from a real product screenshot.",
    "",
    "When generating the Design System Spec:",
    "- Use the palette hex values, font names and spacing scale from the closest-matching Style Spec as primary design tokens.",
    "- Apply the component descriptions and layout patterns as structural guidance.",
    "- The CSS variables block (`:root { … }`) can be used verbatim in generated CSS.",
    "- Treat these records as **authoritative references** — override generic LLM defaults with the concrete values found here.",
    "",
    knowledgeText,
    "",
  ].join("\n");
}

export interface PreparationRecallResult extends RecallContextResult {
  /** Already wrapped block (with section header + cite hint), ready to splice. */
  contextChunk: string;
  /** IDs of design-knowledge records injected into the prompt (for UI display). */
  recalledKnowledgeIds?: string[];
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
  //    + Style Specs from vision-distill and trend-capture).
  const industry = detectIndustry(queryText);
  console.log(
    `[memory:design-recall] inject=${memoryInjectEnabledForDesign()} detectedIndustry=${industry ?? "none"} queryLen=${queryText.length}`,
  );
  let knowledgeBlock = "";
  let recalledKnowledgeIds: string[] = [];

  if (memoryInjectEnabledForDesign()) {
    try {
      // Primary pass: recall records that match the detected industry.
      // When industry is unknown, pull records tagged `industry:generic` plus
      // the 57B library records (which cover all three industries) rather than
      // flooding the context with every Style Spec from every industry.
      const primaryTags = industry
        ? { any: [`industry:${industry}`] }
        : { any: ["source:57b-guidelines", "industry:generic"] };

      let knowledgeRecords = await getSystemMemory().recall({
        layer: "L1",
        kinds: ["design-knowledge"],
        tags: primaryTags,
        limit: 6,
      });

      // Fallback: if primary pass yields fewer than 2 records, widen to all
      // design-knowledge (the ranking will still surface the best-scoring ones).
      if (knowledgeRecords.length < 2) {
        knowledgeRecords = await getSystemMemory().recall({
          layer: "L1",
          kinds: ["design-knowledge"],
          limit: 6,
        });
      }

      console.log(
        `[memory:design-recall] recalled ${knowledgeRecords.length} design-knowledge records: [${knowledgeRecords.map((r) => r.id).join(", ")}]`,
      );
      recalledKnowledgeIds = knowledgeRecords.map((r) => r.id);

      if (knowledgeRecords.length > 0) {
        // Style Spec and trend-capture records embed a full HTML preview that
        // is great for the UI but blows past the 3000-token inject budget.
        // Replace the body with a condensed view (Markdown + CSS variables)
        // before rendering so each record stays under ~2KB.
        const trimmedRecords: MemoryRecord[] = knowledgeRecords.map((r) =>
          r.tags.includes("source:vision-distill") ||
          r.tags.includes("source:trend-capture") ||
          r.tags.includes("source:daily-refresh")
            ? { ...r, body: condenseStyleSpecForRecall(r.body) }
            : r,
        );
        const rendered = renderMemoryContext(trimmedRecords, {
          tokenBudget: 4000,
        });
        knowledgeBlock = wrapKnowledgeBlock(rendered.text, industry);
        console.log(
          `[memory:design-recall] knowledge block size=${rendered.text.length} chars`,
        );
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
    recalledKnowledgeIds,
  };
}
