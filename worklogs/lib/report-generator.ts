/**
 * Work Report Auto-Sender — Report Generator
 *
 * Renders a Markdown work report from grouped commit data,
 * then persists it to the configured logs directory.
 */

import fs from "fs";
import path from "path";
import {
  LOGS_DIR,
  MEMBER_SECTION_TEMPLATE,
  REPORT_TEMPLATE,
  type ReportMode,
} from "./config.js";
import { type CommitsByMember } from "./git-reader.js";

// ─── Simple template engine ───────────────────────────────────────────────────

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

// ─── Date range label ─────────────────────────────────────────────────────────

export function buildDateRangeLabel(since: string, until: string): string {
  return since === until ? since : `${since} ~ ${until}`;
}

// ─── Per-member commit block ──────────────────────────────────────────────────

function renderMemberSection(
  memberName: string,
  byDate: Map<string, { hash: string; subject: string }[]>
): string {
  const sortedDates = [...byDate.keys()].sort();

  const workList = sortedDates
    .map((date) => {
      const commits = byDate.get(date)!;
      const lines = commits
        .map((c) => `- ${c.subject}`)
        .join("\n");
      return `**${date}**\n\n${lines}`;
    })
    .join("\n\n");

  return render(MEMBER_SECTION_TEMPLATE, { memberName, workList });
}

// ─── Summary block ────────────────────────────────────────────────────────────

function buildSummary(
  commitsByMember: CommitsByMember,
  sortedMembers: string[]
): string {
  if (sortedMembers.length === 0) return "_No work recorded for this period._";
  return sortedMembers
    .map((name) => {
      const byDate = commitsByMember.get(name)!;
      const days = [...byDate.keys()].sort();
      const dayRange = days.length === 1 ? days[0] : `${days[0]} ~ ${days[days.length - 1]}`;
      return `- **${name}**: active on ${days.length} day(s) (${dayRange})`;
    })
    .join("\n");
}

// ─── Full report render ───────────────────────────────────────────────────────

export interface ReportResult {
  /** Rendered Markdown content */
  markdown: string;
  /** Absolute path where the file was saved */
  filePath: string;
  /** YYYY-MM-DD file stem (uses `until` date) */
  dateStem: string;
}

export function generateReport(
  commitsByMember: CommitsByMember,
  since: string,
  until: string,
  mode: ReportMode
): ReportResult {
  const sortedMembers = [...commitsByMember.keys()].sort();

  const memberSections =
    sortedMembers.length === 0
      ? "_No commits found for this period._\n"
      : sortedMembers
          .map((name) => renderMemberSection(name, commitsByMember.get(name)!))
          .join("\n---\n\n");

  const markdown = render(REPORT_TEMPLATE, {
    reportMode: mode === "daily" ? "Daily" : "Weekly",
    dateRange: buildDateRangeLabel(since, until),
    memberSections,
    summary: buildSummary(commitsByMember, sortedMembers),
    memberCount: String(sortedMembers.length),
    generatedAt: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
  });

  // ── Persist to file ────────────────────────────────────────────────────────
  fs.mkdirSync(LOGS_DIR, { recursive: true });

  // For daily: YYYY-MM-DD.md  |  for weekly: YYYY-MM-DD_weekly.md (until date)
  const suffix = mode === "weekly" ? "_weekly" : "";
  const dateStem = until;
  const fileName = `${dateStem}${suffix}.md`;
  const filePath = path.join(LOGS_DIR, fileName);

  fs.writeFileSync(filePath, markdown, "utf-8");

  return { markdown, filePath, dateStem };
}
