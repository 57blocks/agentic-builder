import type { CodingAgentRole } from "@/lib/pipeline/types";

/**
 * A directory under `Engineering/` whose immediate children are skill folders
 * each containing a `SKILL.md`. Flat-file layouts (QA/skills/*.md) and
 * Mobile/OPS are intentionally excluded — see plan scope note.
 */
export interface EngineeringSourceRoot {
  /** Path relative to the `Engineering/` directory. */
  relPath: string;
  /** Which coding worker role the converted skills are filed under. */
  role: CodingAgentRole;
  /** Layout discriminator. Only "dir" is supported in this iteration. */
  layout: "dir";
}

export const ENGINEERING_SOURCE_ROOTS: ReadonlyArray<EngineeringSourceRoot> = [
  { relPath: "Backend", role: "backend", layout: "dir" },
  { relPath: "Frontend/skills", role: "frontend", layout: "dir" },
  { relPath: "AI/skills", role: "backend", layout: "dir" },
];

export function roleForSourceRoot(relPath: string): CodingAgentRole | null {
  return ENGINEERING_SOURCE_ROOTS.find((r) => r.relPath === relPath)?.role ?? null;
}
