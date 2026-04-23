/**
 * Work Report Auto-Sender — Configuration
 *
 * Copy this file or set environment variables to override defaults.
 * Priority: ENV > config object defaults
 */

// ─── Author / Member Mapping ──────────────────────────────────────────────────
// Map git email addresses to human-readable names.
// Add every team member here.
export const AUTHOR_MAP: Record<string, string> = {
  // "git-email@example.com": "Display Name",
  "john@example.com": "John",
  "alice@example.com": "Alice",
  "bob@example.com": "Bob",
};

// ─── Report Mode ─────────────────────────────────────────────────────────────
// "daily"  → covers yesterday (one day)
// "weekly" → covers the last 7 days (Mon–Sun or rolling 7 days)
export type ReportMode = "daily" | "weekly";

export const DEFAULT_MODE: ReportMode =
  (process.env.REPORT_MODE as ReportMode) ?? "daily";

// ─── SMTP / Email Config ──────────────────────────────────────────────────────
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true → port 465, false → STARTTLS
  user: string;
  pass: string;
}

export const SMTP_CONFIG: SmtpConfig = {
  host: process.env.SMTP_HOST ?? "smtp.example.com",
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: (process.env.SMTP_SECURE ?? "true") === "true",
  user: process.env.SMTP_USER ?? "",
  pass: process.env.SMTP_PASS ?? "",
};

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? `"WorkReport Bot" <${SMTP_CONFIG.user}>`;

// Comma-separated list of recipient addresses, or a single address
export const EMAIL_TO: string[] = (
  process.env.EMAIL_TO ?? ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const EMAIL_CC: string[] = (process.env.EMAIL_CC ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ─── Git Repo Path ────────────────────────────────────────────────────────────
// Defaults to the project root (two levels up from worklogs/lib/)
import path from "path";
export const REPO_PATH =
  process.env.REPO_PATH ?? path.resolve(__dirname, "../../");

// ─── Git Branches ─────────────────────────────────────────────────────────────
// Comma-separated list of branch names to include in the report.
// Leave empty (or unset GIT_BRANCHES) to use the current branch only.
// Examples:
//   GIT_BRANCHES="master"               → single branch
//   GIT_BRANCHES="master,develop,main"  → multiple branches
export const GIT_BRANCHES: string[] = (process.env.GIT_BRANCHES ?? "master")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ─── Output Directory ─────────────────────────────────────────────────────────
export const LOGS_DIR =
  process.env.LOGS_DIR ?? path.resolve(__dirname, "../logs");

// ─── Report Template ──────────────────────────────────────────────────────────
// Placeholders:
//   {{reportMode}}   → "日报" | "周报"
//   {{dateRange}}    → e.g. "2026-04-15 ~ 2026-04-22"
//   {{generatedAt}}  → ISO timestamp
//   {{memberCount}}  → number of contributors
//   {{totalCommits}} → total commit count
//   {{summary}}      → auto-generated one-liner per member
//   {{memberSections}} → per-member detail blocks
export const REPORT_TEMPLATE = `# [{{reportMode}} Work Report] {{dateRange}}

| Field | Value |
|-------|-------|
| Report Type | {{reportMode}} Report |
| Period | {{dateRange}} |
| Generated At | {{generatedAt}} |
| Contributors | {{memberCount}} |

---

## 1. Summary

{{summary}}

---

## 2. Work Details by Member

{{memberSections}}

---

## 3. Notes

> This report was auto-generated from Git commit history.
> Feel free to edit this file before sending.
`;

export const MEMBER_SECTION_TEMPLATE = `### {{memberName}}

{{workList}}
`;
