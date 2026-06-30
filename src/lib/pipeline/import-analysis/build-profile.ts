/**
 * Compose stack detection + endpoint extraction into a {@link ProjectProfile}
 * plus an {@link AnalysisReport} for the import review UI.
 *
 * This is the analyzer's public entry. It does NOT write anything — the import
 * API's `backfill` action persists the profile + derived metadata after the
 * user confirms the review screen.
 */

import path from "node:path";
import * as nodeFs from "node:fs/promises";
import type { ProjectProfile, SubRepo } from "../project-profile";
import { detectStack } from "./detect-stack";
import { extractApiContracts } from "./extract-api-contracts";

// Files that mark a directory as an independent repo/project root.
const REPO_MARKERS = [
  "package.json",
  "go.mod",
  "Gemfile",
  "requirements.txt",
  "pyproject.toml",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
];

async function exists(p: string): Promise<boolean> {
  try {
    await nodeFs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function hasAnyMarker(dir: string): Promise<boolean> {
  for (const m of REPO_MARKERS) {
    if (await exists(path.join(dir, m))) return true;
  }
  return false;
}

/**
 * Discover independent sub-repos under `root` (a microservices-style folder
 * holding several repos side by side). Returns [] when `root` is itself a repo
 * (single-project — handled by the normal path) or nothing repo-like is found.
 */
async function discoverSubRepos(root: string): Promise<string[]> {
  // If the root itself is a repo, this is a single project, not multi-repo.
  if (await hasAnyMarker(root)) return [];
  let entries: import("node:fs").Dirent[];
  try {
    entries = await nodeFs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const repos: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith(".") || e.name === "node_modules")
      continue;
    if (await hasAnyMarker(path.join(root, e.name))) repos.push(e.name);
  }
  // A plain frontend/ + backend/ split is a SINGLE separate-fe-be project, not
  // a multi-repo folder — let the normal single-project path handle it.
  const SINGLE_PROJECT_DIRS = new Set(["frontend", "backend"]);
  if (repos.length > 0 && repos.every((r) => SINGLE_PROJECT_DIRS.has(r)))
    return [];
  return repos.sort();
}

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
  // Multi-repo (microservices folder): N independent repos side by side.
  const subRepoNames = await discoverSubRepos(projectDir);
  if (subRepoNames.length >= 2) {
    return analyzeMultiRepo(projectDir, subRepoNames, opts);
  }

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

function describeRepo(r: SubRepo): string {
  const parts: string[] = [];
  if (r.stack.frontend) parts.push(`FE ${r.stack.frontend.framework}`);
  if (r.stack.backend)
    parts.push(
      `BE ${r.stack.backend.framework}${r.stack.backend.orm && r.stack.backend.orm !== "none" ? `/${r.stack.backend.orm}` : ""}`,
    );
  if (parts.length === 0) parts.push(r.stack.packageManager);
  if (r.detectedEndpoints.length)
    parts.push(`${r.detectedEndpoints.length} endpoints`);
  return parts.join(" · ");
}

/** Analyze a multi-repo project: each sub-repo gets its own detection, all
 *  aggregated under `profile.repos`. */
async function analyzeMultiRepo(
  root: string,
  names: string[],
  opts: AnalyzeOptions,
): Promise<AnalysisReport> {
  const repos: SubRepo[] = [];
  for (const name of names) {
    const dir = path.join(root, name);
    const detected = await detectStack(dir);
    const contracts = await extractApiContracts(
      dir,
      detected.stack.backend ?? null,
      { maxFiles: opts.maxFiles },
    );
    repos.push({
      name,
      rootDir: name,
      stack: detected.stack,
      detectedEndpoints: contracts.endpoints,
      designSystem: detected.designSystem,
      envKeys: detected.envKeys,
      confidence: detected.confidence,
      notes: [...detected.notes, ...contracts.notes],
    });
  }

  const avgConf =
    repos.length > 0
      ? repos.reduce((s, r) => s + (r.confidence ?? 0), 0) / repos.length
      : 0;
  const totalEndpoints = repos.reduce(
    (s, r) => s + r.detectedEndpoints.length,
    0,
  );

  const profile: ProjectProfile = {
    imported: true,
    analyzedAt: opts.now ?? new Date().toISOString(),
    confidence: avgConf,
    stack: {
      monorepo: "multi-repo",
      packageManager: "unknown",
      frontend: null,
      backend: null,
    },
    detectedEndpoints: [],
    designSystem: { approach: "unknown" },
    envKeys: [],
    notes: [`Multi-repo project: ${repos.length} repos detected.`],
    repos,
  };

  const summary: SummaryRow[] = [
    { label: "Layout", value: `multi-repo (${repos.length} repos)` },
    ...repos.map((r) => ({ label: r.name, value: describeRepo(r) })),
  ];

  const willGenerate: PlannedArtifact[] = [
    {
      file: ".blueprint/project-profile.json",
      description: `Per-repo conventions for ${repos.length} repos (under "repos").`,
    },
  ];
  if (totalEndpoints > 0) {
    willGenerate.push({
      file: "API_CONTRACTS.json",
      description: `${totalEndpoints} endpoint(s) reverse-extracted across repos.`,
    });
  }

  const notes = [
    `Detected ${repos.length} independent repos — each is analyzed and adapted on its own.`,
    ...repos.flatMap((r) => (r.notes ?? []).map((n) => `[${r.name}] ${n}`)),
  ];

  return { profile, summary, willGenerate, notes };
}
