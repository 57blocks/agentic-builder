// src/lib/pipeline/prototype-scaffold.ts
import path from "path";
import {
  copyScaffold,
  resolveScaffoldTier,
  type ScaffoldTier,
  type CopyScaffoldResult,
} from "@/lib/pipeline/scaffold-copy";
import {
  prdSignalsBackend,
  normalizeProjectTier,
  parseTierFromPrd,
} from "@/lib/agents/shared/project-classifier";

/**
 * Resolve the tier BEFORE kickoff (no resourceRequirements / authDecision yet).
 * Mirrors coding's resolveTier: explicit arg → `parseTierFromPrd` (handles both
 * English `**Project Tier: X**` and Chinese `**X级**` / table-row badges) → default M,
 * then applies the S→M backend promotion.
 */
export function resolvePrototypeTier(
  prdContent: string,
  explicitTier?: string,
): { scopeTier: ScaffoldTier; scaffoldTier: ScaffoldTier } {
  const scope: ScaffoldTier = (
    explicitTier ? normalizeProjectTier(explicitTier) : parseTierFromPrd(prdContent) ?? "M"
  ) as ScaffoldTier;
  const scaffoldTier = resolveScaffoldTier(scope, prdSignalsBackend(prdContent));
  return { scopeTier: scope, scaffoldTier };
}

/** Where the frontend subtree lives for a given tier. S-tier is a single app at the root. */
export function resolveFrontendDir(outputRoot: string, tier: ScaffoldTier): string {
  return tier === "S" ? outputRoot : path.join(outputRoot, "frontend");
}

/**
 * Copy ONLY the base tier scaffold into the output tree. We deliberately pass
 * neither `resourceRequirements` nor `authDecision`, so `copyScaffold` never runs
 * `copyOptionalScaffolds` — the `_optional/` auth/feature layers (which need the
 * kickoff auth decision) are intentionally NOT applied here.
 */
export async function copyBaseScaffoldForPrototype(
  tier: ScaffoldTier,
  outputRoot: string,
): Promise<CopyScaffoldResult> {
  return copyScaffold(tier, outputRoot, { forceOverwrite: false });
}
