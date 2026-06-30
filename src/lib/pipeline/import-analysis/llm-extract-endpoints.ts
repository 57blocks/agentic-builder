/**
 * LLM-based endpoint extraction for stacks our static scanner can't parse
 * (Go, Python, Ruby, …). We collect a bounded set of the repo's source files
 * (the "Repomix-style" pack), ask an LLM to list the HTTP endpoints, and parse
 * the JSON back into DetectedEndpoint[].
 *
 * Design:
 *   - The chat call is INJECTABLE (`opts.chat`) so unit tests run without a key
 *     and the prompt/parse logic is verified deterministically.
 *   - Runtime default uses the project's openrouter `chatCompletion`. With no
 *     LLM key configured the call throws and we degrade gracefully to [].
 *   - Pure helpers (`buildEndpointExtractionPrompt`, `parseEndpointsFromLlm`)
 *     are exported for testing.
 */

import path from "node:path";
import * as nodeFs from "node:fs/promises";
import type { DetectedEndpoint } from "../project-profile";

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

// Source extensions worth scanning for route declarations across languages.
const CODE_EXT = new Set([
  ".go",
  ".py",
  ".rb",
  ".java",
  ".kt",
  ".rs",
  ".php",
  ".cs",
]);

// Filename hints that a file likely declares routes/handlers — scanned first.
const ROUTE_HINT = /rout|handler|controller|api|server|url|endpoint|view/i;

interface Snippet {
  file: string;
  content: string;
}

async function collectRouteFiles(
  root: string,
  maxFiles: number,
): Promise<string[]> {
  const all: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await nodeFs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        await walk(full);
      } else if (CODE_EXT.has(path.extname(e.name))) {
        all.push(full);
      }
    }
  }
  await walk(root);
  // Prioritise files whose name hints at routing, then cap.
  all.sort((a, b) => {
    const ah = ROUTE_HINT.test(path.basename(a)) ? 0 : 1;
    const bh = ROUTE_HINT.test(path.basename(b)) ? 0 : 1;
    return ah - bh;
  });
  return all.slice(0, maxFiles);
}

async function readSnippets(
  root: string,
  files: string[],
  maxChars: number,
): Promise<Snippet[]> {
  const out: Snippet[] = [];
  let budget = maxChars;
  for (const f of files) {
    if (budget <= 0) break;
    let content: string;
    try {
      content = await nodeFs.readFile(f, "utf-8");
    } catch {
      continue;
    }
    const clipped = content.slice(0, Math.min(content.length, budget, 8000));
    budget -= clipped.length;
    out.push({ file: path.relative(root, f), content: clipped });
  }
  return out;
}

export function buildEndpointExtractionPrompt(snippets: Snippet[]): string {
  const body = snippets
    .map((s) => `// ===== ${s.file} =====\n${s.content}`)
    .join("\n\n");
  return [
    "You are analyzing an existing backend service to inventory its HTTP API.",
    "From the source files below, list EVERY HTTP endpoint the service exposes.",
    "",
    "Return ONLY a JSON array, no prose, no markdown fences. Each item:",
    `{ "method": "GET|POST|PUT|PATCH|DELETE", "path": "/the/route/path", "source": "file where it's defined" }`,
    "Use the full route path including any router/group prefix. If none are found, return [].",
    "",
    "Source files:",
    body,
  ].join("\n");
}

/** Tolerant parse: strips ```json fences, finds the JSON array, validates shape. */
export function parseEndpointsFromLlm(text: string): DetectedEndpoint[] {
  if (!text) return [];
  let s = text.trim();
  // Strip markdown fences if present.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // Narrow to the first JSON array.
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(s.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: DetectedEndpoint[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const method = typeof o.method === "string" ? o.method.toUpperCase() : "";
    const p = typeof o.path === "string" ? o.path : "";
    if (!method || !p) continue;
    const key = `${method} ${p}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      method,
      path: p,
      source: typeof o.source === "string" ? o.source : undefined,
    });
  }
  return out;
}

export type ChatFn = (prompt: string) => Promise<string>;

async function defaultChat(prompt: string): Promise<string> {
  const { chatCompletion } = await import("@/lib/openrouter");
  const res = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You extract HTTP endpoints from source code and reply with only a JSON array.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0, max_tokens: 4096 },
  );
  return res.choices?.[0]?.message?.content ?? "";
}

export interface ExtractViaLlmOptions {
  chat?: ChatFn;
  maxFiles?: number;
  maxChars?: number;
}

/**
 * Collect a bounded source pack from `dir`, ask the LLM to inventory endpoints,
 * and return them. Returns [] on no source, no key, or any failure (graceful).
 */
export async function extractEndpointsViaLlm(
  dir: string,
  opts: ExtractViaLlmOptions = {},
): Promise<DetectedEndpoint[]> {
  const files = await collectRouteFiles(dir, opts.maxFiles ?? 60);
  if (files.length === 0) return [];
  const snippets = await readSnippets(dir, files, opts.maxChars ?? 60000);
  if (snippets.length === 0) return [];
  const chat = opts.chat ?? defaultChat;
  try {
    const text = await chat(buildEndpointExtractionPrompt(snippets));
    return parseEndpointsFromLlm(text);
  } catch {
    return [];
  }
}
