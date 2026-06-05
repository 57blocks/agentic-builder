/**
 * Subsystem manifest — the decomposition of a large PRD into business-domain
 * subsystems that are developed separately (subsystem-by-subsystem) on top of a
 * shared, globally-built data layer + frozen API contracts.
 *
 * Produced by the Phase-0 decomposer (PRD → subsystems) and persisted to
 * `.blueprint/subsystems.json`. Each subsystem owns a slice of the system:
 * routes, API endpoints, data collections, code modules, and PRD sections. A
 * subsystem may depend on others (DAG), which fixes the build order.
 *
 * Ownership is EXCLUSIVE: every route / endpoint / collection belongs to exactly
 * one subsystem (validated by `validateSubsystemManifest`). Cross-subsystem data
 * access goes through the frozen API contract, never by reading another
 * subsystem's collections directly.
 *
 * Design note: the decomposer keys on routes / `/api/v1/<resource>` endpoints /
 * page sections / data collections — NOT on requirement IDs, which many PRDs
 * (e.g. the CSMA PRD) do not carry. `requirementIds` is therefore optional.
 */

export interface Subsystem {
  /** Stable kebab-case id, e.g. "auth-accounts", "enrollment". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** One-line purpose. */
  description?: string;
  /** Optional PRD requirement IDs owned (FR-, PAGE-, API- …), when the PRD has them. */
  requirementIds?: string[];
  /** Route paths owned (from the PRD route table), e.g. "/family/cart". */
  ownedRoutes: string[];
  /** API endpoints owned, "METHOD /api/v1/...". The resource is the domain signal. */
  ownedApiEndpoints: string[];
  /** Data collections / tables this subsystem owns (writes). Others read via contract. */
  ownedCollections: string[];
  /** Generated code module roots this subsystem owns, e.g.
   *  "backend/src/api/modules/enrollment", "frontend/src/pages/courses". */
  ownedModules: string[];
  /** Other subsystem ids this one depends on (must be built first). DAG edges. */
  dependsOn: string[];
  /** PRD section anchors that scope this subsystem's spec, e.g. "§10.4", "§15.3". */
  prdSections: string[];
  /** Relative path to the generated domain spec markdown file, e.g. "domain-auth-accounts.md".
   *  Populated by the decompose route after the file is written. */
  domainMdFile?: string;
}

export interface SubsystemManifest {
  /** Manifest schema version (bump on breaking shape changes). */
  version: number;
  /** Project tier the decomposition was produced for (S/M/L). */
  tier?: "S" | "M" | "L";
  /** ISO timestamp the manifest was generated (stamped by the caller, not here). */
  generatedAt?: string;
  /** The business-domain subsystems. */
  subsystems: Subsystem[];
  /** Optional global notes from the decomposer (e.g. shared-collection caveats). */
  notes?: string[];
}

export const SUBSYSTEM_MANIFEST_VERSION = 1;
