/**
 * Work Report Auto-Sender — Git Commit Reader
 *
 * Reads git log from the configured repo path and returns commits
 * grouped by author and date within the requested date range.
 */

import { execSync } from "child_process";
import { AUTHOR_MAP, GIT_BRANCHES, REPO_PATH } from "./config.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommitEntry {
  hash: string;
  authorEmail: string;
  authorName: string;      // resolved from AUTHOR_MAP or raw git name
  date: string;            // YYYY-MM-DD
  subject: string;
}

/** Commits grouped: { memberName → { date → CommitEntry[] } } */
export type CommitsByMember = Map<string, Map<string, CommitEntry[]>>;

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD string for a Date object */
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns [since, until] as YYYY-MM-DD strings.
 *  - daily  → yesterday
 *  - weekly → 7 days ago (same weekday last week) → today (inclusive)
 */
export function getDateRange(mode: "daily" | "weekly"): {
  since: string;
  until: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (mode === "daily") {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { since: formatDate(yesterday), until: formatDate(yesterday) };
  }

  // weekly: same day last week → today (e.g. Wed Apr 15 → Wed Apr 22)
  const since = new Date(today);
  since.setDate(today.getDate() - 7);
  return { since: formatDate(since), until: formatDate(today) };
}

// ─── Git log reader ───────────────────────────────────────────────────────────

const GIT_LOG_FORMAT = [
  "%H",   // hash
  "%ae",  // author email
  "%an",  // author name
  "%cs",  // committer date YYYY-MM-DD
  "%s",   // subject
].join("%x1F"); // unit-separator as field delimiter (safe)

/**
 * Read all commits in [since, until] from the configured repository.
 * Returns an array of raw CommitEntry objects.
 */
export function readCommits(since: string, until: string): CommitEntry[] {
  // Build branch list: use configured branches, fall back to HEAD
  const branches = GIT_BRANCHES.length > 0 ? GIT_BRANCHES : ["HEAD"];

  const cmd = [
    "git",
    "-C",
    JSON.stringify(REPO_PATH),
    "log",
    `--after="${since} 00:00:00"`,
    `--before="${until} 23:59:59"`,
    `--format=${GIT_LOG_FORMAT}`,
    // List specified branches (space-separated) instead of --all
    ...branches,
  ].join(" ");

  let raw: string;
  try {
    raw = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`git log failed: ${msg}`);
  }

  const entries: CommitEntry[] = [];
  // Deduplicate by hash in case a commit reachable from multiple listed branches
  const seen = new Set<string>();

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split("\x1F");
    if (parts.length < 5) continue;

    const [hash, authorEmail, gitName, date, ...subjectParts] = parts;

    if (seen.has(hash)) continue;
    seen.add(hash);

    const subject = subjectParts.join("\x1F").trim();

    // Resolve display name: AUTHOR_MAP by email, then AUTHOR_MAP by gitName, then raw gitName
    const authorName =
      AUTHOR_MAP[authorEmail] ??
      AUTHOR_MAP[gitName] ??
      gitName;

    entries.push({ hash, authorEmail, authorName, date, subject });
  }

  return entries;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

/**
 * Groups an array of CommitEntry into a nested Map:
 *   memberName → date → CommitEntry[]
 */
export function groupCommits(commits: CommitEntry[]): CommitsByMember {
  const result: CommitsByMember = new Map();

  for (const commit of commits) {
    const { authorName, date } = commit;

    if (!result.has(authorName)) {
      result.set(authorName, new Map());
    }
    const byDate = result.get(authorName)!;

    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(commit);
  }

  return result;
}
