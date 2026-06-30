/**
 * Reverse-engineer a system-level "baseline PRD" from an imported project's
 * code + analysis profile — a document describing what the project ALREADY
 * does. Written to `.blueprint/PRD.md` so the existing PRD pipeline
 * (`readImportedPrd`) consumes it; the user then edits it to drive the next
 * iteration (existing PRD-edit + incremental-rerun).
 *
 * For a multi-repo project this produces ONE system-level PRD covering each
 * repo's responsibility, key pages, and endpoint surface.
 *
 * The chat call is injectable (`opts.chat`) so tests run without a key; runtime
 * uses openrouter `chatCompletion`.
 */

import path from "node:path";
import * as nodeFs from "node:fs/promises";
import type { ProjectProfile, SubRepo } from "../project-profile";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "vendor",
  "testdata",
  ".next",
  "coverage",
]);

const CODE_EXT = new Set([
  ".go",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".rb",
  ".java",
  ".kt",
  ".rs",
]);

// Files most worth showing the model, in priority order.
const ENTRY_HINT = /^(main|index|app|server|router|routes)\.[a-z]+$/i;
const ROUTE_HINT = /rout|handler|controller|api|endpoint|view|model|entity|schema/i;

export interface RepoDigest {
  name: string;
  rootDir: string;
  /** Stack one-liner for the prompt header. */
  stack: string;
  endpointCount: number;
  files: { path: string; content: string }[];
}

async function readTextSafe(p: string): Promise<string | null> {
  try {
    return await nodeFs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

async function walkFiles(root: string, maxFiles: number): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    if (out.length >= maxFiles) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = await nodeFs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= maxFiles) return;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        await walk(path.join(dir, e.name));
      } else if (CODE_EXT.has(path.extname(e.name))) {
        out.push(path.join(dir, e.name));
      }
    }
  }
  await walk(root);
  return out;
}

function stackLine(repo: SubRepo): string {
  const fe = repo.stack.frontend;
  const be = repo.stack.backend;
  const parts: string[] = [];
  if (fe) parts.push(`frontend: ${fe.framework} (${fe.language})`);
  if (be)
    parts.push(
      `backend: ${be.framework} (${be.language})${be.orm && be.orm !== "none" ? `, ORM ${be.orm}` : ""}`,
    );
  if (!parts.length) parts.push(repo.stack.packageManager);
  return parts.join("; ");
}

/**
 * Collect a bounded, prioritised digest of one repo: README + entry files +
 * route/model files first, capped by `maxChars`.
 */
export async function collectRepoDigest(
  repoDir: string,
  repo: SubRepo,
  maxChars = 12000,
): Promise<RepoDigest> {
  const files: { path: string; content: string }[] = [];
  let budget = maxChars;

  const pushFile = (rel: string, content: string) => {
    if (budget <= 0) return;
    const clip = content.slice(0, Math.min(content.length, budget, 4000));
    budget -= clip.length;
    files.push({ path: rel, content: clip });
  };

  // README first (best single source of intent).
  for (const name of ["README.md", "readme.md", "README"]) {
    const c = await readTextSafe(path.join(repoDir, name));
    if (c) {
      pushFile(name, c);
      break;
    }
  }

  // Then code files, entry + route/model hints prioritised.
  const all = await walkFiles(repoDir, 300);
  all.sort((a, b) => {
    const score = (f: string) => {
      const base = path.basename(f);
      if (ENTRY_HINT.test(base)) return 0;
      if (ROUTE_HINT.test(base)) return 1;
      return 2;
    };
    return score(a) - score(b);
  });
  for (const f of all) {
    if (budget <= 0) break;
    const c = await readTextSafe(f);
    if (c) pushFile(path.relative(repoDir, f), c);
  }

  return {
    name: repo.name,
    rootDir: repo.rootDir,
    stack: stackLine(repo),
    endpointCount: repo.detectedEndpoints.length,
    files,
  };
}

export function buildBaselinePrdPrompt(
  profile: ProjectProfile,
  digests: RepoDigest[],
): string {
  const isMulti = (profile.repos?.length ?? 0) > 1;
  const header = isMulti
    ? `This is a MULTI-REPO system of ${digests.length} services/apps. Produce ONE system-level PRD that describes the whole system AS IT EXISTS TODAY.`
    : `Produce a PRD that describes this project AS IT EXISTS TODAY.`;

  const repoBlocks = digests
    .map((d) => {
      const fileText = d.files
        .map((f) => `--- ${d.name}/${f.path} ---\n${f.content}`)
        .join("\n\n");
      return [
        `## Repo: ${d.name}`,
        `Stack: ${d.stack}`,
        `Detected endpoints: ${d.endpointCount}`,
        fileText,
      ].join("\n");
    })
    .join("\n\n========================================\n\n");

  const endpointSurface = (profile.repos ?? [])
    .flatMap((r) =>
      r.detectedEndpoints.map((e) => `${r.name}: ${e.method} ${e.path}`),
    )
    .slice(0, 200)
    .join("\n");

  return [
    "You are a senior product manager reverse-engineering an EXISTING codebase.",
    header,
    "",
    "Write the PRD in Markdown describing the CURRENT state (not aspirational). Include:",
    "1. **Overview** — what the system is and the problem it solves.",
    isMulti
      ? "2. **Services / Apps** — one subsection per repo: its responsibility, and how it interacts with the others."
      : "2. **Architecture** — the app's main modules.",
    "3. **Key Pages / Screens** — from any frontend repo (routes + purpose).",
    "4. **API Surface** — the main endpoints grouped by service (use the inventory below).",
    "5. **Data Entities** — the core models/entities inferred from the code.",
    "6. **Feature Requirements (AC-*)** — bullet the implemented capabilities as acceptance-criteria-style items, so this PRD can drive future iterations.",
    "",
    "Be faithful to the code — do NOT invent features that aren't present. Where unsure, describe what the code suggests and mark it.",
    "",
    endpointSurface ? `## Detected endpoint inventory\n${endpointSurface}\n` : "",
    "## Source digests",
    repoBlocks,
  ].join("\n");
}

export type ChatFn = (prompt: string) => Promise<string>;

async function defaultChat(prompt: string): Promise<string> {
  const { chatCompletion } = await import("@/lib/openrouter");
  const res = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You reverse-engineer existing software into a faithful, current-state PRD in Markdown.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.2, max_tokens: 8192 },
  );
  return res.choices?.[0]?.message?.content ?? "";
}

export interface GenerateBaselinePrdOptions {
  chat?: ChatFn;
  maxCharsPerRepo?: number;
}

export interface GenerateBaselinePrdResult {
  content: string;
  prdPath: string;
  repoCount: number;
}

/**
 * Build digests for every repo (or the single project), ask the LLM for a
 * system-level baseline PRD, and write it to `<outputDir>/.blueprint/PRD.md`.
 */
export async function generateBaselinePrd(
  outputDir: string,
  profile: ProjectProfile,
  opts: GenerateBaselinePrdOptions = {},
): Promise<GenerateBaselinePrdResult> {
  // Normalize to a repo list: multi-repo uses profile.repos; single project
  // synthesizes one "." repo from the top-level stack.
  const repos: SubRepo[] =
    profile.repos && profile.repos.length > 0
      ? profile.repos
      : [
          {
            name: path.basename(outputDir) || "app",
            rootDir: ".",
            stack: profile.stack,
            detectedEndpoints: profile.detectedEndpoints,
            designSystem: profile.designSystem,
            envKeys: profile.envKeys,
          },
        ];

  const digests: RepoDigest[] = [];
  for (const repo of repos) {
    const repoDir = path.join(outputDir, repo.rootDir);
    digests.push(
      await collectRepoDigest(repoDir, repo, opts.maxCharsPerRepo ?? 12000),
    );
  }

  const chat = opts.chat ?? defaultChat;
  const content = await chat(buildBaselinePrdPrompt(profile, digests));

  const prdPath = path.join(outputDir, ".blueprint", "PRD.md");
  await nodeFs.mkdir(path.dirname(prdPath), { recursive: true });
  await nodeFs.writeFile(prdPath, content, "utf-8");

  return { content, prdPath, repoCount: repos.length };
}
