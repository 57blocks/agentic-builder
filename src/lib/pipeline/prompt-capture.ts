/**
 * Captures the actual role prompts in use at the moment a coding-session
 * report is written. Hashes are computed over the prompt content returned by
 * `buildRolePrompt(role, ctx)` — NOT over the source file on disk — so that
 * uncommitted edits to `role-prompts.ts` are still distinguishable run-to-run.
 *
 * Output is persisted to `.ralph/role-prompts.<sessionId>.json` for forensic
 * diffing; the markdown report only carries an appendix with hash fingerprints.
 */
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  buildRolePrompt,
  loadPromptContext,
} from "@/lib/langgraph/role-prompts";
import type { CodingAgentRole } from "@/lib/pipeline/types";

const execFileAsync = promisify(execFile);

const ROLES: CodingAgentRole[] = ["architect", "frontend", "backend", "test", "fullstack"];

export interface RolePromptEntry {
  role: CodingAgentRole;
  /** SHA-256 of the prompt content actually returned by buildRolePrompt. */
  hash: string;
  bytes: number;
  /** The full prompt content. Persisted to JSON for forensic diff; never put
   *  into the markdown report (too large). */
  content: string;
}

export interface RolePromptsCapture {
  /** Always true once capture runs successfully; false if it crashed. */
  present: boolean;
  capturedAt: string;
  /** Generator git SHA (HEAD), even if role-prompts.ts is dirty. */
  gitHeadSha?: string;
  /** Whether role-prompts.ts has uncommitted modifications. */
  workingTreeDirty?: boolean;
  /** SHA-256 over all role hashes (sorted by role name). One-line A/B equality check. */
  promptSetHash: string;
  entries: RolePromptEntry[];
  /** Captured if read fails. */
  error?: string;
}

export function hashPrompt(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function computePromptSetHash(entries: RolePromptEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.role.localeCompare(b.role));
  const joined = sorted.map((e) => `${e.role}:${e.hash}`).join("|");
  return hashPrompt(joined);
}

async function detectDirty(rolePromptsRelPath: string, cwd: string): Promise<boolean | undefined> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["status", "--porcelain", rolePromptsRelPath],
      { cwd, timeout: 5_000 },
    );
    return stdout.trim().length > 0;
  } catch {
    return undefined;
  }
}

async function detectHeadSha(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd,
      timeout: 5_000,
    });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export interface CapturePromptsOptions {
  /** Generator project root (where role-prompts.ts lives) — used for git status. */
  generatorRoot: string;
  /** Generated-code outputDir — passed to loadPromptContext so prompt content
   *  reflects the same scaffolds-applied flags the LLM saw. */
  outputDir: string;
}

const ROLE_PROMPTS_REL = "src/lib/langgraph/role-prompts.ts";

export async function capturePrompts(opts: CapturePromptsOptions): Promise<RolePromptsCapture> {
  try {
    const ctx = await loadPromptContext(opts.outputDir);
    const entries: RolePromptEntry[] = [];
    for (const role of ROLES) {
      const content = buildRolePrompt(role, ctx);
      entries.push({
        role,
        hash: hashPrompt(content),
        bytes: Buffer.byteLength(content, "utf8"),
        content,
      });
    }
    const [gitHeadSha, workingTreeDirty] = await Promise.all([
      detectHeadSha(opts.generatorRoot),
      detectDirty(ROLE_PROMPTS_REL, opts.generatorRoot),
    ]);
    return {
      present: true,
      capturedAt: new Date().toISOString(),
      gitHeadSha,
      workingTreeDirty,
      promptSetHash: computePromptSetHash(entries),
      entries,
    };
  } catch (err) {
    return {
      present: false,
      capturedAt: new Date().toISOString(),
      promptSetHash: "",
      entries: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
