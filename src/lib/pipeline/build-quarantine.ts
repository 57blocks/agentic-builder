import fs from "fs/promises";
import path from "path";

/**
 * Build quarantine marker (CODEGEN_HARDENING — G1).
 *
 * When an integration build FAILS, the generated code still sits on disk and
 * looks runnable — a human can `pnpm dev` it and hit 404 on every route. A
 * "fail" status alone does not prevent that. This marker is the durable,
 * machine-checkable signal that the output is KNOWN-BROKEN.
 *
 * Contract:
 *  - The integration node writes this file on `finalStatus === "fail"` and
 *    deletes it on pass.
 *  - Any surface that presents the output as runnable/ready (the coding route's
 *    blocking-gate check, an "open project" / "run backend" action, etc.) MUST
 *    call `readBuildFailedMarker()` and refuse / warn when it is present.
 */
export const BUILD_FAILED_MARKER_REL = path.join(".blueprint", "BUILD_FAILED.json");

export interface BuildFailedMarker {
  sessionId: string;
  /** ISO-8601 timestamp of the failing gate. */
  failedAt: string;
  /** Which gate failed (e.g. "integration"). */
  gate: string;
  /** Truncated human-readable failure summary. */
  summary: string;
}

/**
 * Decide whether a FAILED integration build is "infra-dominated" — i.e. the
 * failure is purely test-harness / environment class (missing test-db schema,
 * absent docker-compose, missing test-runner dep, …) rather than a real
 * application defect. An infra-dominated failure must NOT be quarantined:
 * quarantining would mark an otherwise-correct build broken and, under
 * subsystem orchestration, halt every remaining domain.
 *
 * Precision guard: it is NOT enough for the summary to merely CONTAIN an infra
 * signal — the summary concatenates every gate's failure text, so a genuinely
 * broken build (e.g. a route-registration / contract / tsc/build failure) that
 * ALSO happens to mention "no such table" in its TDD section would otherwise
 * escape quarantine. We therefore require that every REAL code/structural gate
 * PASSED, so the only remaining failure sources are infra-class.
 *
 * `realCodeGatesPass` intentionally EXCLUDES the runtime-smoke gate (its
 * pass/fail classification is owned elsewhere) and the dependency-consistency
 * gate (a missing *test* dep like vitest is itself infra; a missing *runtime*
 * dep is already caught by the build gate inside `realCodeGatesPass`).
 */
export function isInfraDominatedFailure(opts: {
  finalStatusFail: boolean;
  infraSignalPresent: boolean;
  realCodeGatesPass: boolean;
}): boolean {
  return (
    opts.finalStatusFail &&
    opts.infraSignalPresent &&
    opts.realCodeGatesPass
  );
}

/** Read the quarantine marker for a generated project, or null when not quarantined. */
export async function readBuildFailedMarker(
  outputDir: string,
): Promise<BuildFailedMarker | null> {
  try {
    const raw = await fs.readFile(
      path.join(outputDir, BUILD_FAILED_MARKER_REL),
      "utf-8",
    );
    const parsed = JSON.parse(raw) as Partial<BuildFailedMarker>;
    return {
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : "",
      failedAt: typeof parsed.failedAt === "string" ? parsed.failedAt : "",
      gate: typeof parsed.gate === "string" ? parsed.gate : "unknown",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch {
    return null;
  }
}
