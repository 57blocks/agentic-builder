import fs from "fs/promises";
import path from "path";

import type { SupervisorState } from "../../state";
import { getRepairEmitter, healDbTestFallback } from "@/lib/pipeline/self-heal";
import { runTddRuntimePhase } from "@/lib/pipeline/tdd-runtime-executor";
import { runTddTestWriter } from "@/lib/pipeline/tdd-test-writer";
import { reviewTddTests } from "@/lib/pipeline/tdd-reviewer";
import { TDD_REVIEW_STALL_LIMIT } from "../config";

export async function syncDeps(_state: SupervisorState) {
  console.log(
    "[Supervisor] sync_deps: skipping installs (npm install runs in integration verify).",
  );
  return {};
}

export async function tddTestWriterAndRed(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const emitter = getRepairEmitter(state.sessionId);
  const writer = await runTddTestWriter({
    outputDir: state.outputDir,
    tasks: state.tasks,
    projectContext: state.projectContext,
    sessionId: state.sessionId,
    emitter,
  });
  console.log(`[Supervisor] TDD Test Writer: ${writer.summary}`);

  const review = await reviewTddTests({
    outputDir: state.outputDir,
    emitter,
  });
  console.log(
    `[Supervisor] TDD Review (pre-implementation): ${review.summary}`,
  );

  let red = await runTddRuntimePhase({
    outputDir: state.outputDir,
    phase: "red",
    emitter,
    sessionId: state.sessionId,
  });
  console.log(`[Supervisor] ${red.summary}`);

  // Enforcement: a RED test that PASSES before any implementation is invalid
  // (proves nothing). Delete those test files and regenerate them ONCE with the
  // strengthened writer prompt, then re-run RED. Bounded to a single retry so a
  // model that keeps writing trivially-passing tests can't loop forever.
  let extraCost = 0;
  if (red.redPassedTooEarlyFiles.length > 0) {
    console.warn(
      `[Supervisor] TDD: ${red.redPassedTooEarlyFiles.length} RED test(s) passed before implementation (invalid) — deleting + regenerating: ${red.redPassedTooEarlyFiles.join(", ")}`,
    );
    emitter?.({
      stage: "tdd-runtime",
      event: "tdd_red_invalid_regenerate",
      details: { files: red.redPassedTooEarlyFiles },
    });
    await Promise.all(
      red.redPassedTooEarlyFiles.map((f) =>
        fs.unlink(path.join(state.outputDir, f)).catch(() => {}),
      ),
    );
    const rewrite = await runTddTestWriter({
      outputDir: state.outputDir,
      tasks: state.tasks,
      projectContext: state.projectContext,
      sessionId: state.sessionId,
      emitter,
    });
    extraCost += rewrite.costUsd;
    console.log(
      `[Supervisor] TDD Test Writer (RED regenerate): ${rewrite.summary}`,
    );
    red = await runTddRuntimePhase({
      outputDir: state.outputDir,
      phase: "red",
      emitter,
      sessionId: state.sessionId,
    });
    console.log(`[Supervisor] ${red.summary} (after RED regenerate)`);
  }

  return {
    totalCostUsd: writer.costUsd + extraCost,
  };
}

export async function tddGreenVerifyAndReview(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const emitter = getRepairEmitter(state.sessionId);
  // Integration gate runs only the cross-cutting (scope=integration) tests.
  // Self-contained (scope=local) tests were already verified in their owning
  // worker's per-task fix loop, so re-running them here would be wasted work.
  let green = await runTddRuntimePhase({
    outputDir: state.outputDir,
    phase: "green",
    scope: "integration",
    emitter,
    sessionId: state.sessionId,
  });

  // ── Deterministic db.ts test-fallback heal ────────────────────────────────
  // The #1 GREEN-gate deadlock: a generated backend/src/db.ts that throws
  // "DATABASE_URL is required" at module load crashes EVERY backend test at
  // import (the gate strips DATABASE_URL by design). The LLM repair loop is
  // told to mock ../db in each test — O(tests) work that frequently stalls.
  // Instead, when the latest GREEN evidence implicates that throw, rewrite
  // db.ts ONCE to fall back to in-memory sqlite under test, then re-run GREEN
  // so the rest of this node sees the unblocked state.
  if (green.p0Failures.length > 0) {
    const heal = await healDbTestFallback({
      outputDir: state.outputDir,
      sessionId: state.sessionId,
      emitter,
    });
    if (heal.applied) {
      console.log(`[Supervisor] TDD GREEN: ${heal.reason} — re-running GREEN.`);
      green = await runTddRuntimePhase({
        outputDir: state.outputDir,
        phase: "green",
        scope: "integration",
        emitter,
        sessionId: state.sessionId,
      });
      console.log(
        `[Supervisor] ${green.summary} (after db.ts test-fallback heal)`,
      );
    }
  }

  const review = await reviewTddTests({
    outputDir: state.outputDir,
    emitter,
  });

  const greenP0 = green.p0Failures.length;
  const reviewP0 = review.p0Errors.length;

  // ── TDD-review P0 deadlock detection ──────────────────────────────────────
  // Track whether the STATIC review's P0 count is improving across GREEN
  // passes. We only count a "stall" when runtime execution fully passes
  // (greenP0 === 0) and the sole remaining blocker is review-only P0s. A
  // runtime failure resets the tracker — those must keep blocking. Once the
  // review P0 count fails to decrease for TDD_REVIEW_STALL_LIMIT consecutive
  // passes, we stop treating review-only P0s as a hard gate and let the graph
  // proceed (errors are still recorded as warnings), instead of churning to
  // the full integration budget.
  const prevReviewP0 = state.tddReviewP0Count ?? -1;
  let stallRounds = state.tddReviewStallRounds ?? 0;
  if (greenP0 === 0 && reviewP0 > 0) {
    stallRounds =
      prevReviewP0 >= 0 && reviewP0 >= prevReviewP0 ? stallRounds + 1 : 0;
  } else {
    stallRounds = 0;
  }
  const reviewDeadlock =
    greenP0 === 0 && reviewP0 > 0 && stallRounds >= TDD_REVIEW_STALL_LIMIT;

  const blockers: string[] = [];
  if (greenP0 > 0) {
    blockers.push(`P0 TDD GREEN failures: ${green.p0Failures.join(", ")}`);
  }
  if (reviewP0 > 0 && !reviewDeadlock) {
    blockers.push(
      `P0 TDD review errors: ${review.p0Errors
        .slice(0, 10)
        .map((finding) => `${finding.testId}: ${finding.message}`)
        .join("; ")}`,
    );
  }

  if (reviewDeadlock) {
    console.warn(
      `[Supervisor] TDD GREEN gate: deadlock escape — GREEN execution passes (0 runtime failures) but ${reviewP0} review-only P0(s) have not decreased for ${stallRounds} pass(es) (limit ${TDD_REVIEW_STALL_LIMIT}). Recording them as non-blocking warnings and proceeding instead of looping the integration budget.`,
    );
    emitter?.({
      stage: "tdd-review",
      event: "tdd_review_p0_deadlock_escape",
      details: {
        reviewP0,
        stallRounds,
        limit: TDD_REVIEW_STALL_LIMIT,
        findings: review.p0Errors
          .slice(0, 10)
          .map((f) => `${f.testId}: ${f.message}`),
      },
    });
  }

  const existing = state.integrationErrors?.trim();
  const integrationErrors =
    blockers.length > 0
      ? [existing, "TDD hard gate failed:", ...blockers]
          .filter(Boolean)
          .join("\n")
          .slice(0, 4000)
      : existing;

  console.log(
    `[Supervisor] TDD GREEN gate: ${green.summary} ${review.summary}`,
  );

  return {
    integrationErrors,
    tddReviewP0Count: reviewP0,
    tddReviewStallRounds: stallRounds,
  };
}
