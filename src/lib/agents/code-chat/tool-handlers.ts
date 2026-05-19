import fs from "fs/promises";
import path from "path";
import { resolveSandboxedPath } from "./path-sandbox";
import type { FileEditRecord } from "./types";

const MAX_READ_BYTES = 200_000;
const MAX_LIST_ENTRIES = 500;
const MAX_GREP_MATCHES = 80;

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".vite",
]);

export interface ToolHandlerContext {
  /** Absolute path to the app directory (the dir that has package.json). */
  appDir: string;
}

export interface ToolHandlerResult {
  ok: boolean;
  /** Short human-readable summary for streaming events / model context. */
  summary: string;
  /** Full string passed back to the model as tool result content. */
  modelContent: string;
  /** Set if a write/edit happened. */
  fileEdit?: FileEditRecord;
  /** Small preview for UI (e.g. first lines of a read). */
  preview?: string;
}

function nextEditId(): string {
  return `edit_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function tryReadFile(abs: string): Promise<string | null> {
  try {
    return await fs.readFile(abs, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function handleReadFile(
  ctx: ToolHandlerContext,
  args: { path?: string },
): Promise<ToolHandlerResult> {
  if (!args?.path) {
    return { ok: false, summary: "read_file: missing path", modelContent: "Error: path is required." };
  }
  const { abs, normalized } = resolveSandboxedPath(ctx.appDir, args.path);
  const raw = await tryReadFile(abs);
  if (raw === null) {
    return {
      ok: false,
      summary: `read_file ${normalized} (not found)`,
      modelContent: `Error: File not found: ${normalized}`,
    };
  }
  const truncated = raw.length > MAX_READ_BYTES;
  const slice = truncated ? raw.slice(0, MAX_READ_BYTES) : raw;
  const note = truncated
    ? `\n\n[truncated to ${MAX_READ_BYTES} bytes; original ${raw.length}]`
    : "";
  const preview = slice.split("\n").slice(0, 30).join("\n");
  return {
    ok: true,
    summary: `read_file ${normalized} (${raw.length} bytes${truncated ? ", truncated" : ""})`,
    modelContent: `File: ${normalized}\n\n${slice}${note}`,
    preview,
  };
}

export async function handleListFiles(
  ctx: ToolHandlerContext,
  args: { dir?: string },
): Promise<ToolHandlerResult> {
  const relDir = args?.dir?.trim() || ".";
  const { abs, normalized } = resolveSandboxedPath(ctx.appDir, relDir);
  const entries: string[] = [];
  const stack: string[] = [abs];
  while (stack.length && entries.length < MAX_LIST_ENTRIES) {
    const current = stack.pop()!;
    let stats;
    try {
      stats = await fs.stat(current);
    } catch {
      continue;
    }
    if (!stats.isDirectory()) {
      entries.push(path.relative(ctx.appDir, current));
      continue;
    }
    let children: string[];
    try {
      children = await fs.readdir(current);
    } catch {
      continue;
    }
    for (const c of children) {
      if (IGNORED_DIRS.has(c)) continue;
      const next = path.join(current, c);
      try {
        const s = await fs.stat(next);
        if (s.isDirectory()) {
          stack.push(next);
        } else if (s.isFile()) {
          entries.push(path.relative(ctx.appDir, next));
          if (entries.length >= MAX_LIST_ENTRIES) break;
        }
      } catch {
        /* skip unreadable */
      }
    }
  }
  entries.sort();
  const summary = `list_files ${normalized} → ${entries.length} file(s)${entries.length >= MAX_LIST_ENTRIES ? " (capped)" : ""}`;
  return {
    ok: true,
    summary,
    modelContent: entries.join("\n") || "(empty)",
    preview: entries.slice(0, 20).join("\n"),
  };
}

export async function handleGrep(
  ctx: ToolHandlerContext,
  args: { pattern?: string; path?: string },
): Promise<ToolHandlerResult> {
  if (!args?.pattern) {
    return { ok: false, summary: "grep: missing pattern", modelContent: "Error: pattern is required." };
  }
  let re: RegExp;
  try {
    re = new RegExp(args.pattern);
  } catch {
    re = new RegExp(args.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  }
  const relDir = args.path?.trim() || ".";
  const { abs } = resolveSandboxedPath(ctx.appDir, relDir);
  const matches: string[] = [];
  const stack: string[] = [abs];
  while (stack.length && matches.length < MAX_GREP_MATCHES) {
    const current = stack.pop()!;
    let stats;
    try {
      stats = await fs.stat(current);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      let children: string[];
      try {
        children = await fs.readdir(current);
      } catch {
        continue;
      }
      for (const c of children) {
        if (IGNORED_DIRS.has(c)) continue;
        stack.push(path.join(current, c));
      }
      continue;
    }
    if (!stats.isFile()) continue;
    let content: string;
    try {
      content = await fs.readFile(current, "utf-8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length && matches.length < MAX_GREP_MATCHES; i++) {
      if (re.test(lines[i])) {
        matches.push(`${path.relative(ctx.appDir, current)}:${i + 1}: ${lines[i].slice(0, 240)}`);
      }
    }
  }
  return {
    ok: true,
    summary: `grep "${args.pattern}" → ${matches.length} match(es)${matches.length >= MAX_GREP_MATCHES ? " (capped)" : ""}`,
    modelContent: matches.join("\n") || "(no matches)",
    preview: matches.slice(0, 10).join("\n"),
  };
}

export async function handleEditFile(
  ctx: ToolHandlerContext,
  args: { path?: string; oldText?: string; newText?: string; replaceAll?: boolean },
): Promise<ToolHandlerResult> {
  if (!args?.path) {
    return { ok: false, summary: "edit_file: missing path", modelContent: "Error: path is required." };
  }
  if (args.oldText == null || args.newText == null) {
    return {
      ok: false,
      summary: "edit_file: missing oldText/newText",
      modelContent: "Error: oldText and newText are required.",
    };
  }
  const { abs, normalized } = resolveSandboxedPath(ctx.appDir, args.path);
  const before = await tryReadFile(abs);
  if (before === null) {
    return {
      ok: false,
      summary: `edit_file ${normalized} (not found)`,
      modelContent: `Error: File not found: ${normalized}. Use write_file to create it.`,
    };
  }
  const occurrences = before.split(args.oldText).length - 1;
  if (occurrences === 0) {
    return {
      ok: false,
      summary: `edit_file ${normalized} (snippet not found)`,
      modelContent: `Error: oldText not found in ${normalized}.`,
    };
  }
  if (occurrences > 1 && !args.replaceAll) {
    return {
      ok: false,
      summary: `edit_file ${normalized} (${occurrences} matches — ambiguous)`,
      modelContent: `Error: oldText appears ${occurrences} times. Add more context or pass replaceAll=true.`,
    };
  }
  const after = args.replaceAll
    ? before.split(args.oldText).join(args.newText)
    : before.replace(args.oldText, args.newText);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, after, "utf-8");
  const fileEdit: FileEditRecord = {
    id: nextEditId(),
    path: normalized,
    op: "update",
    before,
    after,
  };
  return {
    ok: true,
    summary: `edit_file ${normalized} (${occurrences} replacement${occurrences > 1 ? "s" : ""})`,
    modelContent: `OK: edited ${normalized} (${occurrences} replacement${occurrences > 1 ? "s" : ""}).`,
    fileEdit,
  };
}

export async function handleWriteFile(
  ctx: ToolHandlerContext,
  args: { path?: string; content?: string },
): Promise<ToolHandlerResult> {
  if (!args?.path) {
    return { ok: false, summary: "write_file: missing path", modelContent: "Error: path is required." };
  }
  if (typeof args.content !== "string") {
    return {
      ok: false,
      summary: "write_file: missing content",
      modelContent: "Error: content is required (string).",
    };
  }
  const { abs, normalized } = resolveSandboxedPath(ctx.appDir, args.path);
  const before = await tryReadFile(abs);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, args.content, "utf-8");
  const fileEdit: FileEditRecord = {
    id: nextEditId(),
    path: normalized,
    op: before === null ? "create" : "update",
    before,
    after: args.content,
  };
  return {
    ok: true,
    summary: `write_file ${normalized} (${before === null ? "created" : "updated"}, ${args.content.length} bytes)`,
    modelContent: `OK: wrote ${normalized} (${args.content.length} bytes).`,
    fileEdit,
  };
}

export type ToolName =
  | "read_file"
  | "list_files"
  | "grep"
  | "edit_file"
  | "write_file";

export async function dispatchTool(
  name: string,
  args: unknown,
  ctx: ToolHandlerContext,
): Promise<ToolHandlerResult> {
  const a = (args ?? {}) as Record<string, unknown>;
  try {
    switch (name as ToolName) {
      case "read_file":
        return await handleReadFile(ctx, a as { path?: string });
      case "list_files":
        return await handleListFiles(ctx, a as { dir?: string });
      case "grep":
        return await handleGrep(ctx, a as { pattern?: string; path?: string });
      case "edit_file":
        return await handleEditFile(ctx, a as { path?: string; oldText?: string; newText?: string; replaceAll?: boolean });
      case "write_file":
        return await handleWriteFile(ctx, a as { path?: string; content?: string });
      default:
        return {
          ok: false,
          summary: `unknown tool: ${name}`,
          modelContent: `Error: unknown tool "${name}".`,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      summary: `${name} failed: ${message}`,
      modelContent: `Error: ${message}`,
    };
  }
}
