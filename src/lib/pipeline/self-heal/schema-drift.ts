/**
 * Sequelize schema-drift detector — catches the "model declares a column,
 * no migration creates it" class of bugs that produced the F-04 outage
 * (login failed with `column "google_id" does not exist` because
 * `User.googleId` had been added to the model without a corresponding
 * migration).
 *
 * Sibling pure function alongside `migration-coverage.ts` (which checks
 * "did the task write any migration when it touched a model?") and
 * `migration-quality.ts` (which checks "is every migration safe to
 * re-run?"). This file checks the orthogonal question:
 *
 *   "For every `declare <fieldName>:` on a model, does the snake-case
 *    column name appear in ANY migration file under
 *    `backend/src/database/migrations/`?"
 *
 * Detection model — deliberately text-based (regex over the file content):
 *   - No TypeScript compile / no Sequelize import.
 *   - One pass per file; O(N_models * N_migrations) string scans.
 *   - Approximate by design: false-positives are preferable to misses
 *     because the repair adapter surfaces them as actionable tasks the
 *     verify-fix worker can either fix or `// schema-drift-ignore`.
 *
 * Opt-out — append `// schema-drift-ignore` on the same line as the
 * `declare` statement to skip that field (used for `DataTypes.VIRTUAL`
 * columns, accessor-only fields, etc.).
 *
 * Built-in skip list — Sequelize-managed identity / timestamp columns
 * that exist on every table by convention (`id`, `createdAt`, `updatedAt`,
 * `deletedAt`) are excluded so the lint focuses on PRD-derived fields.
 */

export type SchemaDriftRuleId =
  | "model-field-without-column"
  | "model-without-migration";

export interface SchemaDriftFinding {
  /** Project-relative path of the model file with the gap. */
  modelPath: string;
  /** Model file basename without `.ts` (e.g. "User"). */
  modelName: string;
  rule: SchemaDriftRuleId;
  /** camelCase declared name on the model. */
  fieldName?: string;
  /** snake_case form actually searched for. */
  snakeFieldName?: string;
  /** 1-indexed line number of the `declare` statement in the model file. */
  line?: number;
  /** Short human-readable message embedded in the repair directive. */
  message: string;
}

export interface ModelFile {
  /** Project-relative path, forward-slash. */
  path: string;
  /** File contents. */
  content: string;
}

export interface MigrationTextFile {
  /** Project-relative path, forward-slash. */
  path: string;
  /** File contents — concatenated together to form the search corpus. */
  content: string;
}

export interface SchemaDriftInput {
  models: readonly ModelFile[];
  migrations: readonly MigrationTextFile[];
}

export interface SchemaDriftResult {
  filesScanned: number;
  findings: SchemaDriftFinding[];
}

/** Fields managed implicitly by Sequelize — never flagged. */
const IMPLICIT_SEQUELIZE_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "deletedAt",
]);

/** Pragma comment that disables the lint for one `declare` line. */
const IGNORE_PRAGMA = "schema-drift-ignore";

/** Strip line / block comments from TypeScript source. We need this to
 *  avoid (a) treating commented-out `declare X` lines as real fields and
 *  (b) matching a snake_case column reference that lives in a comment as
 *  proof the column was migrated. Naive but adequate for our regex
 *  pipeline: no string-aware parser. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Convert a camelCase / PascalCase identifier to snake_case. */
function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

/** Extract every `declare <name>` token from a model file, preserving the
 *  source line number (1-indexed) so the repair directive can point the
 *  worker at the exact slot. Skips fields whose line carries the
 *  `// schema-drift-ignore` pragma. */
export function extractModelFields(content: string): Array<{
  fieldName: string;
  line: number;
}> {
  const fields: Array<{ fieldName: string; line: number }> = [];
  const lines = content.split("\n");
  // `declare <name>: ...` — `?` allowed after the identifier for optional
  // fields, e.g. `declare foo?: string`.
  const declareRe = /^\s*declare\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[?!]?\s*:/;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const m = raw.match(declareRe);
    if (!m) continue;
    if (raw.includes(IGNORE_PRAGMA)) continue;
    const fieldName = m[1];
    if (IMPLICIT_SEQUELIZE_FIELDS.has(fieldName)) continue;
    fields.push({ fieldName, line: i + 1 });
  }
  return fields;
}

/** Extract every `field: "snake_name"` mapping declared inside a model's
 *  `Model.init({ ... })` block. When present, the migration MUST create
 *  this exact column name — the camelCase JS name no longer matters. */
export function extractFieldRemaps(content: string): Map<string, string> {
  const remap = new Map<string, string>();
  // Match e.g.
  //   googleId: {
  //     type: DataTypes.STRING,
  //     allowNull: true,
  //     field: "google_id",
  //   },
  // We allow up to 24 intermediate lines between the property name and
  // the `field:` annotation (typical Sequelize init blocks fit easily).
  const re =
    /([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*\{[^{}]{0,1200}?\bfield\s*:\s*["']([a-z0-9_]+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    remap.set(m[1], m[2]);
  }
  return remap;
}

/** Does the search corpus (concatenated migration text) contain a token
 *  that "looks like" the column being declared / altered? We accept any
 *  occurrence of the exact snake-case name surrounded by non-word chars
 *  — this matches `CREATE TABLE … (foo_bar TEXT …)`, `ADD COLUMN foo_bar`,
 *  `addColumn("foo_bar", …)`, `field: "foo_bar"` etc. */
function corpusMentions(corpus: string, column: string): boolean {
  // Cheap fast-path before building a RegExp.
  if (!corpus.includes(column)) return false;
  const re = new RegExp(`(?:^|[^A-Za-z0-9_])${escapeRegExp(column)}(?:[^A-Za-z0-9_]|$)`);
  return re.test(corpus);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function checkSchemaDrift(input: SchemaDriftInput): SchemaDriftResult {
  const findings: SchemaDriftFinding[] = [];

  // Build the migration corpus ONCE — comment-stripped so a column name
  // mentioned only inside `/* */` comments doesn't accidentally "prove"
  // the column exists.
  const migrationCorpus = input.migrations
    .map((m) => stripComments(m.content))
    .join("\n");

  for (const model of input.models) {
    const cleaned = stripComments(model.content);
    const modelName = model.path.split("/").pop()?.replace(/\.tsx?$/i, "") ?? "Unknown";

    const fields = extractModelFields(cleaned);
    const remap = extractFieldRemaps(cleaned);

    if (fields.length === 0) {
      continue;
    }

    // Heuristic: when zero migrations reference ANY of this model's
    // fields, the entire model is uncovered. Surface that as ONE finding
    // instead of N per-field findings so the worker fixes it once.
    const missing: Array<{ fieldName: string; snake: string; line: number }> = [];
    for (const f of fields) {
      const snake = remap.get(f.fieldName) ?? toSnakeCase(f.fieldName);
      if (!corpusMentions(migrationCorpus, snake)) {
        missing.push({ fieldName: f.fieldName, snake, line: f.line });
      }
    }

    if (missing.length === fields.length && fields.length >= 2) {
      findings.push({
        modelPath: model.path,
        modelName,
        rule: "model-without-migration",
        message: `No migration mentions any column of ${modelName} (${fields.length} field(s): ${fields.map((f) => f.fieldName).join(", ")}). Create a migration under backend/src/database/migrations/ that creates the table.`,
      });
      continue;
    }

    for (const m of missing) {
      findings.push({
        modelPath: model.path,
        modelName,
        rule: "model-field-without-column",
        fieldName: m.fieldName,
        snakeFieldName: m.snake,
        line: m.line,
        message: `${modelName}.${m.fieldName} declares a Sequelize field but no migration creates / alters the column "${m.snake}". Add an idempotent migration (CREATE TABLE … IF NOT EXISTS or DO $$ … IF NOT EXISTS … ALTER TABLE … ADD COLUMN … END $$).`,
      });
    }
  }

  return {
    filesScanned: input.models.length,
    findings,
  };
}
