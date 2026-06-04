/**
 * A — top-level driver that ties the whole subsystem flow together:
 *
 *   resolve manifest (provided | decompose PRD | read .blueprint/subsystems.json)
 *     → validate → persist → plan(layers) → resume from progress
 *     → runSubsystemPipeline (foundation → layers) with per-subsystem checkpointing
 *
 * The composition/decision logic is testable via injected `decompose` /
 * `runPipeline`; the defaults wire the real implementations (which POST to the
 * coding endpoint and need a running app — validated by a real smoke run).
 */

import type { KickoffWorkItem } from "../types";
import type { SubsystemManifest } from "./types";
import {
  validateSubsystemManifest,
  type ManifestValidationResult,
} from "./validate";
import { planSubsystemBuilds, type SubsystemBuildPlan, type SubsystemRunResult } from "./orchestrate";
import { writeSubsystemManifest, readSubsystemManifest } from "./manifest-io";
import {
  readSubsystemProgress,
  completedSubsystemIds,
  recordSubsystemResult,
} from "./progress-io";
import { makeHttpCodingRunner, type SubsystemCodingContext } from "./coding-runner";
import {
  runSubsystemPipeline,
  type FoundationBuildResult,
} from "./foundation";
import {
  runCrossDomainIntegration,
  type CrossDomainIntegrationResult,
} from "./integrate";
import { decomposePrdIntoSubsystems, type DecomposeResult } from "./decompose";

export interface DevelopBySubsystemOptions {
  projectRoot: string;
  /** Whole-system task list (from kickoff). The planner assigns these to domains. */
  allTasks: KickoffWorkItem[];
  /** Coding context (baseUrl, runId, codeOutputDir, projectTier, allTasks). */
  codingContext: SubsystemCodingContext;
  /** Manifest source — one of: explicit manifest, a PRD to decompose, or the
   *  on-disk .blueprint/subsystems.json (read when neither is given). */
  manifest?: SubsystemManifest;
  prd?: string;
  /** ISO timestamp for progress records (injected for determinism). */
  now?: string;
  // ── injectable for tests ──
  decompose?: (prd: string) => Promise<DecomposeResult>;
  runPipeline?: typeof runSubsystemPipeline;
}

export interface DevelopBySubsystemResult {
  ok: boolean;
  errors: string[];
  manifest?: SubsystemManifest;
  validation?: ManifestValidationResult;
  plan?: SubsystemBuildPlan;
  foundation?: FoundationBuildResult;
  subsystems?: SubsystemRunResult[];
  integration?: CrossDomainIntegrationResult;
  skipped?: string[];
}

export async function developBySubsystem(
  opts: DevelopBySubsystemOptions,
): Promise<DevelopBySubsystemResult> {
  const { projectRoot, allTasks, codingContext } = opts;
  const now = opts.now ?? new Date().toISOString();

  // 1. Resolve the manifest.
  let manifest = opts.manifest ?? null;
  if (!manifest && opts.prd) {
    const decompose = opts.decompose ?? decomposePrdIntoSubsystems;
    const result = await decompose(opts.prd);
    manifest = result.manifest;
    if (!result.validation.ok) {
      return { ok: false, errors: ["decomposer produced an invalid manifest:", ...result.validation.errors], manifest, validation: result.validation };
    }
  }
  if (!manifest) manifest = await readSubsystemManifest(projectRoot);
  if (!manifest) {
    return { ok: false, errors: ["No subsystem manifest: provide `manifest`, a `prd` to decompose, or a .blueprint/subsystems.json."] };
  }

  // 2. Validate (with task coverage is optional; here structural is enough).
  const validation = validateSubsystemManifest(manifest);
  if (!validation.ok) {
    return { ok: false, errors: ["manifest failed validation:", ...validation.errors], manifest, validation };
  }

  // 3. Persist the manifest.
  await writeSubsystemManifest(projectRoot, manifest);

  // 4. Plan.
  const plan = planSubsystemBuilds(manifest, allTasks);
  if (plan.errors.length > 0) {
    return { ok: false, errors: ["planning failed:", ...plan.errors], manifest, validation, plan };
  }

  // 5. Resume: skip subsystems already completed in a prior run.
  const progress = await readSubsystemProgress(projectRoot);
  const alreadyDone = completedSubsystemIds(progress);

  // 6. Run foundation → layers, persisting each subsystem result.
  const runPipeline = opts.runPipeline ?? runSubsystemPipeline;
  const runner = makeHttpCodingRunner(codingContext);
  const { foundation, subsystems, contractCheck } = await runPipeline(
    allTasks,
    plan,
    codingContext,
    runner,
    {
      alreadyDone,
      onStepDone: (r) => recordSubsystemResult(projectRoot, r, now),
      manifest, // P3.1 — enforce the frozen-contract precondition before domains
    },
  );

  const contractOk = !contractCheck || contractCheck.ok;
  const allOk =
    foundation.ok &&
    contractOk &&
    subsystems.every((s) => s.status === "completed" || s.status === "skipped");
  const errors: string[] = [];
  if (!foundation.ok) errors.push(`foundation failed: ${foundation.summary}`);
  if (contractCheck && !contractCheck.ok) {
    errors.push(
      `frozen-contract precondition failed (${contractCheck.reason ?? "incomplete"})` +
        (contractCheck.missing.length
          ? ` — missing from API_CONTRACTS.json: ${contractCheck.missing.slice(0, 20).join(", ")}${contractCheck.missing.length > 20 ? " …" : ""}`
          : ""),
    );
  }
  for (const s of subsystems) {
    if (s.status === "failed") errors.push(`subsystem ${s.subsystemId} failed: ${s.summary ?? ""}`);
  }

  // P3.2 — cross-domain integration gate: only when everything else built, as a
  // final whole-app check. Additive; never run on a broken build.
  let integration: CrossDomainIntegrationResult | undefined;
  if (allOk) {
    integration = await runCrossDomainIntegration({
      outputDir: codingContext.codeOutputDir ?? projectRoot,
      sessionId: codingContext.runId,
    });
    if (integration.ran && !integration.ok) {
      errors.push(`cross-domain integration failed: ${integration.reason ?? "see findings"}`);
    }
  }
  const finalOk = allOk && (!integration || !integration.ran || integration.ok);

  return {
    ok: finalOk,
    errors,
    manifest,
    validation,
    plan,
    foundation,
    subsystems,
    integration,
    skipped: [...alreadyDone],
  };
}
