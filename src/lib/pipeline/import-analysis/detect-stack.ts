/**
 * Stack detection for an imported external project.
 *
 * Produces the structured-facts half of a {@link ProjectProfile}: monorepo
 * layout, package manager, frontend stack, backend stack, design system and
 * referenced env keys. It mirrors the runtime probing already done in
 * `buildProjectConventionCard()` (agent-subgraph.ts) but returns DATA instead
 * of scaffold-specific prompt text, and extends recognition beyond our
 * Vite/Koa scaffold to Next, and (basic) Django/Rails/Go.
 *
 * P1 scope: thorough for JS/TS stacks; best-effort identification for
 * Python/Ruby/Go (framework + language only, so the Convention Card can still
 * say "follow this project's existing conventions").
 *
 * Pure filesystem reads — no LLM, no writes.
 */

import path from "node:path";
import * as nodeFs from "node:fs/promises";
import type {
  BackendStack,
  DesignSystemInfo,
  FrontendStack,
  MonorepoLayout,
  PackageManager,
  ProjectStack,
} from "../project-profile";

// ─── Small filesystem helpers ───────────────────────────────────────────────

async function exists(root: string, rel: string): Promise<boolean> {
  try {
    await nodeFs.access(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}

async function readText(root: string, rel: string): Promise<string | null> {
  try {
    return await nodeFs.readFile(path.join(root, rel), "utf-8");
  } catch {
    return null;
  }
}

async function readJson<T = Record<string, unknown>>(
  root: string,
  rel: string,
): Promise<T | null> {
  const raw = await readText(root, rel);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: unknown;
}

function allDeps(pkg: PkgJson | null): Record<string, string> {
  if (!pkg) return {};
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

function has(deps: Record<string, string>, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(deps, name);
}

// ─── Package manager ────────────────────────────────────────────────────────

async function detectPackageManager(root: string): Promise<PackageManager> {
  if (await exists(root, "pnpm-lock.yaml")) return "pnpm";
  if (await exists(root, "yarn.lock")) return "yarn";
  if (await exists(root, "bun.lockb")) return "bun";
  if (await exists(root, "package-lock.json")) return "npm";
  if (await exists(root, "poetry.lock")) return "poetry";
  if (
    (await exists(root, "requirements.txt")) ||
    (await exists(root, "Pipfile"))
  )
    return "pip";
  if (await exists(root, "go.mod")) return "go-mod";
  if (await exists(root, "Gemfile")) return "bundler";
  if (await exists(root, "package.json")) return "npm";
  return "unknown";
}

// ─── Layout ─────────────────────────────────────────────────────────────────

async function detectLayout(
  root: string,
  rootPkg: PkgJson | null,
): Promise<MonorepoLayout> {
  const hasFe = await exists(root, "frontend");
  const hasBe = await exists(root, "backend");
  // Any top-level frontend/ or backend/ dir → treat as a separate-dir layout
  // (even when only one side is present, e.g. a backend-only Django repo).
  if (hasFe || hasBe) return "separate-fe-be";
  if (rootPkg?.workspaces || (await exists(root, "packages")))
    return "workspaces";
  if (await exists(root, "package.json")) return "flat";
  return "unknown";
}

// ─── Frontend ───────────────────────────────────────────────────────────────

const FE_PAGE_DIR_CANDIDATES = [
  "app", // Next app-router / Remix
  "src/app",
  "src/views",
  "src/pages",
  "pages", // Next pages-router
  "src/screens",
  "src/routes",
];

const FE_ROUTER_CANDIDATES = [
  "src/router.tsx",
  "src/router.ts",
  "src/routes.tsx",
  "src/App.tsx",
  "src/main.tsx",
];

const FE_API_CLIENT_CANDIDATES = [
  "src/api/client.ts",
  "src/api/client.tsx",
  "src/api/index.ts",
  "src/lib/api.ts",
  "src/lib/api/client.ts",
  "src/services/api.ts",
  "src/utils/api.ts",
];

async function firstExisting(
  root: string,
  candidates: string[],
): Promise<string | null> {
  for (const c of candidates) {
    if (await exists(root, c)) return c;
  }
  return null;
}

function detectFeFramework(deps: Record<string, string>): string {
  if (has(deps, "next")) return "next";
  if (has(deps, "@remix-run/react") || has(deps, "@remix-run/node"))
    return "remix";
  if (has(deps, "vite") && (has(deps, "react") || has(deps, "react-dom")))
    return "vite-react";
  if (has(deps, "vite") && has(deps, "vue")) return "vite-vue";
  if (has(deps, "react-scripts")) return "cra";
  if (has(deps, "@angular/core")) return "angular";
  if (has(deps, "vue")) return "vue";
  if (has(deps, "svelte") || has(deps, "@sveltejs/kit")) return "svelte";
  if (has(deps, "react")) return "react";
  return "unknown";
}

async function extractApiClientBase(
  feRoot: string,
  clientRel: string,
): Promise<{ baseUrl: string | null; baseIncludesPrefix: boolean }> {
  const content = await readText(feRoot, clientRel);
  if (!content) return { baseUrl: null, baseIncludesPrefix: false };
  // Same heuristics as buildProjectConventionCard's base detection.
  const match =
    content.match(
      /(?:VITE_|NEXT_PUBLIC_)?API_BASE_URL[^|?]*(?:\|\||\?\?)\s*["'`]([^"'`]*)["'`]/,
    ) ??
    content.match(/API_BASE\s*=\s*["'`]([^"'`]*)["'`]/) ??
    content.match(/baseURL[^"'`]*["'`]([^"'`]*)["'`]/);
  const baseUrl = match ? match[1] : null;
  const baseIncludesPrefix = !!baseUrl && /\/api(\/|$|\/v\d+)/.test(baseUrl);
  return { baseUrl, baseIncludesPrefix };
}

async function detectFrontend(
  root: string,
): Promise<FrontendStack | null> {
  // Resolve where the frontend lives — a top-level `frontend/` wins, else root.
  const feRootRel = (await exists(root, "frontend")) ? "frontend" : ".";
  const feRoot = path.join(root, feRootRel);

  const pkg = await readJson<PkgJson>(feRoot, "package.json");
  // A flat backend-only project has a package.json but no FE framework — bail.
  const deps = allDeps(pkg);
  const framework = detectFeFramework(deps);
  if (framework === "unknown" && feRootRel === ".") {
    // Could be a pure backend; only treat as FE if there's a clear FE signal.
    const hasFeSignal =
      has(deps, "react") || has(deps, "vue") || has(deps, "svelte");
    if (!hasFeSignal) return null;
  }
  if (!pkg && feRootRel === ".") return null;

  const language =
    (await exists(feRoot, "tsconfig.json")) || has(deps, "typescript")
      ? "ts"
      : pkg
        ? "js"
        : "unknown";

  const pageDir = await firstExisting(feRoot, FE_PAGE_DIR_CANDIDATES);
  const routerFile = await firstExisting(feRoot, FE_ROUTER_CANDIDATES);
  const clientRel = await firstExisting(feRoot, FE_API_CLIENT_CANDIDATES);

  let apiClient: FrontendStack["apiClient"] = null;
  if (clientRel) {
    const { baseUrl, baseIncludesPrefix } = await extractApiClientBase(
      feRoot,
      clientRel,
    );
    apiClient = { path: clientRel, baseUrl, baseIncludesPrefix };
  }

  return {
    framework,
    language,
    pageDir,
    routerFile,
    apiClient,
    rootDir: feRootRel,
  };
}

// ─── Backend ────────────────────────────────────────────────────────────────

function detectBeFramework(deps: Record<string, string>): string {
  if (has(deps, "@nestjs/core")) return "nest";
  if (has(deps, "koa")) return "koa";
  if (has(deps, "express")) return "express";
  if (has(deps, "fastify")) return "fastify";
  if (has(deps, "@hapi/hapi")) return "hapi";
  if (has(deps, "next")) return "next-api"; // Next API routes as backend
  return "unknown";
}

function detectOrm(deps: Record<string, string>): string {
  if (has(deps, "sequelize")) return "sequelize";
  if (has(deps, "@prisma/client") || has(deps, "prisma")) return "prisma";
  if (has(deps, "typeorm")) return "typeorm";
  if (has(deps, "drizzle-orm")) return "drizzle";
  if (has(deps, "mongoose")) return "mongoose";
  if (has(deps, "knex")) return "knex";
  return "none";
}

async function firstExistingDir(
  root: string,
  candidates: string[],
): Promise<string | undefined> {
  for (const c of candidates) {
    if (await exists(root, c)) return c;
  }
  return undefined;
}

async function detectBackend(
  root: string,
): Promise<BackendStack | null> {
  // A top-level `backend/` wins, else root (flat app).
  const beRootRel = (await exists(root, "backend")) ? "backend" : ".";
  const beRoot = path.join(root, beRootRel);

  // ── Non-JS backends (best-effort identification) ──
  if (
    (await exists(beRoot, "manage.py")) ||
    (await exists(beRoot, "requirements.txt")) ||
    (await exists(beRoot, "pyproject.toml"))
  ) {
    const reqs =
      (await readText(beRoot, "requirements.txt")) ??
      (await readText(beRoot, "pyproject.toml")) ??
      "";
    const framework = /django/i.test(reqs)
      ? "django"
      : /fastapi/i.test(reqs)
        ? "fastapi"
        : /flask/i.test(reqs)
          ? "flask"
          : (await exists(beRoot, "manage.py"))
            ? "django"
            : "python";
    return {
      framework,
      language: "python",
      orm: framework === "django" ? "django-orm" : "none",
      rootDir: beRootRel,
    };
  }
  if (await exists(beRoot, "Gemfile")) {
    const gem = (await readText(beRoot, "Gemfile")) ?? "";
    return {
      framework: /rails/i.test(gem) ? "rails" : "ruby",
      language: "ruby",
      orm: /rails/i.test(gem) ? "activerecord" : "none",
      rootDir: beRootRel,
    };
  }
  if (await exists(beRoot, "go.mod")) {
    return { framework: "go-http", language: "go", orm: "none", rootDir: beRootRel };
  }

  // ── JS/TS backends ──
  const pkg = await readJson<PkgJson>(beRoot, "package.json");
  if (!pkg) return null;
  const deps = allDeps(pkg);
  const framework = detectBeFramework(deps);
  if (framework === "unknown") {
    // A bare package.json with no server framework → not a backend.
    return null;
  }

  const language =
    (await exists(beRoot, "tsconfig.json")) || has(deps, "typescript")
      ? "ts"
      : "js";
  const orm = detectOrm(deps);

  const dirs: Record<string, string> = {};
  const routesDir = await firstExistingDir(beRoot, [
    "src/api/modules",
    "src/routes",
    "src/controllers",
    "src/api",
    "routes",
  ]);
  if (routesDir) dirs.routes = routesDir;
  const modelsDir = await firstExistingDir(beRoot, [
    "src/models",
    "src/entities",
    "src/db/models",
    "prisma",
    "models",
  ]);
  if (modelsDir) dirs.models = modelsDir;
  const mwDir = await firstExistingDir(beRoot, [
    "src/middlewares",
    "src/middleware",
  ]);
  if (mwDir) dirs.middleware = mwDir;

  return {
    framework,
    language,
    orm,
    rootDir: beRootRel,
    dirs: Object.keys(dirs).length ? dirs : undefined,
    routePattern:
      framework === "koa" || framework === "express"
        ? `routes detected under ${routesDir ?? beRootRel}`
        : null,
  };
}

// ─── Design system ──────────────────────────────────────────────────────────

const TOKENS_CANDIDATES = [
  "frontend/src/styles/tokens.css",
  "src/styles/tokens.css",
  "frontend/src/index.css",
  "src/index.css",
];

async function detectDesignSystem(
  root: string,
  fe: FrontendStack | null,
): Promise<DesignSystemInfo> {
  const feRoot = fe ? path.join(root, fe.rootDir) : root;
  const feDeps = allDeps(await readJson<PkgJson>(feRoot, "package.json"));

  let approach = "unknown";
  if (has(feDeps, "tailwindcss")) approach = "tailwind";
  else if (
    has(feDeps, "styled-components") ||
    has(feDeps, "@emotion/react")
  )
    approach = "styled-components";
  else if (has(feDeps, "@mui/material")) approach = "mui";
  else if (has(feDeps, "@chakra-ui/react")) approach = "chakra";

  let tokensFile: string | null = null;
  for (const c of TOKENS_CANDIDATES) {
    if (await exists(root, c)) {
      // Only treat as a tokens file if it actually defines design tokens.
      const content = (await readText(root, c)) ?? "";
      if (/@theme|--color-|:root\s*\{/.test(content)) {
        tokensFile = c;
        break;
      }
    }
  }

  return { approach, tokensFile };
}

// ─── Env keys ───────────────────────────────────────────────────────────────

async function detectEnvKeys(root: string): Promise<string[]> {
  const keys = new Set<string>();
  const candidates = [
    ".env.example",
    ".env",
    "backend/.env.example",
    "backend/.env",
    "frontend/.env.example",
  ];
  for (const c of candidates) {
    const content = await readText(root, c);
    if (!content) continue;
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z][A-Z0-9_]+)\s*=/);
      if (m) keys.add(m[1]);
    }
  }
  return [...keys];
}

// ─── Public entry ───────────────────────────────────────────────────────────

export interface DetectStackResult {
  stack: ProjectStack;
  designSystem: DesignSystemInfo;
  envKeys: string[];
  /** Heuristic 0..1 — how confident we are the stack was identified. */
  confidence: number;
  notes: string[];
}

/**
 * Inspect `projectDir` and return structured stack facts. Never throws on a
 * missing/odd project — returns "unknown" fields + notes instead.
 */
export async function detectStack(
  projectDir: string,
): Promise<DetectStackResult> {
  const notes: string[] = [];
  const rootPkg = await readJson<PkgJson>(projectDir, "package.json");

  const packageManager = await detectPackageManager(projectDir);
  const monorepo = await detectLayout(projectDir, rootPkg);

  const frontend = await detectFrontend(projectDir);
  const backend = await detectBackend(projectDir);

  const stack: ProjectStack = {
    monorepo,
    packageManager,
    frontend,
    backend,
  };

  const designSystem = await detectDesignSystem(projectDir, frontend);
  const envKeys = await detectEnvKeys(projectDir);

  // Confidence + notes.
  let score = 0;
  if (frontend && frontend.framework !== "unknown") score += 0.45;
  if (backend && backend.framework !== "unknown") score += 0.45;
  if (packageManager !== "unknown") score += 0.1;
  if (!frontend && !backend) {
    notes.push(
      "Could not identify a frontend or backend framework — the project may use an unsupported stack; code generation will rely entirely on the Convention Card.",
    );
  }
  if (frontend && !frontend.apiClient) {
    notes.push(
      "No centralized API client detected — new frontend code will follow whatever fetch pattern the existing pages use.",
    );
  }
  if (backend && backend.language !== "ts" && backend.language !== "js") {
    notes.push(
      `Backend is ${backend.language} (${backend.framework}); P1 code generation has no scaffold-level guarantees for non-JS stacks.`,
    );
  }

  return {
    stack,
    designSystem,
    envKeys,
    confidence: Math.min(1, score),
    notes,
  };
}
