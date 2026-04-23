#!/usr/bin/env tsx
import { DEFAULT_MODE, type ReportMode } from "./config.js";
import { getDateRange, groupCommits, readCommits } from "./git-reader.js";
import { generateReport } from "./report-generator.js";
const args = process.argv.slice(2);
const modeArg = args.find((a) => a === "daily" || a === "weekly");
const mode: ReportMode = (modeArg as ReportMode) ?? DEFAULT_MODE;
async function main() {
  const { since, until } = getDateRange(mode);
  console.log("Date range: " + since + " -> " + until);
  const commits = readCommits(since, until);
  console.log("Found " + commits.length + " commit(s)");
  const commitsByMember = groupCommits(commits);
  const { filePath } = generateReport(commitsByMember, since, until, mode);
  console.log("Report saved to: " + filePath);
  console.log("Run: pnpm report:send " + mode);
}
main().catch((err) => { console.error("Error:", err instanceof Error ? err.message : err); process.exit(1); });
