"use client";

import type { CodingAgentInstance, CodingAgentRole } from "@/lib/pipeline/types";

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  architect: { bg: "bg-amber-100",  text: "text-amber-700",  label: "A" },
  backend:   { bg: "bg-blue-100",   text: "text-blue-700",   label: "B" },
  frontend:  { bg: "bg-violet-100", text: "text-violet-700", label: "F" },
  test:      { bg: "bg-green-100",  text: "text-green-700",  label: "T" },
  fullstack: { bg: "bg-fuchsia-100", text: "text-fuchsia-700", label: "FS" },
};

const PLACEHOLDER_ORDER: CodingAgentRole[] = ["architect", "backend", "frontend", "fullstack", "test"];

interface AgentBubblesProps {
  agents: CodingAgentInstance[];
  /** Roles to show as gray placeholders before any agent has started.
   *  Derived from the planned tasks so we don't show roles the graph
   *  never uses (e.g. "B" on a frontend-only project). */
  placeholderRoles?: CodingAgentRole[];
}

export function AgentBubbles({ agents, placeholderRoles }: AgentBubblesProps) {
  if (agents.length === 0) {
    const roles = (placeholderRoles && placeholderRoles.length > 0)
      ? PLACEHOLDER_ORDER.filter((r) => placeholderRoles.includes(r))
      : [];
    if (roles.length === 0) return null;
    return (
      <div className="flex items-center gap-1">
        {roles.map((role) => {
          const cfg = ROLE_COLORS[role];
          return (
            <div
              key={role}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400"
              title={role}
            >
              {cfg?.label ?? "?"}
            </div>
          );
        })}
      </div>
    );
  }

  // Collapse the per-instance agents down to one bubble per role (A/F/B/T/FS).
  // The top-right badge reports how many workers of that role are *currently
  // active* (status === "working"), i.e. how many tasks of that role are being
  // processed right now. Roles that exist but are idle keep a dimmed letter
  // with no badge. The badge appears/disappears as tasks start and finish.
  const presentRoles = new Set<CodingAgentRole>();
  const activeByRole = new Map<CodingAgentRole, number>();
  for (const agent of agents) {
    presentRoles.add(agent.role);
    // Require BOTH a "working" status and a live currentTaskId. A missed task
    // or phase end-signal can orphan an instance in "working" with no task; the
    // currentTaskId guard stops those phantoms from inflating the active count.
    if (agent.status === "working" && agent.currentTaskId != null) {
      activeByRole.set(agent.role, (activeByRole.get(agent.role) ?? 0) + 1);
    }
  }
  const roles = PLACEHOLDER_ORDER.filter((role) => presentRoles.has(role));

  return (
    <div className="flex items-center gap-1.5">
      {roles.map((role) => {
        const cfg = ROLE_COLORS[role] ?? { bg: "bg-slate-100", text: "text-slate-600", label: "?" };
        const active = activeByRole.get(role) ?? 0;
        return (
          <div key={role} className="relative">
            <div
              className={`w-7 h-7 rounded-full ${cfg.bg} ${cfg.text} flex items-center justify-center text-[10px] font-bold transition-all ${active === 0 ? "opacity-40" : ""}`}
              title={`${role} — ${active} active worker${active === 1 ? "" : "s"}`}
            >
              {cfg.label}
            </div>
            {active > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-violet-600 text-white text-[9px] font-bold leading-none shadow-sm"
                title={`${active} worker${active === 1 ? "" : "s"} of this role active now`}
              >
                {active}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
