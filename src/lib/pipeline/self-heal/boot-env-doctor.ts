/**
 * Boot-error env doctor — deterministic, error-driven `.env` repair for the
 * runtime-smoke gate.
 *
 * When the backend fails to boot, the smoke gate already captures the startup
 * stderr. This module reads that stderr and applies the fix the error implies —
 * but ONLY for two well-defined categories, kept strictly apart:
 *
 *   1. KNOWABLE CONFIG SWITCHES — flags whose correct value is determined by the
 *      error itself (the timescale error literally prints
 *      "set TIMESCALE_DISABLED=1 to suppress"). These are safe to set
 *      automatically because there is exactly one right value.
 *
 *   2. SECRETS / URLs (DATABASE_URL, REDIS_URL) — NEVER invented. A killed TDD
 *      run can leave `DATABASE_URL=` blank with the original saved in
 *      `.env.tdd-bak`; we RESTORE from that backup, we do not guess a value.
 *
 * This is why the integration loop previously stagnated: the LLM repair loop is
 * (correctly) barred from editing `.env`, and nothing connected "timescale error
 * in stderr" → "set the switch". This doctor closes that gap so the smoke gate
 * can self-heal a boot-config failure and retry, instead of spinning.
 */
import fs from "fs/promises";
import path from "path";

import { recoverFromCrashedTddNeutralization } from "@/lib/pipeline/tdd-runtime-executor";

/**
 * A knowable config switch: when the boot output matches `matches`, ensure
 * `key=value` is set in backend/.env. `value` is deterministic — never a secret.
 */
interface BootEnvSwitchRule {
  id: string;
  matches: RegExp;
  key: string;
  value: string;
}

const SWITCH_RULES: BootEnvSwitchRule[] = [
  {
    // TimescaleDB `CREATE EXTENSION` / hypertable failure on a plain Postgres.
    // The generated db layer self-documents the fix in its own error message.
    id: "timescale-disabled",
    matches:
      /timescaledb|create extension|hypertable|TIMESCALE_DISABLED|timescale[^a-z]/i,
    key: "TIMESCALE_DISABLED",
    value: "1",
  },
];

/** Read a plain `KEY=value` from a .env payload (no JSON-unquoting). */
function readEnvValue(envContent: string, key: string): string | null {
  const m = envContent.match(
    new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m"),
  );
  return m ? m[1].trim() : null;
}

/** Upsert a plain (unquoted) `KEY=value` — flags don't need quoting. */
function upsertPlain(envContent: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^\\s*${key}\\s*=.*$`, "m");
  if (re.test(envContent)) return envContent.replace(re, line);
  const norm =
    envContent === "" || envContent.endsWith("\n") ? envContent : `${envContent}\n`;
  return `${norm}${line}\n`;
}

/**
 * Pure: ensure the KNOWN-SAFE switch defaults are present, regardless of the
 * boot error. Used after restoring a stale `.env.tdd-bak` (which predates these
 * defaults) so the retry isn't blocked by a switch the restored file lacks —
 * e.g. a blanked DATABASE_URL fails boot FIRST (so the timescale error never
 * appears in that stderr), the restore brings back an old `.env` with no
 * `TIMESCALE_DISABLED`, and the next boot would then crash on timescale. These
 * defaults match `formatGeneratedCodeDotEnv` and `backend/.env.example`.
 */
export function ensureSafeDefaults(
  envContent: string,
): { envContent: string; applied: string[] } {
  const applied: string[] = [];
  let next = envContent;
  for (const rule of SWITCH_RULES) {
    if (readEnvValue(next, rule.key) === rule.value) continue;
    next = upsertPlain(next, rule.key, rule.value);
    applied.push(`default:${rule.id}`);
  }
  return { envContent: next, applied };
}

/**
 * Pure: given the current `.env` content and the boot stderr/stdout tail, return
 * the env content with any KNOWABLE config switches applied + the rule ids that
 * fired. A rule fires only when the error matches AND the switch isn't already
 * at the target value (so a no-op doesn't trigger a pointless retry).
 */
export function diagnoseBootEnvSwitches(
  envContent: string,
  bootOutput: string,
): { envContent: string; applied: string[] } {
  const applied: string[] = [];
  let next = envContent;
  for (const rule of SWITCH_RULES) {
    if (!rule.matches.test(bootOutput)) continue;
    const current = readEnvValue(next, rule.key);
    if (current === rule.value) continue; // already correct
    next = upsertPlain(next, rule.key, rule.value);
    applied.push(rule.id);
  }
  return { envContent: next, applied };
}

/**
 * I/O wrapper: heal `backend/.env` after a boot failure, driven by the captured
 * boot output. Returns the list of applied fixes (empty ⇒ nothing fixable, so the
 * caller should NOT retry). Order matters: restore secrets first (so a blanked
 * DATABASE_URL comes back), then apply knowable switches on the restored file.
 */
export async function healBootEnvFromStderr(
  outputDir: string,
  bootOutput: string,
): Promise<{ applied: string[] }> {
  const applied: string[] = [];

  // (1) Secrets: a TDD run killed mid-neutralization leaves `DATABASE_URL=` blank
  // with the original in `.env.tdd-bak`. Restore it — never invent a URL.
  const rec = await recoverFromCrashedTddNeutralization(outputDir).catch(() => ({
    recovered: false,
  }));
  if (rec.recovered) applied.push("restore-env-from-tdd-bak");

  const envPath = path.join(outputDir, "backend", ".env");
  let env = await fs.readFile(envPath, "utf-8").catch(() => "");
  let dirty = false;

  // (2) If we restored a stale `.tdd-bak`, re-apply known-safe switch defaults so
  // a switch the old file lacked (e.g. TIMESCALE_DISABLED) doesn't block the retry.
  if (rec.recovered) {
    const def = ensureSafeDefaults(env);
    if (def.applied.length > 0) {
      env = def.envContent;
      dirty = true;
      applied.push(...def.applied);
    }
  }

  // (3) Knowable switches implied by THIS boot's error.
  const diag = diagnoseBootEnvSwitches(env, bootOutput);
  if (diag.applied.length > 0) {
    env = diag.envContent;
    dirty = true;
    applied.push(...diag.applied);
  }

  if (dirty) await fs.writeFile(envPath, env, "utf-8").catch(() => {});

  return { applied };
}
