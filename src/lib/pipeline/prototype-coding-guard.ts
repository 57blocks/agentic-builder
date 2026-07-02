import type { PrototypeMarker } from "@/lib/pipeline/prototype-marker";
import type { ScaffoldTier } from "@/lib/pipeline/scaffold-copy";

/**
 * Coding should skip re-copying the base scaffold only when a prototype clearly
 * produced it: a marker exists, records baseScaffoldCopied, and its scaffoldTier
 * matches the tier coding resolved (else a full copy is safer). No marker → false
 * → coding runs exactly as today (legacy path).
 */
export function shouldSkipBaseCopy(
  marker: PrototypeMarker | null,
  codingScaffoldTier: ScaffoldTier,
): boolean {
  return !!marker && marker.baseScaffoldCopied === true && marker.scaffoldTier === codingScaffoldTier;
}
