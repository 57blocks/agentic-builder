/**
 * Re-export for backward-compatible imports: `@/lib/agents/project-classifier`.
 * Prefer: `import { ... } from "@/lib/agents"`.
 */
export {
  classifyProject,
  normalizeProjectTier,
  parseTierFromPrd,
  extractClassificationFromPrd,
  type ProjectTier,
  type ProjectClassification,
} from "./shared/project-classifier";
