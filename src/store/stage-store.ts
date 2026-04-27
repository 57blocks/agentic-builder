"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Stage Types ─────────────────────────────────────────────────────────────

export type StageId = "preparation" | "kickoff" | "coding" | "preview";

export type StageStatus = "idle" | "active" | "completed" | "error";

export interface StageMeta {
  id: string; // display number "01" ~ "04"
  name: string;
  desc: string;
}

// ─── Sub-Stage Types ──────────────────────────────────────────────────────────

/** Sub-stages inside each stage. Names map 1-to-1 to pipeline step IDs where applicable. */
export type PreparationSubStageId =
  | "initial"     // prompt input before pipeline starts
  | "intent"      // intent extraction step
  | "prd"         // product requirements doc
  | "trd"         // technical requirements doc
  | "sysdesign"   // system design
  | "implguide"   // implementation guide
  | "design"      // design spec
  | "pencil"      // pencil wireframe
  | "mockup"      // mockup generation
  | "qa";         // QA checklist

export type KickoffSubStageId =
  | "env-setup"       // environment scaffolding
  | "task-breakdown"; // task breakdown planning

export type CodingSubStageId =
  | "architect"  // architect agent
  | "backend"    // backend agent
  | "frontend"   // frontend agent
  | "test"       // test agent
  | "verify";    // integration verify

export type PreviewSubStageId =
  | "serve"  // dev-server startup
  | "e2e";   // e2e smoke test

/** Discriminated union of all sub-stage IDs. */
export type SubStageId =
  | PreparationSubStageId
  | KickoffSubStageId
  | CodingSubStageId
  | PreviewSubStageId;

export interface SubStageMeta {
  label: string;
  /** Optional short description shown in the sub-stage indicator. */
  desc?: string;
}

// ─── Sub-Stage Registry ───────────────────────────────────────────────────────

export const SUB_STAGE_ORDER: Record<StageId, SubStageId[]> = {
  preparation: ["initial", "intent", "prd", "trd", "sysdesign", "implguide", "design", "pencil", "mockup", "qa"],
  kickoff:     ["env-setup", "task-breakdown"],
  coding:      ["architect", "backend", "frontend", "test", "verify"],
  preview:     ["serve", "e2e"],
};

export const SUB_STAGE_META: Record<SubStageId, SubStageMeta> = {
  // preparation
  initial:      { label: "Initial",          desc: "Describe your agent objective" },
  intent:       { label: "Intent",           desc: "Extract intent from brief" },
  prd:          { label: "PRD",              desc: "Product requirements" },
  trd:          { label: "TRD",              desc: "Technical requirements" },
  sysdesign:    { label: "System Design",    desc: "Architecture overview" },
  implguide:    { label: "Impl. Guide",      desc: "Implementation guide" },
  design:       { label: "Design Spec",      desc: "UI design spec" },
  pencil:       { label: "Pencil",           desc: "Wireframe generation" },
  mockup:       { label: "Mockup",           desc: "Visual mockup" },
  qa:           { label: "QA",               desc: "QA checklist" },
  // kickoff
  "env-setup":       { label: "Env Setup",       desc: "Scaffold project environment" },
  "task-breakdown":  { label: "Task Breakdown",  desc: "Plan coding tasks" },
  // coding
  architect:    { label: "Architect",        desc: "Architect agent" },
  backend:      { label: "Backend",          desc: "Backend agent" },
  frontend:     { label: "Frontend",         desc: "Frontend agent" },
  test:         { label: "Tests",            desc: "Test agent" },
  verify:       { label: "Verify",           desc: "Integration verify" },
  // preview
  serve:        { label: "Dev Server",       desc: "Start preview server" },
  e2e:          { label: "E2E",              desc: "End-to-end smoke test" },
};

// ─── Stage Constants ──────────────────────────────────────────────────────────

export const STAGE_ORDER: StageId[] = ["preparation", "kickoff", "coding", "preview"];

export const STAGE_META: Record<StageId, StageMeta> = {
  preparation: { id: "01", name: "Preparation", desc: "Resource mapping & logic flow" },
  kickoff:     { id: "02", name: "Kick-off",    desc: "Environment spinning" },
  coding:      { id: "03", name: "Coding",      desc: "Autonomous logic generation" },
  preview:     { id: "04", name: "Preview",     desc: "Final testing & verification" },
};

/** Pipeline step IDs that belong to the preparation stage (excludes "initial" which is UI-only). */
export const PREPARATION_STEP_IDS = [
  "intent", "prd", "trd", "sysdesign", "implguide", "design", "pencil", "mockup", "qa",
] as const;

// ─── Default active sub-stage per stage ──────────────────────────────────────

const DEFAULT_SUB_STAGES: Record<StageId, SubStageId> = {
  preparation: "initial",
  kickoff:     "env-setup",
  coding:      "architect",
  preview:     "serve",
};

// ─── Store Interface ──────────────────────────────────────────────────────────

interface StageStoreState {
  /** The stage currently visible */
  activeStage: StageId;

  /** The active sub-stage for each stage (persisted independently) */
  activeSubStages: Record<StageId, SubStageId>;

  /** Current project slug — persisted so sidebar can restore the active project on refresh */
  projectSlug: string;
  /** AI-generated (or user-supplied) project name — persisted for sidebar display on refresh */
  projectName: string;

  // ── Stage navigation ──────────────────────────────────────────────────────

  /** Navigate directly to a stage. Set force=true to bypass any guards. */
  goToStage: (stage: StageId, force?: boolean) => void;
  /** Advance to the next stage. No-op on the last stage. */
  advanceStage: () => void;
  /** Go back one stage. */
  prevStage: () => void;

  // ── Sub-stage navigation ──────────────────────────────────────────────────

  /** Navigate to a specific sub-stage within the given (or current) stage. */
  goToSubStage: (subStage: SubStageId, stage?: StageId) => void;
  /**
   * Advance to the next sub-stage within the current stage.
   * When at the last sub-stage, optionally advances to the next stage.
   */
  advanceSubStage: (opts?: { crossStage?: boolean }) => void;
  /** Go back one sub-stage within the current stage. */
  prevSubStage: () => void;

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns the active sub-stage id for the current (or given) stage. */
  getActiveSubStage: (stage?: StageId) => SubStageId;

  /** Reset all navigation back to the beginning. */
  resetStage: () => void;

  /** Update the display name for the current project (called after AI generates a name). */
  setProjectName: (name: string) => void;
  /** Update the current project slug (called when navigating to a project). */
  setProjectSlug: (slug: string) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStageStore = create<StageStoreState>()(
  persist(
    (set, get) => ({
      activeStage: "preparation",
      activeSubStages: { ...DEFAULT_SUB_STAGES },
      projectSlug: "",
      projectName: "New Project",

      // ── Stage navigation ────────────────────────────────────────────────

      goToStage: (stage, _force = false) => {
        set({ activeStage: stage });
      },

      advanceStage: () => {
        const { activeStage } = get();
        const idx = STAGE_ORDER.indexOf(activeStage);
        if (idx < STAGE_ORDER.length - 1) {
          set({ activeStage: STAGE_ORDER[idx + 1] });
        }
      },

      prevStage: () => {
        const { activeStage } = get();
        const idx = STAGE_ORDER.indexOf(activeStage);
        if (idx > 0) {
          set({ activeStage: STAGE_ORDER[idx - 1] });
        }
      },

      // ── Sub-stage navigation ────────────────────────────────────────────

      goToSubStage: (subStage, stage) => {
        const targetStage = stage ?? get().activeStage;
        set((s) => ({
          activeStage: targetStage,
          activeSubStages: { ...s.activeSubStages, [targetStage]: subStage },
        }));
      },

      advanceSubStage: (opts = {}) => {
        const { activeStage, activeSubStages } = get();
        const order = SUB_STAGE_ORDER[activeStage];
        const current = activeSubStages[activeStage];
        const idx = order.indexOf(current);

        if (idx < order.length - 1) {
          // Move to next sub-stage within this stage
          set((s) => ({
            activeSubStages: {
              ...s.activeSubStages,
              [activeStage]: order[idx + 1],
            },
          }));
        } else if (opts.crossStage) {
          // At last sub-stage — cross into next stage
          const stageIdx = STAGE_ORDER.indexOf(activeStage);
          if (stageIdx < STAGE_ORDER.length - 1) {
            set({ activeStage: STAGE_ORDER[stageIdx + 1] });
          }
        }
      },

      prevSubStage: () => {
        const { activeStage, activeSubStages } = get();
        const order = SUB_STAGE_ORDER[activeStage];
        const current = activeSubStages[activeStage];
        const idx = order.indexOf(current);

        if (idx > 0) {
          set((s) => ({
            activeSubStages: {
              ...s.activeSubStages,
              [activeStage]: order[idx - 1],
            },
          }));
        }
      },

      getActiveSubStage: (stage) => {
        const { activeStage, activeSubStages } = get();
        return activeSubStages[stage ?? activeStage];
      },

      setProjectName: (name) => set({ projectName: name }),

      setProjectSlug: (slug) => set({ projectSlug: slug }),

      resetStage: () =>
        set({
          activeStage: "preparation",
          activeSubStages: { ...DEFAULT_SUB_STAGES },
          projectName: "New Project",
          projectSlug: "",
        }),
    }),
    {
      name: "agentic-stage-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeStage: state.activeStage,
        activeSubStages: state.activeSubStages,
        projectSlug: state.projectSlug,
        projectName: state.projectName,
      }),
    },
  ),
);
