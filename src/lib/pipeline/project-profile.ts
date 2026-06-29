/**
 * Project Profile — a structured description of "how an existing project is
 * written", produced by the import-analysis step and persisted to
 * `.blueprint/project-profile.json`.
 *
 * Why this exists:
 *   The coding pipeline historically assumed OUR scaffold's structure (Vite +
 *   React under `frontend/src/views/`, Koa + Sequelize under `backend/`, a
 *   `/api/v1` client base, `respond.ts`, no migrations, …) — see
 *   `buildProjectConventionCard()` in agent-subgraph.ts, which bakes those rules
 *   in as prompt text. That breaks for an IMPORTED external project with a
 *   different architecture.
 *
 *   The Project Profile decouples "what the project actually is" (facts) from
 *   "what rules to tell the worker" (the Convention Card). For an imported
 *   project the analyzer detects these facts and the Convention Card adapts to
 *   them instead of dictating scaffold conventions. For our own generated
 *   projects there is no profile file and the pipeline keeps its existing
 *   runtime-detection behaviour (backward compatible).
 *
 * This module owns ONLY the type + read/write. Detection lives under
 * `import-analysis/`.
 */

import path from "node:path";
import * as nodeFs from "node:fs/promises";

export const PROJECT_PROFILE_RELATIVE = ".blueprint/project-profile.json";

/** How the repo is laid out across frontend/backend. */
export type MonorepoLayout =
  | "flat" // single app at root (e.g. a lone Vite app, or a Next fullstack)
  | "workspaces" // pnpm/yarn/npm workspaces or packages/*
  | "separate-fe-be" // top-level `frontend/` + `backend/`
  | "unknown";

export type PackageManager =
  | "pnpm"
  | "npm"
  | "yarn"
  | "bun"
  | "pip"
  | "poetry"
  | "go-mod"
  | "bundler" // ruby
  | "unknown";

export interface FrontendStack {
  /** e.g. "vite-react" | "next" | "cra" | "remix" | "vue" | "unknown" */
  framework: string;
  language: "ts" | "js" | "unknown";
  /** Directory holding page-level components, relative to `rootDir`. */
  pageDir?: string | null;
  /** Router entry file, relative to `rootDir`. */
  routerFile?: string | null;
  apiClient?: {
    /** Path to the canonical API client, relative to `rootDir`. */
    path: string;
    /** Detected base URL string, if any (e.g. "/api/v1", ""). */
    baseUrl?: string | null;
    /** Whether the base already carries the full `/api` (+version) prefix. */
    baseIncludesPrefix?: boolean;
  } | null;
  /** Where the frontend lives relative to the project root ("frontend" | "."). */
  rootDir: string;
}

export interface BackendStack {
  /** e.g. "koa" | "express" | "nest" | "fastify" | "django" | "rails" | "go-http" | "unknown" */
  framework: string;
  language: "ts" | "js" | "python" | "ruby" | "go" | "unknown";
  /** e.g. "sequelize" | "prisma" | "typeorm" | "drizzle" | "django-orm" | "activerecord" | "none" */
  orm?: string | null;
  /** Free-text description of how routes are registered (for the Convention Card). */
  routePattern?: string | null;
  /** Free-text description of the success-response convention. */
  responseConvention?: string | null;
  /** Detected mount prefix for the HTTP API (e.g. "/api", "/api/v1", ""). */
  apiPrefix?: string | null;
  /** Where the backend lives relative to the project root ("backend" | "."). */
  rootDir: string;
  /** Detected key directories, relative to `rootDir` (routes, models, middleware…). */
  dirs?: Record<string, string>;
}

export interface ProjectStack {
  monorepo: MonorepoLayout;
  packageManager: PackageManager;
  frontend?: FrontendStack | null;
  backend?: BackendStack | null;
}

export interface DetectedEndpoint {
  method: string; // GET | POST | ...
  path: string; // e.g. "/api/users/:id"
  /** Source file the endpoint was extracted from, relative to project root. */
  source?: string;
}

export interface DesignSystemInfo {
  /** Path to an existing design-tokens file, if any (relative to project root). */
  tokensFile?: string | null;
  /** e.g. "tailwind" | "css-modules" | "styled-components" | "mui" | "plain-css" | "unknown" */
  approach: string;
}

export interface ProjectProfile {
  /** Always true for analyzer-produced profiles; marks an imported project. */
  imported: boolean;
  /** ISO timestamp of the analysis run that produced this profile. */
  analyzedAt: string;
  /** Confidence the analyzer had in the stack detection (0..1). */
  confidence?: number;
  stack: ProjectStack;
  detectedEndpoints: DetectedEndpoint[];
  designSystem: DesignSystemInfo;
  /** Env keys referenced by the project (from .env(.example), config, etc.). */
  envKeys: string[];
  /**
   * Free-text notes surfaced to the user in the review UI and (condensed) to
   * the worker Convention Card — e.g. "no centralized API client detected".
   */
  notes?: string[];
}

function profilePath(outputDir: string): string {
  return path.join(outputDir, PROJECT_PROFILE_RELATIVE);
}

/**
 * Read `.blueprint/project-profile.json`. Returns null when absent or malformed
 * — callers MUST treat null as "not an imported project / use legacy runtime
 * detection" rather than erroring, so non-imported projects keep working.
 */
export async function readProjectProfile(
  outputDir: string,
): Promise<ProjectProfile | null> {
  if (!outputDir) return null;
  let raw: string;
  try {
    raw = await nodeFs.readFile(profilePath(outputDir), "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ProjectProfile>;
    if (!parsed || typeof parsed !== "object" || !parsed.stack) return null;
    // Normalize arrays so consumers can rely on them being present.
    return {
      imported: parsed.imported ?? true,
      analyzedAt: parsed.analyzedAt ?? "",
      confidence: parsed.confidence,
      stack: parsed.stack as ProjectStack,
      detectedEndpoints: Array.isArray(parsed.detectedEndpoints)
        ? parsed.detectedEndpoints
        : [],
      designSystem: parsed.designSystem ?? { approach: "unknown" },
      envKeys: Array.isArray(parsed.envKeys) ? parsed.envKeys : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return null;
  }
}

/** True when an imported-project profile is present. */
export async function hasProjectProfile(outputDir: string): Promise<boolean> {
  return (await readProjectProfile(outputDir)) !== null;
}

/** Write `.blueprint/project-profile.json`, creating `.blueprint/` if needed. */
export async function writeProjectProfile(
  outputDir: string,
  profile: ProjectProfile,
): Promise<void> {
  const target = profilePath(outputDir);
  await nodeFs.mkdir(path.dirname(target), { recursive: true });
  await nodeFs.writeFile(target, JSON.stringify(profile, null, 2), "utf-8");
}
