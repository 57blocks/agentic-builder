"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StepId, ProjectTier } from "@/_config/pipeline-flow";
import { getNodePath } from "@/_config/pipeline-flow";
import type { StepResultData, StepSnapshot, SnapshotData } from "@/app/(dashboard)/project/[projectId]/_steps/_shared/types";
import type {
  ClarificationAnswer,
  IntentResult,
} from "@/lib/agents/intent/types";

export interface PrdIntentSubmission {
  result: IntentResult;
  answers: ClarificationAnswer[];
}

// ── DB Sync ───────────────────────────────────────────────────────────────────
let _stepProjectSlug = "";

// ── AbortController for in-flight step execution ──────────────────────────────
/** AbortController for the active step SSE fetch. Aborted on reset() so
 *  switching projects cancels in-flight requests and prevents stale data
 *  from overwriting the new project's state. */
let _stepAbortController: AbortController | null = null;

/** Set to true after abort so executeStep's continuation (emitState, result
 *  processing) becomes a no-op instead of writing stale data to the store. */
let _isStepAborted = false;

// ── New Session ID ────────────────────────────────────────────────────────────
function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "ses-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Empty Step State ──────────────────────────────────────────────────────────
const ALL_STEP_IDS: StepId[] = [
  "initial", "intent", "prd", "trd", "prototype", "sysdesign", "implguide",
  "design", "pencil", "mockup", "qa", "verify",
  "env-setup", "summary", "task-breakdown",
  "agents",
  "serve", "e2e",
];

function emptySteps(): Record<StepId, StepResultData | null> {
  const rec = {} as Record<StepId, StepResultData | null>;
  for (const id of ALL_STEP_IDS) rec[id] = null;
  return rec;
}

// ── Snapshot Save Helper ──────────────────────────────────────────────────────
function saveStepSnapshot(
  get: () => StepStoreState,
  stepId: StepId,
): void {
  if (!_stepProjectSlug) return;
  const s = get();
  const stepData = s.steps[stepId];
  fetch(`/api/projects/${_stepProjectSlug}/project-step-snapshot`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stepId,
      snapshot: {
        content:   stepData?.content ?? null,
        metadata:  stepData?.metadata ?? null,
        status:    stepData?.status ?? null,
        costUsd:   stepData?.costUsd ?? null,
        durationMs: stepData?.durationMs ?? null,
        model:     stepData?.model ?? null,
        error:     stepData?.error ?? null,
      },
    }),
  }).catch((err) => console.error(`[step-store] snapshot error (${stepId}):`, err));
}

// ── Final snapshot save (called on step completion/failure) ──────────────────
function _flushStreamSave(get: () => StepStoreState) {
  // Snapshot is saved on step completion/failure.
  // During streaming, no intermediate saves occur.
}

// ── Store Interface ───────────────────────────────────────────────────────────

export interface StepStoreState {
  // ── Step results ──
  steps: Record<StepId, StepResultData | null>;

  // ── Execution state ──
  currentStep: StepId | null;
  isRunning: boolean;
  error: string | null;
  totalCostUsd: number;

  // ── Streaming ──
  streamingContent: string;
  streamingThinking: string;

  // ── Configuration persisted to DB ──
  featureBrief: string;
  codeOutputDir: string;
  fastFromPrd: boolean;
  tier: ProjectTier;

  // ── Intent conversation ──
  intentMessages: unknown[];
  intentEnrichedBrief: string;

  // ── PRD Intent (gap-detector clarifications) ──
  /** Cached set of clarification questions + user answers for the current
   *  feature brief. Null until the user finishes (or skips) the intent
   *  form. Not persisted to localStorage — re-asked on full reload. */
  prdIntent: PrdIntentSubmission | null;

  // ── Kickoff ──
  kickoffSessionId: string | null;

  // ── Hydration ──
  isHydrated: boolean;

  // ── Actions ──
  setFeatureBrief: (brief: string) => void;
  setCodeOutputDir: (dir: string) => void;
  setFastFromPrd: (fast: boolean) => void;
  setTier: (tier: ProjectTier) => void;

  /** Set a single step result */
  setStepResult: (stepId: StepId, result: StepResultData) => void;
  /** Merge extra metadata into a step without touching status/content/cost */
  patchStepMeta: (stepId: StepId, meta: Record<string, unknown>) => void;
  /** Overwrite a step's `content` only (cost / status / timing untouched).
   *  Used by manual editors so totalCostUsd isn't inflated. */
  setStepContent: (stepId: StepId, content: string) => void;
  /** Mark a step as running */
  setStepRunning: (stepId: StepId) => void;
  /** Append streaming content to step (debounced snapshot save) */
  setStepStreaming: (stepId: StepId, contentChunk: string) => void;
  /** Mark a step as completed with content */
  setStepCompleted: (stepId: StepId, content: string, costUsd?: number, durationMs?: number, metadata?: Record<string, unknown>) => void;
  /** Mark a step as failed */
  setStepFailed: (stepId: StepId, error: string) => void;

  /** Execute a step via its registered agent with SSE streaming + snapshot saving.
   *  `propagateAfterEdit` only applies alongside an `editInstruction` (PRD step). */
  executeStep: (stepId: StepId, editInstruction?: string, propagateAfterEdit?: boolean) => Promise<void>;

  /** Set the project slug for DB sync */
  setProjectSlug: (slug: string) => void;
  /** Load all state from DB */
  loadFromServer: (slug: string) => Promise<void>;
  /** Load snapshot for a specific step */
  loadStepSnapshot: (stepId: StepId) => Promise<boolean>;

  /** Save intent conversation snapshot */
  saveIntentSnapshot: (messages: unknown[], enrichedBrief: string) => void;

  /** Set or clear the PRD intent submission (questions + user answers). */
  setPrdIntent: (intent: PrdIntentSubmission | null) => void;

  /** Start the full pipeline (preparation → kickoff) */
  startPipeline: (featureBrief: string) => void;
  /** Reset all state */
  reset: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStepStore = create<StepStoreState>()(
  persist(
    (set, get) => ({
      steps: emptySteps(),
      currentStep: null,
      isRunning: false,
      error: null,
      totalCostUsd: 0,
      streamingContent: "",
      streamingThinking: "",
      featureBrief: "",
      codeOutputDir: "generated-code",
      fastFromPrd: true,
      tier: "M",
      intentMessages: [],
      intentEnrichedBrief: "",
      prdIntent: null,
      kickoffSessionId: null,
      isHydrated: false,

      // ── Simple Setters ──
      setFeatureBrief: (brief) => set({ featureBrief: brief.trim() }),
      setCodeOutputDir: (dir) => {
        const trimmed = dir.trim();
        set({ codeOutputDir: trimmed.length > 0 ? trimmed : "generated-code" });
      },
      setFastFromPrd: (fast) => set({ fastFromPrd: fast }),
      setTier: (tier) => set({ tier }),

      // ── Step Result Mutations ──
      setStepResult: (stepId, result) => {
        set((s) => ({
          steps: { ...s.steps, [stepId]: result },
          totalCostUsd: s.totalCostUsd + (result.costUsd ?? 0),
        }));
        saveStepSnapshot(get, stepId);
      },

      setStepContent: (stepId, content) => {
        set((s) => {
          const existing = s.steps[stepId];
          if (!existing) return s;
          return {
            steps: {
              ...s.steps,
              [stepId]: {
                ...existing,
                content,
                // Bump timestamp so downstream "what changed" diffing works.
                timestamp: new Date().toISOString(),
              },
            },
          };
        });
        saveStepSnapshot(get, stepId);
      },

      patchStepMeta: (stepId, meta) => {
        set((s) => {
          const existing = s.steps[stepId];
          return {
            steps: {
              ...s.steps,
              [stepId]: {
                ...(existing ?? { stepId, status: "pending" as const, timestamp: new Date().toISOString() }),
                metadata: { ...(existing?.metadata ?? {}), ...meta },
              },
            },
          };
        });
        // Snapshot is saved on step completion only (setStepCompleted / setStepFailed)
      },

      setStepRunning: (stepId) => {
        const prevState = get();
        console.log("[step-store] setStepRunning", { stepId, wasRunning: prevState.isRunning, wasCurrentStep: prevState.currentStep });
        set((s) => ({
          currentStep: stepId,
          isRunning: true,
          error: null,
          streamingContent: "",
          streamingThinking: "",
          steps: {
            ...s.steps,
            [stepId]: {
              stepId,
              status: "running",
              timestamp: new Date().toISOString(),
              metadata: s.steps[stepId]?.metadata ?? null,
            },
          },
        }));
      },

      setStepStreaming: (stepId, contentChunk) => {
        set((s) => ({
          streamingContent: s.streamingContent + contentChunk,
          steps: {
            ...s.steps,
            [stepId]: {
              stepId,
              status: "running",
              content: (s.steps[stepId]?.content ?? "") + contentChunk,
              timestamp: new Date().toISOString(),
              metadata: s.steps[stepId]?.metadata ?? null,
            },
          },
        }));
      },

      setStepCompleted: (stepId, content, costUsd = 0, durationMs = 0, metadata) => {
        set((s) => ({
          steps: {
            ...s.steps,
            [stepId]: {
              stepId,
              status: "completed",
              content,
              costUsd,
              durationMs,
              timestamp: new Date().toISOString(),
              // Preserve existing metadata and merge in any newly provided metadata
              metadata: {
                ...(s.steps[stepId]?.metadata ?? {}),
                ...(metadata ?? {}),
              },
            },
          },
          totalCostUsd: s.totalCostUsd + costUsd,
          streamingContent: "",
          streamingThinking: "",
          isRunning: false,
          currentStep: null,
        }));
        saveStepSnapshot(get, stepId);
      },

      setStepFailed: (stepId, error) => {
        // Preserve any existing content/metadata — a failed (re)run must not
        // erase previously-good output. This is critical for propagation, where
        // a downstream failure surfaces as a "prd" step failure and would
        // otherwise wipe the PRD and persist an empty snapshot.
        set((s) => ({
          steps: {
            ...s.steps,
            [stepId]: {
              ...(s.steps[stepId] ?? { stepId }),
              stepId,
              status: "failed",
              error,
              timestamp: new Date().toISOString(),
              metadata: s.steps[stepId]?.metadata ?? null,
            },
          },
          isRunning: false,
          currentStep: null,
          error,
        }));
        saveStepSnapshot(get, stepId);
      },

      // ── DB Sync ──
      setProjectSlug: (slug) => {
        _stepProjectSlug = slug;
      },

      loadFromServer: async (slug: string) => {
        _stepProjectSlug = slug;
        try {
          // Load all step snapshots from the flat table
          const snapResp = await fetch(`/api/projects/${slug}/project-step-snapshot`, { cache: "no-store" });
          if (snapResp.ok) {
            const snapData = (await snapResp.json()) as { snapshots?: Record<string, { content?: string; metadata?: Record<string, unknown> }> };
            if (snapData.snapshots) {
              const steps = emptySteps();
              for (const [stepId, snap] of Object.entries(snapData.snapshots)) {
                if (snap.content || snap.metadata) {
                  (steps as Record<string, unknown>)[stepId] = {
                    stepId,
                    status: snap.content ? "completed" : "pending",
                    content: snap.content ?? null,
                    metadata: snap.metadata ?? null,
                    timestamp: new Date().toISOString(),
                  };
                }
              }
              set({ steps, isHydrated: true });
              return;
            }
          }

        } catch (err) {
          console.error("[step-store] loadFromServer error:", err);
        } finally {
          set({ isHydrated: true });
        }
      },

      loadStepSnapshot: async (stepId: StepId): Promise<boolean> => {
        if (!_stepProjectSlug || get().isRunning) return false;
        try {
          const url = `/api/projects/${_stepProjectSlug}/project-step-snapshot?stepId=${encodeURIComponent(stepId)}`;
          const resp = await fetch(url, { cache: "no-store" });
          if (!resp.ok) return false;
          const data = (await resp.json()) as { snapshot?: { metadata?: Record<string, unknown>; content?: string } | null } | null;
          if (!data?.snapshot) return false;
          // Restore intent messages from metadata
          const meta = data.snapshot.metadata as Record<string, unknown> | undefined;
          if (stepId === "intent" && meta?.intentMessages) {
            set({
              intentMessages: meta.intentMessages as unknown[],
              intentEnrichedBrief: (meta.intentEnrichedBrief as string) ?? "",
            });
          }
          return true;
        } catch (err) {
          console.error(`[step-store] loadStepSnapshot error (${stepId}):`, err);
          return false;
        }
      },

      setPrdIntent: (intent) => set({ prdIntent: intent }),

      saveIntentSnapshot: (messages, enrichedBrief) => {
        // Update step-store's own intent state
        set({ intentMessages: messages, intentEnrichedBrief: enrichedBrief });
        if (!_stepProjectSlug) return;
        const s = get();
        const path = getNodePath("intent");
        if (!path) return;
        const snapshot = {
          featureBrief: s.featureBrief,
          currentStep: s.currentStep,
          totalCostUsd: s.totalCostUsd,
          isRunning: false,
          fastFromPrd: s.fastFromPrd,
          codeOutputDir: s.codeOutputDir,
          steps: s.steps as Record<string, unknown>,
          intentMessages: messages,
          intentEnrichedBrief: enrichedBrief,
        };
        fetch(`/api/projects/${_stepProjectSlug}/project-step-snapshot`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId: "intent",
            snapshot: {
              content: s.steps.intent?.content ?? null,
              metadata: { ...(s.steps.intent?.metadata as Record<string, unknown> ?? {}), intentMessages: messages, intentEnrichedBrief: enrichedBrief },
              status: s.steps.intent?.status ?? null,
            },
          }),
        }).catch((err) => console.error("[step-store] intent snapshot error:", err));
      },

      // ── Step Execution (replaces pipeline-store SSE flow) ──
      executeStep: async (stepId: StepId, editInstruction?: string, propagateAfterEdit?: boolean) => {
        const s = get();
        console.log("[step-store] executeStep called", { stepId, isRunning: s.isRunning, currentStep: s.currentStep, editInstruction, propagateAfterEdit });
        if (s.isRunning) {
          console.warn("[step-store] executeStep bailed: isRunning is true", { stepId, currentStep: s.currentStep });
          return;
        }

        // Lazy-load the step registry to find the agent
        let entry: { agent: { execute: (ctx: import("@/app/(dashboard)/project/[projectId]/_steps/_shared/types").StepAgentContext) => Promise<import("@/app/(dashboard)/project/[projectId]/_steps/_shared/types").StepResultData> } } | undefined;
        try {
          const mod = await import("@/app/(dashboard)/project/[projectId]/_steps/step-registry");
          entry = mod.STEP_REGISTRY[stepId];
          console.log("[step-store] step registry loaded", { stepId, hasEntry: !!entry, hasAgent: !!entry?.agent });
        } catch {
          console.error("[step-store] failed to load step registry for", stepId);
          set({ error: `Failed to load step registry for ${stepId}` });
          return;
        }
        if (!entry?.agent) {
          console.error("[step-store] no agent registered for", stepId);
          set({ error: `No agent registered for step ${stepId}` });
          return;
        }

        const sessionId = newSessionId();
        // Manual-edit propagation (propagateAfterEdit without an editInstruction)
        // re-runs DOWNSTREAM only — the PRD itself is unchanged. Keep it visible
        // instead of blanking it for the whole (long) downstream run; otherwise
        // the PRD vanishes mid-run and is lost if propagation fails. Instruction
        // edits still blank + stream the regenerated PRD as usual.
        const preservePrdContent =
          stepId === "prd" && propagateAfterEdit === true && !editInstruction;
        console.log("[step-store] calling setStepRunning for", stepId, { preservePrdContent });
        if (preservePrdContent) {
          set((st) => ({
            currentStep: stepId,
            isRunning: true,
            error: null,
            streamingContent: "",
            streamingThinking: "",
            steps: {
              ...st.steps,
              [stepId]: {
                ...(st.steps[stepId] ?? { stepId }),
                stepId,
                status: "running",
                timestamp: new Date().toISOString(),
              },
            },
          }));
        } else {
          get().setStepRunning(stepId);
        }

        // ── Abort controller for this execution ──
        _isStepAborted = false;
        const controller = new AbortController();
        _stepAbortController = controller;

        try {
          // Tier resolution priority:
          //   1. PRD's `**Project Tier: X**` badge (authoritative)
          //   2. step-store's persisted tier
          // This prevents every step from being stuck at the brief-only
          // classifier output when the PRD has already declared a tier.
          //
          // NOTE: regex is inlined here intentionally. We cannot import the
          // shared `parseTierFromPrd` helper because its module transitively
          // pulls in server-only deps (memory cache → graceful-fs → "fs"),
          // and step-store is a client component.
          const prdContent = (s.steps.prd?.content ?? "") as string;
          const tierMatch = prdContent.match(/\*\*Project Tier:\s*([SML])\*\*/i);
          const parsedTier =
            tierMatch &&
            (tierMatch[1].toUpperCase() === "S" ||
              tierMatch[1].toUpperCase() === "M" ||
              tierMatch[1].toUpperCase() === "L")
              ? (tierMatch[1].toUpperCase() as ProjectTier)
              : null;
          const effectiveTier: ProjectTier = parsedTier ?? s.tier;

          const ctx = {
            projectSlug: _stepProjectSlug,
            featureBrief: s.featureBrief,
            codeOutputDir: s.codeOutputDir,
            previousSteps: s.steps as Partial<Record<StepId, import("@/app/(dashboard)/project/[projectId]/_steps/_shared/types").StepResultData>>,
            tier: effectiveTier,
            sessionId,
            editInstruction,
            propagateAfterEdit,
            prdIntent: s.prdIntent,
            abortSignal: controller.signal,
            emitState: (update: Partial<import("@/app/(dashboard)/project/[projectId]/_steps/_shared/types").StepAgentState>) => {
              // No-op after abort — don't write stale streaming data to the new project's store
              if (_isStepAborted) return;
              if (update.streamingContent !== undefined) {
                const current = get().streamingContent;
                if (update.streamingContent.length <= current.length) {
                  // Clearing or replacing — sync zustand store directly without touching step content
                  set({ streamingContent: update.streamingContent });
                } else {
                  const delta = update.streamingContent.slice(current.length);
                  if (delta) get().setStepStreaming(stepId, delta);
                }
              }
              if (update.streamingThinking !== undefined) {
                set({ streamingThinking: update.streamingThinking });
              }
              if (update.isRunning !== undefined) set({ isRunning: update.isRunning });
              if (update.error !== undefined) set({ error: update.error });
            },
            getState: () => ({
              streamingContent: get().streamingContent,
              streamingThinking: get().streamingThinking,
              isRunning: get().isRunning,
              error: get().error,
              totalCostUsd: get().totalCostUsd,
            }),
          };

          console.log("[step-store] about to call agent.execute for", stepId, { isRunning: get().isRunning, currentStep: get().currentStep });
          const result = await entry.agent.execute(ctx);
          console.log("[step-store] agent.execute completed for", stepId, { status: result.status, contentLen: result.content?.length });

          // Don't process results after abort — store has been reset for the new project
          if (_isStepAborted) return;

          if (result.status === "completed") {
            get().setStepCompleted(stepId, result.content ?? "", result.costUsd ?? 0, result.durationMs ?? 0, result.metadata ?? undefined);
          } else if (result.status === "failed") {
            get().setStepFailed(stepId, result.error ?? "Step failed");
          }
        } catch (err) {
          if (_isStepAborted) return;
          get().setStepFailed(stepId, err instanceof Error ? err.message : "Unknown error");
        }
      },

      // ── Legacy Pipeline Start (deprecated, use executeStep instead) ──
      startPipeline: (featureBrief: string) => {
        const { codeOutputDir, fastFromPrd } = get();
        const sessionId = newSessionId();
        set({
          isRunning: true,
          error: null,
          steps: emptySteps(),
          currentStep: null,
          totalCostUsd: 0,
          featureBrief,
          kickoffSessionId: sessionId,
        });

        fetch("/api/agents/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            featureBrief,
            codeOutputDir,
            fastFromPrd,
            pauseAfterPrd: !fastFromPrd,
            sessionId,
          }),
        }).catch((err) => {
          set({
            isRunning: false,
            error: err instanceof Error ? err.message : "Pipeline request failed",
          });
        });
      },

      reset: () => {
        // Preserve user input that should survive project switches
        const currentFeatureBrief = get().featureBrief;

        // Abort any in-flight SSE request so stale data doesn't overwrite new project state
        _isStepAborted = true;
        _stepAbortController?.abort();
        _stepAbortController = null;

        set({
          steps: emptySteps(),
          currentStep: null,
          totalCostUsd: 0,
          isRunning: false,
          error: null,
          featureBrief: currentFeatureBrief,
          streamingContent: "",
          streamingThinking: "",
          kickoffSessionId: null,
          intentMessages: [],
          intentEnrichedBrief: "",
          prdIntent: null,
        });
      },
    }),
    {
      name: "agentic-step-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        fastFromPrd: state.fastFromPrd,
        featureBrief: state.featureBrief,
      }),
    },
  ),
);
