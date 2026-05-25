/**
 * Formats the most recent `.ralph/runtime-smoke.json` snapshot into an
 * actionable repair block for the IntegrationVerifyFix worker.
 *
 * The runtime-smoke gate boots the backend and probes every contract
 * endpoint, but it runs *after* the verify-fix loop completes. Its result is
 * persisted to `.ralph/runtime-smoke.json` precisely so the NEXT loop can read
 * it — yet nothing wired it into the worker prompt, so the worker spent every
 * iteration fixing blind while the real failure (e.g. Sequelize throwing on a
 * `CREATE UNIQUE INDEX`) sat untouched in the snapshot. See runtime.log
 * analysis 2026-05-20. This block closes that gap.
 */
import fs from "fs/promises";
import path from "path";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(filePath: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch {
    return null;
  }
}

const MAX_EVIDENCE_LINES = 20;

function trimEvidence(value: string): string {
  // The boot stderr tail is the highest-signal part — keep the LAST lines.
  const lines = value.replace(/\[[0-9;]*m/g, "").split("\n");
  if (lines.length <= MAX_EVIDENCE_LINES) return lines.join("\n");
  return [
    `… (+${lines.length - MAX_EVIDENCE_LINES} earlier lines)`,
    ...lines.slice(-MAX_EVIDENCE_LINES),
  ].join("\n");
}

/**
 * @param outputDir generated-code root
 * @param options.sessionId when set, only surface the snapshot if it was
 *        produced by the current session (avoids pinning a stale boot failure
 *        from an unrelated prior run onto the worker).
 */
export async function formatRuntimeSmokeBlock(
  outputDir: string,
  options?: { sessionId?: string },
): Promise<string> {
  const snapshot = await readJson(
    path.join(outputDir, ".ralph", "runtime-smoke.json"),
  );
  if (!isRecord(snapshot)) return "";
  if (snapshot.pass !== false) return "";
  if (
    options?.sessionId &&
    typeof snapshot.sessionId === "string" &&
    snapshot.sessionId !== options.sessionId
  ) {
    return "";
  }

  const bootFailed = snapshot.bootFailed === true;
  const failures = Array.isArray(snapshot.failures) ? snapshot.failures : [];
  const lines: string[] = [];

  lines.push(
    "## Runtime smoke gate (P0 — backend must actually boot and serve)",
  );
  lines.push(
    "The previous repair pass left the runtime smoke gate RED. A passing `run_validation_suite` (tsc/build) is NOT enough — the backend must start and answer requests. Fix the failure(s) below, then re-run `run_validation_suite` before `report_done(pass)`.",
  );

  if (bootFailed) {
    const bootFailure = failures.find(
      (f) => isRecord(f) && f.code === "backend_did_not_start",
    );
    const directive =
      isRecord(bootFailure) && typeof bootFailure.directive === "string"
        ? bootFailure.directive
        : "Backend `pnpm dev` did not reach a listening state — inspect the stderr tail below.";
    lines.push("", "### Backend did not start", `- ${directive}`);
    const evidence =
      isRecord(bootFailure) && typeof bootFailure.evidence === "string"
        ? trimEvidence(bootFailure.evidence).trim()
        : "";
    if (evidence) {
      lines.push("  ```");
      for (const line of evidence.split("\n")) lines.push(`  ${line}`);
      lines.push("  ```");
    }
    return lines.join("\n");
  }

  if (failures.length > 0) {
    lines.push("", "### Endpoint failures");
    for (const f of failures.slice(0, 10)) {
      if (!isRecord(f)) continue;
      lines.push(
        `- [${String(f.code ?? "?")}] ${String(f.target ?? "?")}: ${String(
          f.directive ?? "",
        )}`,
      );
    }
    if (failures.length > 10) {
      lines.push(`- _(+${failures.length - 10} more endpoint failures)_`);
    }
  }

  return lines.join("\n");
}
