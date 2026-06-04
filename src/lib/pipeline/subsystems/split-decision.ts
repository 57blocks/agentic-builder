/**
 * Decide whether a project is big/decomposable enough to develop
 * subsystem-by-subsystem, or should just take the normal single-pass build.
 *
 * Subsystem mode has real overhead (foundation phase, per-domain builds, gate
 * scoping, cross-domain seams), so it only pays off for LARGE projects where a
 * single build would drown integration verify-fix in dozens of missing-impl
 * errors. The endpoint threshold is anchored to the smoke gate's 60-probe
 * ceiling (MAX_ENDPOINT_PROBES) plus headroom: past ~80 endpoints a single pass
 * can't even fully validate.
 *
 * Endpoint count is taken from the PRD inventory (extractApiEndpoints) — the
 * INTENT size — not API_CONTRACTS.json, which may be unfrozen/stale at decision
 * time.
 */

import type { PrdInventory } from "./inventory";
import type { SubsystemManifest } from "./types";
import type { ManifestValidationResult } from "./validate";

/** Min PRD endpoints (method+path ops) for subsystem mode. Default; override
 *  with BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS. */
export const MIN_ENDPOINTS_FOR_SPLIT = 80;
/** Min cleanly-separated domains. Override with BLUEPRINT_SUBSYSTEM_MIN_DOMAINS. */
export const MIN_DOMAINS_FOR_SPLIT = 5;
/** A single domain owning more than this share of endpoints ⇒ split won't help.
 *  Override with BLUEPRINT_SUBSYSTEM_MAX_DOMAIN_SHARE. */
export const MAX_DOMAIN_ENDPOINT_SHARE = 0.4;

function envNum(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export interface SplitDecision {
  split: boolean;
  /** Why — every check's verdict, for logging the decision. */
  reasons: string[];
}

export function shouldSplitIntoSubsystems(args: {
  tier: "S" | "M" | "L";
  inventory: PrdInventory;
  manifest: SubsystemManifest;
  validation: ManifestValidationResult;
}): SplitDecision {
  const { tier, inventory, manifest, validation } = args;
  const reasons: string[] = [];
  let split = true;

  // Thresholds (env-overridable; defaults are the exported consts).
  const minEndpoints = envNum("BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS", MIN_ENDPOINTS_FOR_SPLIT);
  const minDomains = envNum("BLUEPRINT_SUBSYSTEM_MIN_DOMAINS", MIN_DOMAINS_FOR_SPLIT);
  const maxDomainShare = envNum("BLUEPRINT_SUBSYSTEM_MAX_DOMAIN_SHARE", MAX_DOMAIN_ENDPOINT_SHARE);

  // Gate: only L-tier ever splits.
  if (tier !== "L") {
    reasons.push(`tier=${tier} (only L-tier uses subsystem mode)`);
    split = false;
  }

  // The decomposition must be structurally sound to trust it.
  if (!validation.ok) {
    reasons.push("manifest invalid — cannot trust the decomposition");
    split = false;
  }

  const endpointCount = inventory.apiEndpoints.length;
  if (endpointCount < minEndpoints) {
    reasons.push(`endpoints=${endpointCount} < ${minEndpoints} (small enough for a single pass)`);
    split = false;
  } else {
    reasons.push(`endpoints=${endpointCount} ≥ ${minEndpoints}`);
  }

  const domainCount = manifest.subsystems.length;
  if (domainCount < minDomains) {
    reasons.push(`domains=${domainCount} < ${minDomains} (not enough separation)`);
    split = false;
  }

  // Balance: if one domain hoards the endpoints, splitting doesn't bound scope.
  const perDomain = manifest.subsystems.map((s) => s.ownedApiEndpoints.length);
  const totalOwned = perDomain.reduce((a, b) => a + b, 0);
  if (totalOwned > 0) {
    const maxShare = Math.max(...perDomain) / totalOwned;
    if (maxShare > maxDomainShare) {
      reasons.push(`largest domain owns ${(maxShare * 100).toFixed(0)}% of endpoints > ${(maxDomainShare * 100).toFixed(0)}% (imbalanced — split won't bound scope)`);
      split = false;
    }
  }

  return { split, reasons };
}
