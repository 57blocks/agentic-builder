#!/usr/bin/env tsx
/**
 * task-audit — post-generation sanity check for the task-breakdown step.
 *
 * Reads `.blueprint/pipeline-snapshot.json` (the most recent kickoff run)
 * and emits a one-shot report covering:
 *
 *   1. Task count + DAG sanity (any empty deps, any cycles)
 *   2. The 4 hard rules (CLI scripts / data models / magic-link page /
 *      waiting-state page)
 *   3. Filename drift — orphan `files.modifies` entries that fuzzy-match
 *      an existing `files.creates` (same matcher as repair pass)
 *   4. Skill application summary (which rules fired, which were skipped)
 *
 * Designed to be runnable after every regenerate to skip the manual
 * `node -e` poking we've been doing. Exits non-zero when any hard rule
 * fails, so it can be wired into CI.
 *
 *   pnpm task:audit                 # uses .blueprint/pipeline-snapshot.json
 *   pnpm task:audit path/to/snap.json
 */

import fs from "node:fs";
import path from "node:path";
import type { SkillTraceRecord } from "@/lib/agents/skills";

// ─── ANSI helpers (avoid pulling chalk for one script) ─────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;
const ok = (s: string) => `${C.green}✓${C.reset} ${s}`;
const fail = (s: string) => `${C.red}✗${C.reset} ${s}`;
const warn = (s: string) => `${C.yellow}⚠${C.reset} ${s}`;
const dim = (s: string) => `${C.dim}${s}${C.reset}`;
const head = (s: string) => `\n${C.bold}${C.cyan}${s}${C.reset}`;

// ─── Types (loose — snapshot is JSON) ──────────────────────────────────────
interface KickoffTask {
  id: string;
  title: string;
  phase?: string;
  dependencies?: string[];
  files?:
    | string[]
    | {
        creates?: string[];
        modifies?: string[];
        reads?: string[];
      };
}

// ─── Main ──────────────────────────────────────────────────────────────────
function main() {
  const snapPath =
    process.argv[2] ?? path.join(".blueprint", "pipeline-snapshot.json");
  if (!fs.existsSync(snapPath)) {
    console.error(`${C.red}snapshot not found: ${snapPath}${C.reset}`);
    process.exit(2);
  }
  const snap = JSON.parse(fs.readFileSync(snapPath, "utf-8"));
  const kickoff = snap.steps?.kickoff;
  if (!kickoff) {
    console.error(`${C.red}snapshot has no kickoff step${C.reset}`);
    process.exit(2);
  }
  const tb = kickoff.metadata?.taskBreakdown ?? {};
  const tasks = Object.values(tb) as KickoffTask[];

  console.log(`${C.bold}Task audit${C.reset} ${dim(`(${snapPath})`)}`);
  console.log(dim(`Generated: ${kickoff.timestamp ?? "unknown"}`));
  console.log(dim(`Status:    ${kickoff.status ?? "unknown"}`));
  console.log();
  console.log(`Total tasks: ${C.bold}${tasks.length}${C.reset}`);

  let failures = 0;

  // ── 1. DAG sanity ────────────────────────────────────────────────────────
  console.log(head("DAG sanity"));
  const empty = tasks.filter((t) => (t.dependencies ?? []).length === 0);
  const rootOk = empty.length <= 1; // at most one root expected
  if (rootOk) {
    console.log(
      ok(
        `${tasks.length - empty.length}/${tasks.length} tasks have explicit deps (${empty.length} root)`,
      ),
    );
  } else {
    failures++;
    console.log(
      fail(
        `${empty.length} tasks have empty dependencies — only T-001 should be a root`,
      ),
    );
    for (const t of empty) console.log(dim(`    ${t.id}  ${t.title}`));
  }
  const cycle = findCycle(tasks);
  if (cycle) {
    failures++;
    console.log(fail(`dependency cycle: ${cycle.join(" → ")}`));
  } else {
    console.log(ok("acyclic"));
  }

  // ── 2. Hard rules ────────────────────────────────────────────────────────
  console.log(head("Hard rules"));
  const allCreates = new Set<string>();
  for (const t of tasks) for (const f of getCreates(t)) allCreates.add(f);

  // Rule 1: CLI scripts
  const cliScripts = [...allCreates].filter((f) =>
    /^backend\/scripts\/.+\.ts$/.test(f),
  );
  if (cliScripts.length >= 3) {
    console.log(ok(`CLI scripts: ${cliScripts.length} script(s) emitted`));
  } else if (cliScripts.length > 0) {
    console.log(warn(`CLI scripts: only ${cliScripts.length} — TRD usually requires 3+`));
  } else {
    failures++;
    console.log(fail("CLI scripts: none emitted"));
  }
  if ([...allCreates].some((f) => /\/lib\/cli-audit\.ts$/.test(f))) {
    console.log(ok("cli-audit.ts helper present"));
  } else if (cliScripts.length > 0) {
    failures++;
    console.log(fail("cli-audit.ts helper missing (TRD §3.5 marks REQUIRED)"));
  }

  // Rule 2: Data models
  const modelFiles = [...allCreates].filter((f) =>
    /^backend\/src\/models\/[A-Z][A-Za-z0-9]+\.ts$/.test(f),
  );
  if (modelFiles.length >= 5) {
    console.log(ok(`Data models: ${modelFiles.length} model file(s)`));
  } else if (modelFiles.length > 0) {
    console.log(warn(`Data models: only ${modelFiles.length} — verify against TRD §3.2`));
  } else {
    failures++;
    console.log(fail("Data models: none emitted"));
  }

  // Rule 3: Magic-link callback page (only when skill applied)
  const skillsTrace = kickoff.metadata
    ?.taskBreakdownSkillsTrace as SkillTraceRecord | undefined;
  const magicLinkApplied = skillsTrace?.applied.some(
    (s) => s.id === "magic-link-callback-page",
  );
  if (magicLinkApplied) {
    const mlFile = [...allCreates].find((f) =>
      /(MagicLink|MagicLogin|VerifyLogin|AuthVerify|SignInCallback)/.test(
        f,
      ) && f.endsWith(".tsx"),
    );
    if (mlFile) {
      console.log(ok(`Magic-link page: ${mlFile.split("/").pop()}`));
    } else {
      failures++;
      console.log(fail("Magic-link page: skill triggered but no callback page emitted"));
    }
  }

  // Rule 4: Waiting state page (only when skill applied)
  const waitingApplied = skillsTrace?.applied.some(
    (s) => s.id === "intermediate-waiting-state-page",
  );
  if (waitingApplied) {
    const wFile = [...allCreates].find(
      (f) =>
        /(Processing|InProgress|Stage|Progress|Status|Pending|Waiting)/.test(
          f,
        ) && f.endsWith(".tsx"),
    );
    if (wFile) {
      console.log(ok(`Waiting state page: ${wFile.split("/").pop()}`));
    } else {
      failures++;
      console.log(
        fail("Waiting state page: skill triggered but no processing page emitted"),
      );
    }
  }

  // Email-driven mutex
  const emailDrivenApplied = skillsTrace?.applied.some(
    (s) => s.id === "email-driven-approval-flow",
  );
  if (emailDrivenApplied) {
    const orphanPendingPage = [...allCreates].find(
      (f) => /(PendingApproval|WaitingForApproval|AwaitingApproval)/.test(f),
    );
    if (orphanPendingPage) {
      failures++;
      console.log(
        fail(`Email-driven mutex broken: ${orphanPendingPage} should not exist`),
      );
    } else {
      console.log(ok("Email-driven mutex respected (no Pending/Waiting page)"));
    }
  }

  // ── 3. Filename drift ────────────────────────────────────────────────────
  console.log(head("Filename drift"));
  let driftCount = 0;
  for (const t of tasks) {
    for (const m of getModifies(t)) {
      if (allCreates.has(m)) continue;
      const match = fuzzyMatchCreatedPath(m, allCreates);
      if (match) {
        driftCount++;
        console.log(
          fail(`${t.id} modifies orphan ${m}`),
        );
        console.log(dim(`    likely intended: ${match}`));
      }
    }
  }
  if (driftCount === 0) {
    console.log(ok("no confident drift detected"));
  } else {
    failures++;
  }

  // ── 4. Skills trace summary ──────────────────────────────────────────────
  console.log(head("Skills trace"));
  if (!skillsTrace) {
    console.log(
      dim(
        "no taskBreakdownSkillsTrace in metadata (re-run with newer engine to capture)",
      ),
    );
  } else {
    console.log(
      `Applied: ${C.bold}${skillsTrace.applied.length}${C.reset}  ${dim(`(${skillsTrace.durationMs}ms · $${skillsTrace.costUsd.toFixed(4)})`)}`,
    );
    for (const s of skillsTrace.applied) {
      const tag = s.llmRan ? `${C.blue}LLM${C.reset}` : `${C.green}regex${C.reset}`;
      console.log(
        `  ${C.green}✓${C.reset} ${s.id} ${dim(`P${s.priority} · ${tag}`)}`,
      );
    }
    if (skillsTrace.skipped.length > 0) {
      console.log(dim(`Skipped: ${skillsTrace.skipped.length}`));
      for (const s of skillsTrace.skipped) {
        console.log(dim(`  · ${s.id} — ${s.reason}`));
      }
    }
  }

  // ── 5. Coverage repair summary ───────────────────────────────────────────
  const repair = kickoff.metadata?.coverageRepair;
  if (repair) {
    console.log(head("Coverage repair"));
    console.log(
      `Attempts: ${repair.attempts}  Added: ${repair.added}  Final missing: ${
        repair.finalMissing?.length ?? 0
      }`,
    );
    if (repair.finalMissing && repair.finalMissing.length > 0) {
      failures++;
      for (const id of repair.finalMissing)
        console.log(fail(`uncovered PRD id: ${id}`));
    }
  }

  // ── Exit ─────────────────────────────────────────────────────────────────
  console.log();
  if (failures > 0) {
    console.log(`${C.red}${C.bold}${failures} check(s) failed${C.reset}`);
    process.exit(1);
  } else {
    console.log(`${C.green}${C.bold}all checks passed${C.reset}`);
    process.exit(0);
  }
}

// ─── helpers ───────────────────────────────────────────────────────────────
function getCreates(t: KickoffTask): string[] {
  if (!t.files) return [];
  if (Array.isArray(t.files)) return t.files;
  return t.files.creates ?? [];
}

function getModifies(t: KickoffTask): string[] {
  if (!t.files || Array.isArray(t.files)) return [];
  return t.files.modifies ?? [];
}

/** Mirror of repair-time fuzzy matcher (same dir + super/sub-string stem,
 *  length ratio ≤ 1.6×, exactly one candidate). Kept in sync manually with
 *  `src/lib/pipeline/self-heal/task-coverage-repair.ts`. */
function fuzzyMatchCreatedPath(
  orphan: string,
  set: Set<string>,
): string | null {
  const slash = orphan.lastIndexOf("/");
  const oDir = slash >= 0 ? orphan.slice(0, slash) : "";
  const oBase = slash >= 0 ? orphan.slice(slash + 1) : orphan;
  const oStem = stripExt(oBase);
  const cands: string[] = [];
  for (const c of set) {
    const cSlash = c.lastIndexOf("/");
    const cDir = cSlash >= 0 ? c.slice(0, cSlash) : "";
    if (cDir !== oDir) continue;
    const cBase = cSlash >= 0 ? c.slice(cSlash + 1) : c;
    const cStem = stripExt(cBase);
    if (cStem === oStem) continue;
    const longer = cStem.length >= oStem.length ? cStem : oStem;
    const shorter = cStem.length >= oStem.length ? oStem : cStem;
    if (!longer.includes(shorter)) continue;
    if (longer.length > shorter.length * 1.6) continue;
    cands.push(c);
  }
  return cands.length === 1 ? cands[0]! : null;
}

function stripExt(s: string): string {
  const d = s.lastIndexOf(".");
  return d > 0 ? s.slice(0, d) : s;
}

/** Detect a dependency cycle. Returns the cycle path or null. */
function findCycle(tasks: KickoffTask[]): string[] | null {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const t of tasks) color.set(t.id, WHITE);
  const path: string[] = [];

  function dfs(id: string): string[] | null {
    color.set(id, GRAY);
    path.push(id);
    const t = byId.get(id);
    for (const d of t?.dependencies ?? []) {
      const c = color.get(d);
      if (c === GRAY) {
        const idx = path.indexOf(d);
        return [...path.slice(idx), d];
      }
      if (c === WHITE) {
        const found = dfs(d);
        if (found) return found;
      }
    }
    color.set(id, BLACK);
    path.pop();
    return null;
  }

  for (const t of tasks) {
    if (color.get(t.id) === WHITE) {
      const found = dfs(t.id);
      if (found) return found;
    }
  }
  return null;
}

main();
