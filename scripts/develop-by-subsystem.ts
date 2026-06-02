/**
 * One-shot driver: decompose a PRD into subsystems and build them one-by-one
 * against a RUNNING dev server (the foundation first, then each domain layer).
 *
 * Usage:
 *   npx tsx scripts/develop-by-subsystem.ts \
 *     --prd <path/to/PRD.md> \
 *     --tasks <path/to/tasks.json> \
 *     --code-output-dir <dir under generated-code> \
 *     [--base-url http://127.0.0.1:3000] [--tier L] [--run-id <id>]
 *
 *   # or reuse an existing .blueprint/subsystems.json instead of decomposing:
 *   npx tsx scripts/develop-by-subsystem.ts --tasks <tasks.json> --code-output-dir <dir> --manifest
 *
 * Loads OPENROUTER_API_KEY from .env.local and forces the OpenRouter path so the
 * decomposer's LLM call works from the CLI. Requires the Next.js app running so
 * the per-subsystem coding calls (POST /api/agents/coding) succeed.
 */
import { readFileSync, existsSync } from "fs";

import { developBySubsystem } from "../src/lib/pipeline/subsystems/develop";
import type { KickoffWorkItem } from "../src/lib/pipeline/types";

function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  loadDotEnv(".env.local");
  process.env.USE_OPENROUTER = process.env.USE_OPENROUTER ?? "1";

  const prdPath = arg("prd");
  const tasksPath = arg("tasks");
  const codeOutputDir = arg("code-output-dir");
  const baseUrl = arg("base-url", "http://127.0.0.1:3000")!;
  const tier = arg("tier", "L") as "S" | "M" | "L";
  const runId = arg("run-id", `subsys-${Date.now()}`)!;
  const useExistingManifest = flag("manifest");

  if (!tasksPath || !codeOutputDir) {
    console.error("Required: --tasks <tasks.json> --code-output-dir <dir>. See header for usage.");
    process.exit(2);
  }
  if (!useExistingManifest && !prdPath) {
    console.error("Provide --prd <PRD.md> to decompose, or --manifest to reuse .blueprint/subsystems.json.");
    process.exit(2);
  }

  const allTasks = JSON.parse(readFileSync(tasksPath, "utf-8")) as KickoffWorkItem[];
  const prd = prdPath ? readFileSync(prdPath, "utf-8") : undefined;

  console.log(`[develop] runId=${runId} tier=${tier} tasks=${allTasks.length} baseUrl=${baseUrl}`);
  console.log(`[develop] manifest source: ${useExistingManifest ? ".blueprint/subsystems.json" : "decompose PRD"}`);

  const result = await developBySubsystem({
    projectRoot: process.cwd(),
    allTasks,
    codingContext: {
      baseUrl,
      runId,
      allTasks,
      codeOutputDir,
      projectTier: tier,
      onProgress: (id, chunk) => process.stdout.write(chunk.includes("error") ? `\n[${id}] ${chunk.slice(0, 120)}` : "."),
    },
    prd: useExistingManifest ? undefined : prd,
  });

  console.log("\n=== DEVELOP RESULT ===");
  console.log("ok=" + result.ok);
  if (result.manifest) console.log("subsystems: " + result.manifest.subsystems.map((s) => s.id).join(", "));
  if (result.plan) console.log("layers: " + JSON.stringify(result.plan.layers.map((l) => l.map((s) => s.subsystemId))));
  if (result.foundation) console.log("foundation: " + result.foundation.summary);
  for (const s of result.subsystems ?? []) console.log(`  • ${s.subsystemId}: ${s.status}${s.summary ? " — " + s.summary : ""}`);
  if (result.errors.length) console.log("ERRORS:\n" + result.errors.join("\n"));

  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
