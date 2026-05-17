import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import {
  generateSetupMd,
  type SetupKeyEntry,
} from "@/lib/agents/setup/setup-md-generator";
import { getEnvKeyMeta } from "@/lib/agents/setup/env-key-catalog";

export const maxDuration = 30;

/**
 * POST /api/agents/save-env-setup
 *
 * Body:
 *   {
 *     codeOutputDir: string,
 *     projectName?: string,
 *     infraChoice: "bundled" | "byo",
 *     envValues: Record<string, { value?: string; state: "provided" | "skipped" | "auto" | "deferred" }>,
 *   }
 *
 * Writes:
 *   <codeOutputDir>/.env          — actual values (omits skipped/deferred)
 *   <codeOutputDir>/SETUP.md       — human-readable companion doc
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const codeOutputDir =
    typeof obj.codeOutputDir === "string" ? obj.codeOutputDir : undefined;
  const projectName =
    typeof obj.projectName === "string" ? obj.projectName : undefined;
  const infraChoice = obj.infraChoice === "byo" ? "byo" : "bundled";
  const envValuesRaw =
    obj.envValues && typeof obj.envValues === "object"
      ? (obj.envValues as Record<string, unknown>)
      : {};

  const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);

  // Normalise entries — defend against malformed payloads from the client.
  const entries: SetupKeyEntry[] = [];
  const envLines: string[] = [];

  for (const [key, raw] of Object.entries(envValuesRaw)) {
    if (!key.match(/^[A-Z][A-Z0-9_]+$/)) continue;
    const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const state =
      rawObj.state === "provided" ||
      rawObj.state === "skipped" ||
      rawObj.state === "auto" ||
      rawObj.state === "deferred"
        ? rawObj.state
        : "skipped";
    const value = typeof rawObj.value === "string" ? rawObj.value : "";

    entries.push({ key, state });

    // Write to .env only when actually provided or auto-generated.
    if ((state === "provided" || state === "auto") && value.length > 0) {
      // Lightly escape only the truly dangerous chars; quote values with spaces.
      const safeValue = needsQuoting(value)
        ? `"${value.replace(/"/g, '\\"')}"`
        : value;
      envLines.push(`${key}=${safeValue}`);
    } else {
      // Comment out skipped keys so they're easy to grep + fill later.
      envLines.push(`# ${key}=    # ${describeSkip(key)}`);
    }
  }

  // Always inject NODE_ENV at the top if not provided.
  if (!envValuesRaw.NODE_ENV) {
    envLines.unshift("NODE_ENV=development");
  }

  const envFileContent = envLines.join("\n") + "\n";
  const setupMdContent = generateSetupMd({
    projectName,
    infraChoice,
    keys: entries,
  });

  try {
    await fs.mkdir(outputRoot, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(outputRoot, ".env"), envFileContent, "utf-8"),
      fs.writeFile(path.join(outputRoot, "SETUP.md"), setupMdContent, "utf-8"),
    ]);
    return NextResponse.json({
      ok: true,
      envPath: ".env",
      setupPath: "SETUP.md",
      providedCount: entries.filter((e) => e.state === "provided" || e.state === "auto").length,
      skippedCount: entries.filter((e) => e.state === "skipped").length,
      deferredCount: entries.filter((e) => e.state === "deferred").length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Write failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function needsQuoting(v: string): boolean {
  return /\s|["'\\$]/.test(v);
}

function describeSkip(key: string): string {
  const meta = getEnvKeyMeta(key);
  return meta.skipBehavior.replace(/\n/g, " ").slice(0, 120);
}
