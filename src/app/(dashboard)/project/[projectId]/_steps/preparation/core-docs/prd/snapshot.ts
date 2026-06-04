import { createStepDataSnapshot } from "../../../_shared/snapshot-context";
import type { StepSnapshot } from "../../../_shared/types";

// ── Versioned Snapshot Support ─────────────────────────────────────────────

export interface PrdVersion {
  version: number;
  content: string;
  timestamp: string;
  label: string;
}

/**
 * Persisted PRD-readiness state (the guided 2-step "Prepare PRD" flow).
 * Downstream subsystem build reads `.blueprint/subsystems.json` (written by the
 * decompose route); this is the project-scoped, reload-surviving copy that
 * re-hydrates the UI (findings, manifest, per-step done status) on revisit.
 */
export interface PrdReadiness {
  qualityDone?: boolean;
  subsystemDone?: boolean;
  /** Full Step-1 quality report payload, so the findings re-render verbatim. */
  qualityResult?: unknown;
  /** Full Step-2 decompose response payload, so the panel re-renders verbatim. */
  subsystemResult?: unknown;
  savedAt?: string;
}

/**
 * Merge-safe persistence of the prd step snapshot. Reads the CURRENT store
 * metadata, shallow-merges `metaPatch`, and PUTs the full snapshot — so
 * independent writers (version history vs. readiness) never clobber each other.
 */
async function persistPrdSnapshot(
  projectSlug: string,
  metaPatch: Record<string, unknown>,
  content?: string,
): Promise<void> {
  const { useStepStore } = await import("@/store/step-store");
  const store = useStepStore.getState();
  const existingMeta =
    (store.steps.prd?.metadata as Record<string, unknown> | undefined) ?? {};
  const mergedMeta = { ...existingMeta, ...metaPatch };
  const body = content ?? store.steps.prd?.content ?? "";

  // Local store first (patchStepMeta merges; does not auto-save).
  store.patchStepMeta("prd", metaPatch);

  await fetch(`/api/projects/${projectSlug}/project-step-snapshot`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stepId: "prd",
      snapshot: { content: body, metadata: mergedMeta, status: "completed" },
    }),
  }).catch((err) => console.error("[prdSnapshot] save error:", err));
}

/** Add a new version entry, persist to store metadata + API immediately. */
export async function savePrdVersion(
  projectSlug: string,
  content: string,
  label: string,
): Promise<void> {
  const { useStepStore } = await import("@/store/step-store");
  const store = useStepStore.getState();
  const existing = (
    store.steps.prd?.metadata as Record<string, unknown> | undefined
  )?.prdVersions as PrdVersion[] | undefined;
  const versions = existing ?? [];
  // Skip duplicate if content matches latest version
  if (versions.length > 0 && versions[versions.length - 1].content === content) {
    return;
  }
  const version = versions.length + 1;
  const entry: PrdVersion = {
    version,
    content,
    timestamp: new Date().toISOString(),
    label: `v${version} · ${label}`,
  };
  const newVersions = [...versions, entry];

  // Merge-safe: preserves prdReadiness (and any other metadata) on disk.
  await persistPrdSnapshot(projectSlug, { prdVersions: newVersions }, content);
}

/** Persist (merge) the PRD-readiness state to step metadata + DB immediately. */
export async function savePrdReadiness(
  projectSlug: string,
  patch: Partial<PrdReadiness>,
): Promise<void> {
  const { useStepStore } = await import("@/store/step-store");
  const existing =
    ((useStepStore.getState().steps.prd?.metadata as Record<string, unknown> | undefined)
      ?.prdReadiness as PrdReadiness | undefined) ?? {};
  const next: PrdReadiness = {
    ...existing,
    ...patch,
    savedAt: new Date().toISOString(),
  };
  await persistPrdSnapshot(projectSlug, { prdReadiness: next });
}

/** Load version history from the step-store (populated from DB on hydration). */
export async function loadPrdVersions(
  projectSlug: string,
): Promise<PrdVersion[]> {
  const { useStepStore } = await import("@/store/step-store");
  const meta = useStepStore.getState().steps.prd?.metadata as
    | Record<string, unknown>
    | undefined;
  return (meta?.prdVersions as PrdVersion[]) ?? [];
}

/** Reset in-memory version cache (for testing / re-initialization). */
export async function clearPrdVersions(): Promise<void> {
  const { useStepStore } = await import("@/store/step-store");
  useStepStore.getState().patchStepMeta("prd", { prdVersions: [] });
}

export const prdSnapshot: StepSnapshot = createStepDataSnapshot("prd");
