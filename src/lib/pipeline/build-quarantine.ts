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
