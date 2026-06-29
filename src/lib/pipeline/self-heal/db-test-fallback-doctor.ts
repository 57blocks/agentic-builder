/**
 * db.ts test-fallback doctor — deterministic repair for the #1 TDD-gate
 * deadlock.
 *
 * The TDD gate runs backend tests with `DATABASE_URL` stripped so a test can
 * NEVER touch the real database. But a generated `backend/src/db.ts` whose
 * top-level body does an UNCONDITIONAL `throw new Error("DATABASE_URL is
 * required")` then crashes EVERY backend test at import — the GREEN gate can
 * never go green, and the integration repair loop spins until the budget is
 * spent (observed: CSMA session 22be72f9, 5/45 tests passing across every
 * pass).
 *
 * The fix the LLM repair loop is told to do (mock `../db` in each test) is
 * O(number-of-tests) manual work and frequently stalls. This doctor instead
 * applies the ONE structural fix that unblocks all of them at once: make the
 * connection test-aware so it falls back to in-memory SQLite in a test process
 * (mirroring the L-tier scaffold's db.ts). Deterministic, idempotent, and
 * bounded — it rewrites only the canonical broken shape and no-ops otherwise.
 */
import fs from "fs/promises";
import path from "path";

import { readTddEvidenceSummary } from "@/lib/pipeline/tdd-evidence";
import type { RepairEmitter } from "./events";

/** Marker the generated db.ts throws and the gate echoes when a DB is needed. */
const DB_REQUIRED_MARKER = /database_url is required/i;

/**
 * Test-env detection snippet shared by the rewrites. A non-empty `VITEST` or
 * `NODE_ENV==="test"` means "this is a test process"; a blank value does not,
 * so a deployment that exported `VITEST=` still takes the production path.
 */
const TEST_ENV_EXPR = `(process.env.NODE_ENV === "test" || (process.env.VITEST ?? "") !== "")`;

export interface DbTestFallbackDiagnosis {
  /** True when db.ts has an unconditional top-level DATABASE_URL throw. */
  hasUnconditionalThrow: boolean;
  /** True when a test-env sqlite fallback is already present (nothing to do). */
  alreadyGuarded: boolean;
}

/**
 * Pure: does this db.ts source have the broken "unconditional throw on missing
 * DATABASE_URL" pattern, and is it NOT already guarded by a test fallback?
 */
export function diagnoseDbSource(source: string): DbTestFallbackDiagnosis {
  // Already test-aware? An sqlite reference combined with a NODE_ENV/VITEST
  // branch means the file already falls back — leave it alone.
  const alreadyGuarded =
    /sqlite/i.test(source) &&
    (/process\.env\.NODE_ENV\s*===?\s*["']test["']/.test(source) ||
      /process\.env\.VITEST/.test(source));

  // The broken shape: a bare `if (!DATABASE_URL) { throw ... }` (or the
  // brace-less / `process.env.DATABASE_URL` variants) that runs at module load.
  const hasUnconditionalThrow =
    /if\s*\(\s*!\s*(?:process\.env\.)?DATABASE_URL\s*\)\s*\{?\s*throw/i.test(
      source,
    );

  return { hasUnconditionalThrow, alreadyGuarded };
}

/**
 * Pure: rewrite db.ts source so a missing DATABASE_URL falls back to in-memory
 * SQLite in a test process and only throws in dev/prod. Returns the original
 * string unchanged when there is nothing to fix (no broken pattern, already
 * guarded, or the canonical anchors are absent), so callers treat an unchanged
 * return as "no-op". The transform is intentionally narrow: it edits only the
 * canonical generated shape (a `const DATABASE_URL = process.env.DATABASE_URL`
 * declaration followed by an unconditional throw) and leaves anything it does
 * not fully understand untouched.
 */
export function rewriteDbSource(source: string): {
  changed: boolean;
  source: string;
} {
  const diag = diagnoseDbSource(source);
  if (diag.alreadyGuarded || !diag.hasUnconditionalThrow) {
    return { changed: false, source };
  }

  let next = source;

  // (1) Make the resolved URL test-aware: in a test process with no real URL,
  // use the in-memory sqlite connection string instead of `undefined`.
  const constRe = /const\s+DATABASE_URL\s*=\s*process\.env\.DATABASE_URL\s*;?/;
  if (!constRe.test(next)) {
    // Without the canonical const declaration we cannot guarantee a coherent
    // edit — bail rather than risk a half-rewrite.
    return { changed: false, source };
  }
  next = next.replace(
    constRe,
    `const DATABASE_URL =\n  process.env.DATABASE_URL ||\n  (${TEST_ENV_EXPR} ? "sqlite::memory:" : undefined);`,
  );

  // (2) The throw guard stays (it now only fires in dev/prod, where
  // DATABASE_URL is genuinely undefined). No change needed there.

  // (3) The Sequelize construction must pick the dialect from the URL rather
  // than hard-coding postgres, otherwise `new Sequelize("sqlite::memory:", {
  // dialect: "postgres" })` mis-dials. Drop a hard-coded `dialect: "postgres"`
  // so Sequelize infers sqlite from the `sqlite::memory:` URL, and postgres
  // from a postgres URL. SSL dialectOptions are harmless on sqlite (ignored).
  next = next.replace(/\n\s*dialect:\s*["']postgres["']\s*,?/i, "");

  // (4) The in-memory sqlite fallback runs on the pure-WASM driver
  // (`node-sqlite3-wasm`), not the native `sqlite3` package — so it must be
  // passed as `dialectModule`, or Sequelize throws "Please install sqlite3".
  // Import it once, then inject it CONDITIONALLY so a real Postgres URL (which
  // uses the `pg` driver) is never handed the sqlite module.
  const WASM_IMPORT = `import { sqlite3Wasm } from "./test-support/sqlite3-wasm";`;
  if (!/test-support\/sqlite3-wasm/.test(next)) {
    next = /^import .*\bsequelize\b.*$/m.test(next)
      ? next.replace(/(^import .*\bsequelize\b.*$)/m, `$1\n${WASM_IMPORT}`)
      : `${WASM_IMPORT}\n${next}`;
  }
  // Targets the canonical `new Sequelize(DATABASE_URL, { … })` shape (tolerates a
  // `!` / `as string` between the URL and the options object).
  next = next.replace(
    /new Sequelize\(\s*DATABASE_URL[^,{]*,\s*\{/,
    (m) =>
      `${m}\n      ...(DATABASE_URL === "sqlite::memory:" ? { dialectModule: sqlite3Wasm } : {}),`,
  );

  return { changed: next !== source, source: next };
}

export interface DbTestFallbackDoctorResult {
  /** True when a fix was written to disk. */
  applied: boolean;
  /** Human-readable reason (for logs / events). */
  reason: string;
}

/**
 * I/O wrapper. Triggers ONLY when the latest TDD evidence shows a GREEN failure
 * whose excerpt cites the stripped DATABASE_URL (i.e. a test hit the real-db
 * throw), then deterministically rewrites `backend/src/db.ts`. No-op when the
 * evidence does not implicate the DB throw or the file is already healthy.
 */
export async function healDbTestFallback(input: {
  outputDir: string;
  sessionId?: string;
  emitter?: RepairEmitter;
}): Promise<DbTestFallbackDoctorResult> {
  const { outputDir, sessionId, emitter } = input;

  // (1) Is the DB throw actually implicated in the latest GREEN failures?
  let implicated = false;
  try {
    const summary = await readTddEvidenceSummary(outputDir, { sessionId });
    implicated = summary.p0Details.some(
      (d) =>
        d.greenStatus !== "pass" &&
        d.greenStatus !== "skipped" &&
        typeof d.failureExcerpt === "string" &&
        DB_REQUIRED_MARKER.test(d.failureExcerpt),
    );
  } catch {
    implicated = false;
  }
  if (!implicated) {
    return { applied: false, reason: "no DATABASE_URL throw in TDD evidence" };
  }

  // (2) Read + rewrite backend/src/db.ts.
  const dbPath = path.join(outputDir, "backend", "src", "db.ts");
  let source: string;
  try {
    source = await fs.readFile(dbPath, "utf-8");
  } catch {
    return { applied: false, reason: "backend/src/db.ts not found" };
  }

  const { changed, source: fixed } = rewriteDbSource(source);
  if (!changed) {
    return {
      applied: false,
      reason: "db.ts already guarded or canonical pattern not matched",
    };
  }

  await fs.writeFile(dbPath, fixed, "utf-8");
  emitter?.({
    stage: "tdd-runtime",
    event: "tdd_db_test_fallback_healed",
    details: { file: "backend/src/db.ts" },
  });
  return {
    applied: true,
    reason: "rewrote db.ts to fall back to in-memory sqlite under test",
  };
}
