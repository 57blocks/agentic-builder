#!/usr/bin/env tsx
/**
 * Work Report — Send Only
 *
 * Reads an already-generated report file and sends it via email.
 * This lets you manually edit the report before sending.
 *
 * Usage:
 *   pnpm report:send            # sends today's weekly log (auto-detect path)
 *   pnpm report:send weekly     # explicitly weekly
 *   pnpm report:send daily      # explicitly daily
 *   pnpm report:send ./worklogs/logs/2026-04-22_weekly.md  # explicit file path
 */

import fs from "fs";
import path from "path";
import { LOGS_DIR, DEFAULT_MODE, type ReportMode } from "./config.js";
import { getDateRange, formatDate } from "./git-reader.js";
import { sendReport } from "./mailer.js";

const args = process.argv.slice(2);

// Detect if the first arg looks like a file path
const fileArg = args.find((a) => a.endsWith(".md") || a.startsWith(".") || a.startsWith("/"));
const modeArg = args.find((a) => a === "daily" || a === "weekly");
const mode: ReportMode = (modeArg as ReportMode) ?? DEFAULT_MODE;

async function resolveFilePath(): Promise<string> {
  if (fileArg) {
    const resolved = path.resolve(process.cwd(), fileArg);
    if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
    return resolved;
  }

  // Auto-detect from mode + date range
  const { until } = getDateRange(mode);
  const suffix = mode === "weekly" ? "_weekly" : "";
  const fileName = `${until}${suffix}.md`;
  const filePath = path.join(LOGS_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Report file not found: ${filePath}\nRun "pnpm report:gen ${mode}" first to generate it.`
    );
  }
  return filePath;
}

async function main() {
  const filePath = await resolveFilePath();
  const markdown = fs.readFileSync(filePath, "utf-8");
  const { since, until } = getDateRange(mode);

  console.log(`\n✉️  Sending report: ${filePath}`);
  await sendReport({ markdown, since, until, mode });
  console.log(`\n✅ Done.\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
