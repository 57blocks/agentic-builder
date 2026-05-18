import type {
  CodingAgentRole,
  KickoffWorkItem,
} from "@/lib/pipeline/types";
import type { SupervisorState } from "../state";

/**
 * Maps a kickoff "phase" name to the canonical coding-agent role that should
 * own the work item. Falls back to keyword inference when no explicit phase
 * mapping is configured.
 */

export const PHASE_TO_ROLE: Record<string, CodingAgentRole> = {
  Scaffolding: "architect",
  "Data Layer": "architect",
  Infrastructure: "architect",
  "Auth & Gateway": "backend",
  "Backend Services": "backend",
  Integration: "backend",
  Frontend: "frontend",
  Testing: "test",
};

export function inferRole(task: KickoffWorkItem): CodingAgentRole {
  if (PHASE_TO_ROLE[task.phase]) return PHASE_TO_ROLE[task.phase];
  const lower = `${task.phase} ${task.title} ${task.description}`.toLowerCase();
  if (/test|spec|e2e|vitest|playwright|k6|coverage/.test(lower)) return "test";
  if (
    /scaffold|infra|docker|helm|ci\/cd|deploy|config|schema|migrat/.test(lower)
  )
    return "architect";
  if (
    /frontend|react|component|page|ui|css|tailwind|hook|store|vite/.test(lower)
  )
    return "frontend";
  return "backend";
}

export function isFrontendOnly(state: SupervisorState): boolean {
  return state.backendTasks.length === 0;
}
