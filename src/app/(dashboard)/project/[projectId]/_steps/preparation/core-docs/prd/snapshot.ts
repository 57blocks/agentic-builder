import { createStepDataSnapshot } from "../../../_shared/snapshot-context";
import type { StepSnapshot } from "../../../_shared/types";

// ── Versioned Snapshot Support ─────────────────────────────────────────────

export interface PrdVersion {
  version: number;
  content: string;
  timestamp: string;
  label: string;
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

  // Update store metadata so subsequent saveStepSnapshot picks up versions
  store.patchStepMeta("prd", { prdVersions: newVersions });

  // Persist immediately (patchStepMeta does not auto-save)
  fetch(`/api/projects/${projectSlug}/project-step-snapshot`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stepId: "prd",
      snapshot: {
        content,
        metadata: { prdVersions: newVersions },
        status: "completed",
      },
    }),
  }).catch((err) => console.error("[prdSnapshot] version save error:", err));
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
