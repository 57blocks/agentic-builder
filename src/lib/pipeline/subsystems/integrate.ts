/**
 * P3.2 — Cross-domain integration gate.
 *
 * Runs ONCE, after every domain layer has built successfully, as an additive
 * final step in the subsystem pipeline. Per-domain builds validate only their
 * own (scoped) endpoints via the active-scope sidecar; this step clears that
 * scope and validates the WHOLE assembled app — so cross-domain seams (routing
 * closure across all domains, the full contract surface booting together) are
 * checked before the build is declared done.
 *
 * Strictly additive & isolated:
 *   - Only invoked from developBySubsystem (subsystem mode); the normal
 *     single-pass flow never calls it.
 *   - Only after foundation + contract precondition + all domains succeeded.
 *   - Reuses the existing runtime-smoke gate (no reimplementation); errors are
 *     contained (never throw out of the pipeline).
 *   - Opt out with BLUEPRINT_SUBSYSTEM_INTEGRATE=0.
 */

import { clearActiveScope } from "./active-scope";
import {
  runRuntimeSmokeGate,
  type RuntimeSmokeGateInput,
  type RuntimeSmokeGateResult,
} from "../self-heal/runtime-smoke-gate";

export interface CrossDomainIntegrationResult {
  /** False when skipped (disabled via env). */
  ran: boolean;
  ok: boolean;
  smokePassed?: boolean;
  bootFailed?: boolean;
  findings: string[];
  reason?: string;
}

export interface CrossDomainIntegrationOptions {
  outputDir: string;
  sessionId?: string;
  testDatabaseUrl?: string;
  dataAssertions?: boolean;
  /** Test seam — injected runtime-smoke implementation. */
  smokeGate?: (input: RuntimeSmokeGateInput) => Promise<RuntimeSmokeGateResult>;
  /** Test seam — injected scope clear. */
  clearScope?: (projectRoot: string) => Promise<void>;
}

export async function runCrossDomainIntegration(
  opts: CrossDomainIntegrationOptions,
): Promise<CrossDomainIntegrationResult> {
  if (process.env.BLUEPRINT_SUBSYSTEM_INTEGRATE === "0") {
    return { ran: false, ok: true, findings: [], reason: "disabled (BLUEPRINT_SUBSYSTEM_INTEGRATE=0)" };
  }

  const clear = opts.clearScope ?? clearActiveScope;
  const smoke = opts.smokeGate ?? runRuntimeSmokeGate;

  try {
    // Restore whole-app validation: drop the per-domain endpoint scope so the
    // smoke gate probes the full contract surface, not just the last domain's.
    await clear(opts.outputDir);

    const result = await smoke({
      outputDir: opts.outputDir,
      sessionId: opts.sessionId,
      dataAssertions: opts.dataAssertions,
      testDatabaseUrl: opts.testDatabaseUrl,
    });

    const findings = (result.failures ?? []).map(
      (f) => `[${f.code}] ${f.target}${f.directive ? ` — ${f.directive}` : ""}`,
    );
    return {
      ran: true,
      ok: result.pass,
      smokePassed: result.pass,
      bootFailed: result.bootFailed,
      findings,
      reason: result.pass
        ? undefined
        : result.bootFailed
          ? "whole-app backend did not boot"
          : `${findings.length} cross-domain integration finding(s)`,
    };
  } catch (err) {
    // Contained: an integration-gate error must not crash the pipeline result.
    return {
      ran: true,
      ok: false,
      findings: [],
      reason: `integration gate error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
