/**
 * Compose stack detection + endpoint extraction into a {@link ProjectProfile}
 * plus an {@link AnalysisReport} for the import review UI.
 *
 * This is the analyzer's public entry. It does NOT write anything — the import
 * API's `backfill` action persists the profile + derived metadata after the
 * user confirms the review screen.
 */

import type { ProjectProfile } from "../project-profile";
import { detectStack } from "./detect-stack";
import { extractApiContracts } from "./extract-api-contracts";

/** One row in the review UI's "detected stack" panel. */
export interface SummaryRow {
  label: string;
  value: string;
  /**
   * When set, the review UI renders an editable control bound to this dotted
   * path into the profile (e.g. "stack.backend.framework"), so the user can
   * correct a misdetection before backfill.
   */
  editableKey?: string;
}

/** A metadata file backfill will create. */
export interface PlannedArtifact {
  file: string;
  description: string;
}

export interface AnalysisReport {
  profile: ProjectProfile;
  summary: SummaryRow[];
  willGenerate: PlannedArtifact[];
  notes: string[];
}

export interface AnalyzeOptions {
  /** Override the analysis timestamp (tests pass a fixed value). */
  now?: string;
  maxFiles?: number;
}

export async function analyzeProject(
  projectDir: string,
  opts: AnalyzeOptions = {},
): Promise<AnalysisReport> {
  const detected = await detectStack(projectDir);
  const contracts = await extractApiContracts(
    projectDir,
    detected.stack.backend ?? null,
    { maxFiles: opts.maxFiles },
  );

  const profile: ProjectProfile = {
    imported: true,
    analyzedAt: opts.now ?? new Date().toISOString(),
    confidence: detected.confidence,
    stack: detected.stack,
    detectedEndpoints: contracts.endpoints,
    designSystem: detected.designSystem,
    envKeys: detected.envKeys,
    notes: [...detected.notes, ...contracts.notes],
  };

  const { frontend: fe, backend: be } = profile.stack;
  const summary: SummaryRow[] = [
    { label: "Layout", value: profile.stack.monorepo },
    { label: "Package manager", value: profile.stack.packageManager },
    {
      label: "Frontend",
      value: fe
        ? `${fe.framework} (${fe.language})${fe.pageDir ? ` · pages: ${fe.pageDir}` : ""}`
        : "none",
      editableKey: fe ? "stack.frontend.framework" : undefined,
    },
    {
      label: "API client",
      value: fe?.apiClient
        ? `${fe.apiClient.path}${fe.apiClient.baseUrl != null ? ` · base "${fe.apiClient.baseUrl}"` : ""}`
        : "not detected",
    },
    {
      label: "Backend",
      value: be
        ? `${be.framework} (${be.language})${be.orm && be.orm !== "none" ? ` · ORM: ${be.orm}` : ""}`
        : "none",
      editableKey: be ? "stack.backend.framework" : undefined,
    },
    {
      label: "API endpoints found",
      value: String(profile.detectedEndpoints.length),
    },
    {
      label: "Design system",
      value: `${profile.designSystem.approach}${profile.designSystem.tokensFile ? ` · tokens: ${profile.designSystem.tokensFile}` : ""}`,
    },
    { label: "Env keys", value: String(profile.envKeys.length) },
  ];

  const willGenerate: PlannedArtifact[] = [
    {
      file: ".blueprint/project-profile.json",
      description: "Structured project conventions used to adapt code generation.",
    },
  ];
  if (profile.detectedEndpoints.length > 0) {
    willGenerate.push({
      file: "API_CONTRACTS.json",
      description: `${profile.detectedEndpoints.length} endpoint(s) reverse-extracted from existing routes.`,
    });
  }
  if (profile.envKeys.length > 0) {
    willGenerate.push({
      file: ".blueprint/resource-requirements.json",
      description: `Draft from ${profile.envKeys.length} detected env key(s); edit values before running.`,
    });
  }

  return { profile, summary, willGenerate, notes: profile.notes ?? [] };
}
