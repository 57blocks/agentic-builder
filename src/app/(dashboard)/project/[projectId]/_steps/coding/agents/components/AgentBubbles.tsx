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

  return (
    <div className="flex items-center gap-1">
      {agents.map((agent) => {
        const cfg = ROLE_COLORS[agent.role] ?? { bg: "bg-slate-100", text: "text-slate-600", label: "?" };
        const isWorking = agent.status === "working";
        return (
          <div key={agent.id} className="relative">
            <div
              className={`w-7 h-7 rounded-full ${cfg.bg} ${cfg.text} flex items-center justify-center text-[10px] font-bold transition-all`}
              title={agent.label}
            >
              {cfg.label}
            </div>
            {isWorking && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-500 border-2 border-white" />
            )}
          </div>
        );
      })}
    </div>
  );
}
