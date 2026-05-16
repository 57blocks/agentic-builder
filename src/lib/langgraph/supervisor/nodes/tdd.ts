import type { SupervisorState } from "../../state";
import { getRepairEmitter } from "@/lib/pipeline/self-heal";
import { runTddRuntimePhase } from "@/lib/pipeline/tdd-runtime-executor";
import { runTddTestWriter } from "@/lib/pipeline/tdd-test-writer";
import { reviewTddTests } from "@/lib/pipeline/tdd-reviewer";

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

  const red = await runTddRuntimePhase({
    outputDir: state.outputDir,
    phase: "red",
    emitter,
  });
  console.log(`[Supervisor] ${red.summary}`);

  return {
    totalCostUsd: writer.costUsd,
  };
}

export async function tddGreenVerifyAndReview(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const emitter = getRepairEmitter(state.sessionId);
  const green = await runTddRuntimePhase({
    outputDir: state.outputDir,
    phase: "green",
    emitter,
  });
  const review = await reviewTddTests({
    outputDir: state.outputDir,
    emitter,
  });

  const blockers: string[] = [];
  if (green.p0Failures.length > 0) {
    blockers.push(`P0 TDD GREEN failures: ${green.p0Failures.join(", ")}`);
  }
  if (review.p0Errors.length > 0) {
    blockers.push(
      `P0 TDD review errors: ${review.p0Errors
        .slice(0, 10)
        .map((finding) => `${finding.testId}: ${finding.message}`)
        .join("; ")}`,
    );
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
  };
}
