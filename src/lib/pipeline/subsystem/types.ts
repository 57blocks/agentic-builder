/**
 * Types for PRD subsystem decomposition (Phase 1 of the subsystem-orchestration
 * feature). A large multi-subsystem PRD is split into a shared-contracts slice
 * plus one self-contained slice per subsystem, so each can be generated
 * independently (shared-contracts-first) instead of one giant one-shot run.
 */

export interface SubsystemDef {
  /** kebab id, e.g. "family". */
  id: string;
  /** Display name, e.g. "家庭端". */
  name: string;
  /** One-line scope summary. */
  summary: string;
  /** H2 heading lines (verbatim, incl. leading "## ") that belong to this subsystem. */
  sectionHeadings: string[];
  /** Other subsystem ids this one depends on (usually ["shared"]). */
  dependsOn: string[];
}

export interface SubsystemPlan {
  subsystems: SubsystemDef[];
  /** H2 headings shared across all subsystems (data model, API contracts,
   *  glossary, auth, roles, NFR, error codes, …). */
  sharedHeadings: string[];
  notes?: string;
}

export interface PrdSlice {
  id: string;
  name: string;
  markdown: string;
}

export interface SlicedPrd {
  /** The shared-contracts slice — generate this first. */
  shared: PrdSlice;
  /** One self-contained slice per subsystem (shared sections + own sections). */
  subsystems: PrdSlice[];
  /** H2 headings the plan didn't assign to anyone (defaulted into `shared`). */
  unassigned: string[];
}
