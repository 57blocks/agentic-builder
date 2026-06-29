/**
 * Reverse-extract HTTP endpoints from an imported project's existing source, so
 * we can seed an `API_CONTRACTS.json` the coding pipeline can consume.
 *
 * P1 scope: static scan of JS/TS Express/Koa-style route registrations
 * (`router.get("/x")`, `app.post("/x")`, `apiRouter.patch("/x")`, …). Non-JS
 * stacks return an empty list + a note; LLM-assisted extraction is a follow-up.
 *
 * Pure filesystem reads — no LLM, no writes. Bounded so a huge repo can't blow
 * up the scan.
 */

import path from "node:path";
import * as nodeFs from "node:fs/promises";
import type { BackendStack, DetectedEndpoint } from "../project-profile";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"];

// `router.get("/users/:id"` | `app.post('/login'` | `apiRouter.patch(`/x``
const ROUTE_RE = new RegExp(
  String.raw`\b(?:router|app|apiRouter|api)\.(` +
    HTTP_METHODS.join("|") +
    String.raw`)\s*\(\s*["'` +
    "`" +
    String.raw`]([^"'` +
    "`" +
    String.raw`]+)["'` +
    "`" +
    String.raw`]`,
  "g",
);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "__tests__",
  "tests",
  "test",
]);

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cts", ".mts"]);

/** Recursively collect candidate source files under `dir`, bounded. */
async function collectSourceFiles(
  dir: string,
  maxFiles: number,
): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    if (out.length >= maxFiles) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = await nodeFs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= maxFiles) return;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        await walk(path.join(current, e.name));
      } else if (CODE_EXT.has(path.extname(e.name))) {
        out.push(path.join(current, e.name));
      }
    }
  }
  await walk(dir);
  return out;
}

function joinUrl(prefix: string, p: string): string {
  if (!prefix) return p.startsWith("/") ? p : `/${p}`;
  const a = prefix.replace(/\/$/, "");
  const b = p.startsWith("/") ? p : `/${p}`;
  return `${a}${b}`;
}

export interface ExtractContractsResult {
  endpoints: DetectedEndpoint[];
  notes: string[];
}

/**
 * Scan the backend for route registrations. `projectDir` is the project root;
 * `backend` (from detectStack) tells us where to scan and whether the stack is
 * statically supported.
 */
export async function extractApiContracts(
  projectDir: string,
  backend: BackendStack | null,
  opts: { maxFiles?: number } = {},
): Promise<ExtractContractsResult> {
  const notes: string[] = [];
  if (!backend) {
    return { endpoints: [], notes: ["No backend detected — no API to extract."] };
  }
  if (backend.language !== "ts" && backend.language !== "js") {
    return {
      endpoints: [],
      notes: [
        `Static endpoint extraction is not supported for ${backend.language} (${backend.framework}) yet — contracts left empty.`,
      ],
    };
  }

  const beRoot = path.join(projectDir, backend.rootDir);
  // Prefer the detected routes dir; fall back to the whole backend src.
  const scanRel = backend.dirs?.routes ?? "src";
  const scanRoot = (await pathExists(path.join(beRoot, scanRel)))
    ? path.join(beRoot, scanRel)
    : beRoot;

  const files = await collectSourceFiles(scanRoot, opts.maxFiles ?? 400);
  const apiPrefix = backend.apiPrefix ?? "";
  const seen = new Set<string>();
  const endpoints: DetectedEndpoint[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await nodeFs.readFile(file, "utf-8");
    } catch {
      continue;
    }
    ROUTE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ROUTE_RE.exec(content)) !== null) {
      const method = m[1].toUpperCase();
      const rawPath = m[2];
      // Skip obvious non-routes (asset globs, regex strings).
      if (rawPath.includes("*") && !rawPath.includes("/")) continue;
      const fullPath = joinUrl(apiPrefix, rawPath);
      const key = `${method} ${fullPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      endpoints.push({
        method,
        path: fullPath,
        source: path.relative(projectDir, file),
      });
    }
  }

  if (endpoints.length === 0) {
    notes.push(
      "No Express/Koa-style routes matched — the backend may register routes differently; contracts may need manual review.",
    );
  }
  return { endpoints, notes };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await nodeFs.access(p);
    return true;
  } catch {
    return false;
  }
}
