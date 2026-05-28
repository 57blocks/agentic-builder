/**
 * Sequelize migration quality lint — detects non-idempotent / FK-order /
 * mixed-DDL anti-patterns introduced by codegen.
 *
 * Sibling of `migration-coverage.ts`: that file checks "did the task write a
 * migration at all?"; THIS file checks "is the migration safe to re-run?".
 *
 * Why this is a separate self-heal pass (vs. only relying on prompting):
 *   - LLM-written migrations default to idiomatic `queryInterface.createTable
 *     / addColumn / addIndex / bulkInsert`. Those throw the second time
 *     they run, which the supervisor's replan / retry loops invariably do.
 *   - The skill `migration-idempotency.md` reduces but does not eliminate
 *     occurrences (LLM may still slip). This lint is the deterministic
 *     backstop.
 *
 * Findings are RULE-BASED text greps against the migration file contents.
 * We deliberately do NOT parse TypeScript here — that adds a heavy
 * dependency for marginal benefit; the rule patterns are stable enough
 * to grep accurately when the migration is written in the canonical
 * shape (`async function up({ context: queryInterface })` / direct calls).
 *
 * A finding's `kind` maps 1:1 to a hard rule in the SKILL document so the
 * repair worker can quote the rule back to the implementing LLM.
 */

export type MigrationQualityRuleId =
  | "non-idempotent-create-table"
  | "non-idempotent-add-column"
  | "non-idempotent-add-index"
  | "non-idempotent-add-constraint"
  | "bulk-insert-without-on-conflict"
  | "drop-in-create-migration"
  | "fk-references-future-migration";

export interface MigrationQualityFinding {
  /** Project-relative path of the migration file with the issue. */
  filePath: string;
  /** Numeric prefix parsed from filename (NaN if filename has no prefix). */
  filePrefix: number;
  /** Rule id (stable, for repair instructions + tests). */
  rule: MigrationQualityRuleId;
  /** 1-indexed line where the offending statement starts (0 when N/A). */
  line: number;
  /** Verbatim line content (truncated to 240 chars). For repair messages. */
  snippet: string;
  /** Short human-readable explanation specific to this finding. */
  message: string;
}

export interface MigrationFile {
  /** Project-relative path, forward-slash. */
  path: string;
  /** Full file content. */
  content: string;
}

export interface MigrationQualityCheckInput {
  /** Every migration file currently on disk. Order doesn't matter — the
   *  detector sorts by filename prefix internally for FK-order analysis. */
  files: readonly MigrationFile[];
}

export interface MigrationQualityCheckResult {
  ok: boolean;
  /** All findings, deduped by (filePath, rule, line). Ordered by filePath
   *  asc then line asc for stable presentation. */
  findings: MigrationQualityFinding[];
  /** Total migration files scanned. */
  filesScanned: number;
}

// ─── Regex patterns ────────────────────────────────────────────────────────
//
// Each rule pattern is purposely loose on "what the call looks like" and
// strict on "what makes it safe": we want to match e.g.
//   `await queryInterface.createTable(`
//   `queryInterface.createTable(`
//   `q.createTable(`            // when aliased earlier in the file
//   `await q.createTable(`
// and EXCLUDE
//   `await q.query(`CREATE TABLE IF NOT EXISTS users ...`)`   (idempotent)
//   `// queryInterface.createTable(...)`                       (comment)
//   `/* ... queryInterface.createTable(...) ... */`             (block comment)
//
// We treat any `q\.` / `queryInterface\.` / `queryInterface\.sequelize\.`
// chain as the receiver. Comments are stripped per-line before matching.

const RECEIVER = /(?:queryInterface|q|qi)/;

const RULE_PATTERNS: Array<{
  rule: MigrationQualityRuleId;
  call: RegExp;
  message: string;
}> = [
  {
    rule: "non-idempotent-create-table",
    call: new RegExp(`${RECEIVER.source}\\.createTable\\s*\\(`),
    message:
      "Use `queryInterface.sequelize.query(`CREATE TABLE IF NOT EXISTS …`)` instead — `createTable` throws on re-run.",
  },
  {
    rule: "non-idempotent-add-column",
    call: new RegExp(`${RECEIVER.source}\\.addColumn\\s*\\(`),
    message:
      "Wrap the ADD COLUMN in a `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns …) THEN ALTER TABLE … END IF; END $$` block.",
  },
  {
    rule: "non-idempotent-add-index",
    call: new RegExp(`${RECEIVER.source}\\.addIndex\\s*\\(`),
    message:
      "Use `queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS …`)` instead — `addIndex` throws on re-run.",
  },
  {
    rule: "non-idempotent-add-constraint",
    call: new RegExp(`${RECEIVER.source}\\.addConstraint\\s*\\(`),
    message:
      "Use raw SQL `ALTER TABLE … ADD CONSTRAINT IF NOT EXISTS …` (or `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_constraint …)` block).",
  },
  {
    rule: "bulk-insert-without-on-conflict",
    call: new RegExp(`${RECEIVER.source}\\.bulkInsert\\s*\\(`),
    message:
      "Switch to `queryInterface.sequelize.query(`INSERT … ON CONFLICT (<pk>) DO NOTHING`)`. `bulkInsert` has no upsert semantic.",
  },
];

const COMMENT_STRIP =
  // Best-effort: drop the trailing line comment AFTER the call would have
  // matched; don't try to handle string literals containing `//` — the
  // pattern is meant for the canonical `await q.createTable(...)` line.
  /(?<!:)\/\/.*$/;

const BLOCK_COMMENT_OPEN = /\/\*/;
const BLOCK_COMMENT_CLOSE = /\*\//;

const RAW_IF_NOT_EXISTS = /IF\s+NOT\s+EXISTS/i;
const ON_CONFLICT = /ON\s+CONFLICT/i;
const DO_BLOCK = /\bDO\s+\$\$/i;

const FK_REFERENCES = /\bREFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
const FILENAME_PREFIX = /^(\d+)[-_]/;

const DROP_TABLE_OR_COLUMN =
  /\b(DROP\s+TABLE|DROP\s+COLUMN|drop(?:Table|Column))\b/i;
const CREATE_TABLE_OR_COLUMN =
  /\b(CREATE\s+TABLE|ADD\s+COLUMN|createTable|addColumn)\b/i;

// ─── Public detector ───────────────────────────────────────────────────────

export function checkMigrationQuality(
  input: MigrationQualityCheckInput,
): MigrationQualityCheckResult {
  const findings: MigrationQualityFinding[] = [];

  const sorted = [...input.files].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  // ── 1. Per-file rule checks ─────────────────────────────────────────────
  for (const file of sorted) {
    const prefix = parseFilenamePrefix(file.path);
    const lines = file.content.split(/\r?\n/);
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i] ?? "";
      const { stripped, ended } = stripCommentsAndTrack(
        rawLine,
        inBlockComment,
      );
      inBlockComment = ended;
      if (!stripped.trim()) continue;

      for (const pat of RULE_PATTERNS) {
        if (pat.call.test(stripped)) {
          findings.push({
            filePath: file.path,
            filePrefix: prefix,
            rule: pat.rule,
            line: i + 1,
            snippet: truncate(rawLine.trim(), 240),
            message: pat.message,
          });
        }
      }
    }

    // Rule 4 (drop-in-create-migration): only fires when `up()` itself
    // contains BOTH a CREATE/ADD and a DROP statement. The standard
    // migration shape (up CREATEs, down DROPs) is correct and MUST not
    // trip the lint. We split the file into "up" and "down" segments
    // by scanning for `function up` / `function down` boundaries.
    const upSegment = extractUpFunctionBody(file.content);
    if (upSegment !== null) {
      const upHasCreate = CREATE_TABLE_OR_COLUMN.test(upSegment);
      const upHasDrop = DROP_TABLE_OR_COLUMN.test(upSegment);
      if (upHasCreate && upHasDrop) {
        findings.push({
          filePath: file.path,
          filePrefix: prefix,
          rule: "drop-in-create-migration",
          line: 0,
          snippet: "",
          message:
            "The `up()` function contains both CREATE/ADD and DROP — split the drop into a new numbered migration so partial-state re-runs stay recoverable.",
        });
      }
    }

    // Heuristic guard against false positives on rules 1-3: if the offending
    // call is on the same line as `IF NOT EXISTS` (defensive aliasing), drop
    // it. Rare but cheap to check.
    for (let k = findings.length - 1; k >= 0; k--) {
      const f = findings[k];
      if (f.filePath !== file.path) continue;
      if (f.line === 0) continue;
      if (RAW_IF_NOT_EXISTS.test(f.snippet) || ON_CONFLICT.test(f.snippet) || DO_BLOCK.test(f.snippet)) {
        findings.splice(k, 1);
      }
    }
  }

  // ── 2. FK-order check ───────────────────────────────────────────────────
  //
  // For every `REFERENCES <table>` in any migration, find the EARLIEST
  // migration (by numeric prefix) that creates `<table>` (signalled by
  // `CREATE TABLE [IF NOT EXISTS] <table>` or `createTable("<table>"`).
  // If no migration creates it OR the creating migration has a prefix
  // STRICTLY GREATER than the referencing one, flag the referencing file.
  const tableCreators = new Map<string, number>(); // tableName → earliest prefix
  for (const file of sorted) {
    const prefix = parseFilenamePrefix(file.path);
    if (!Number.isFinite(prefix)) continue;
    for (const t of extractCreatedTables(file.content)) {
      const existing = tableCreators.get(t);
      if (existing === undefined || prefix < existing) {
        tableCreators.set(t, prefix);
      }
    }
  }

  for (const file of sorted) {
    const prefix = parseFilenamePrefix(file.path);
    if (!Number.isFinite(prefix)) continue;
    const refs = extractFkReferences(file.content);
    for (const ref of refs) {
      const creatorPrefix = tableCreators.get(ref.table);
      const selfDefined = isSelfCreation(file.content, ref.table);
      if (selfDefined) continue;
      if (creatorPrefix === undefined || creatorPrefix > prefix) {
        findings.push({
          filePath: file.path,
          filePrefix: prefix,
          rule: "fk-references-future-migration",
          line: ref.line,
          snippet: truncate(ref.snippet, 240),
          message:
            creatorPrefix === undefined
              ? `REFERENCES table "${ref.table}" but no migration creates it. Add the CREATE TABLE or fix the typo.`
              : `REFERENCES table "${ref.table}" but its CREATE migration has prefix ${creatorPrefix} > this file's prefix ${prefix}. Renumber so the referenced table is created first.`,
        });
      }
    }
  }

  // ── 3. Dedupe + sort ────────────────────────────────────────────────────
  const seen = new Set<string>();
  const deduped: MigrationQualityFinding[] = [];
  for (const f of findings) {
    const key = `${f.filePath}::${f.rule}::${f.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(f);
  }
  deduped.sort(
    (a, b) =>
      a.filePath.localeCompare(b.filePath) || a.line - b.line || a.rule.localeCompare(b.rule),
  );

  return {
    ok: deduped.length === 0,
    findings: deduped,
    filesScanned: input.files.length,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseFilenamePrefix(filePath: string): number {
  const base = filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;
  const m = base.match(FILENAME_PREFIX);
  return m ? Number(m[1]) : NaN;
}

function stripCommentsAndTrack(
  rawLine: string,
  inBlockComment: boolean,
): { stripped: string; ended: boolean } {
  if (inBlockComment) {
    const close = rawLine.search(BLOCK_COMMENT_CLOSE);
    if (close < 0) return { stripped: "", ended: true };
    return { stripped: rawLine.slice(close + 2), ended: false };
  }
  let out = rawLine;
  const open = out.search(BLOCK_COMMENT_OPEN);
  if (open >= 0) {
    const close = out.indexOf("*/", open + 2);
    if (close < 0) {
      out = out.slice(0, open);
      return { stripped: out.replace(COMMENT_STRIP, ""), ended: true };
    }
    out = out.slice(0, open) + out.slice(close + 2);
  }
  return { stripped: out.replace(COMMENT_STRIP, ""), ended: false };
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const CREATE_TABLE_RAW =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
const CREATE_TABLE_QI =
  /createTable\s*\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_]*)["'`]/g;

function extractCreatedTables(content: string): string[] {
  const names = new Set<string>();
  for (const m of content.matchAll(CREATE_TABLE_RAW)) names.add(m[1]);
  for (const m of content.matchAll(CREATE_TABLE_QI)) names.add(m[1]);
  return Array.from(names);
}

interface FkRef {
  table: string;
  line: number;
  snippet: string;
}

function extractFkReferences(content: string): FkRef[] {
  const refs: FkRef[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    for (const m of line.matchAll(FK_REFERENCES)) {
      refs.push({ table: m[1], line: i + 1, snippet: line.trim() });
    }
  }
  return refs;
}

function isSelfCreation(content: string, table: string): boolean {
  const variants = [
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?["'\`]?${escapeRegex(table)}\\b`, "i"),
    new RegExp(`createTable\\s*\\(\\s*["'\`]${escapeRegex(table)}["'\`]`),
  ];
  return variants.some((re) => re.test(content));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Best-effort extraction of the body of the `up` function (or method) so
 * the drop-in-create-migration rule scopes to `up`, not the whole file
 * (every Sequelize migration legitimately has `up` CREATEing and `down`
 * DROPping).
 *
 * Matches the common shapes:
 *   - `export async function up({ context: queryInterface }) { ... }`
 *   - `async function up(...) { ... }`
 *   - `export const up: Migration = async ({ context }) => { ... };`
 *   - `up: async ({ context }) => { ... }`
 *
 * Returns `null` when no `up` boundary can be identified — the caller
 * silently skips the rule in that case rather than risk a false positive.
 */
function extractUpFunctionBody(content: string): string | null {
  const startMatch = /\b(?:function|const|let|var)\s+up\b|[\s({,]up\s*[:=]/.exec(
    content,
  );
  if (!startMatch) return null;
  const fromUp = content.slice(startMatch.index);
  // Locate the next `function down` / `const down` / `: async`-style `down`
  // boundary; the up body is everything between the matches.
  const downBoundary = /\b(?:function|const|let|var)\s+down\b|[\s({,]down\s*[:=]/.exec(
    fromUp.slice(1),
  );
  if (downBoundary) {
    return fromUp.slice(0, downBoundary.index + 1);
  }
  // No `down` defined — the whole file from `up` onward is the up body
  // (a single-direction migration).
  return fromUp;
}
