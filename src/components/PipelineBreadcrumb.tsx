"use client";

import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import {
  getStagesForTier,
  getNodePath,
  areDependenciesMet,
  STAGE_LABELS,
  GROUP_LABELS,
  STEP_LABELS,
} from "@/_config/pipeline-flow";
import type { StepId, StageId, ProjectTier } from "@/_config/pipeline-flow";
import type { StepStatus } from "@/app/(dashboard)/project/[projectId]/_steps/_shared/types";

// ── Status Dot ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: StepStatus }) {
  const colors: Record<StepStatus, string> = {
    idle: "bg-gray-300",
    running: "bg-blue-500 animate-pulse",
    completed: "bg-emerald-500",
    failed: "bg-red-500",
  };
  return <span className={`inline-block size-2 rounded-full shrink-0 ${colors[status]}`} />;
}

interface GroupItem {
  id: string;
  label: string;
  status?: StepStatus;
  disabled?: boolean;
  meta?: { isStep?: boolean; parallelHint?: boolean };
  children?: { id: string; label: string; status: StepStatus; disabled: boolean }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineBreadcrumbProps {
  activeStep: StepId;
  onStepChange: (stepId: StepId) => void;
  tier: ProjectTier;
  stepStates: Partial<Record<string, { status: string } | null>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cascading Menu Component
// ═══════════════════════════════════════════════════════════════════════════════

function CascadingMenu({
  stages,
  activeStageId,
  activeGroupId,
  activeStep,
  completedStepIds,
  tier,
  stepStates,
  onNavigate,
  onClose,
}: {
  stages: ReturnType<typeof getStagesForTier>;
  activeStageId: string;
  activeGroupId: string | null;
  activeStep: string;
  completedStepIds: Set<string>;
  tier: ProjectTier;
  stepStates: Partial<Record<string, { status: string } | null>>;
  onNavigate: (stepId: StepId) => void;
  onClose: () => void;
}) {
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  const onStageHover = useCallback((id: string | null) => {
    setHoveredStageId(id);
    setHoveredGroupId(null);
  }, []);

  const effectiveStageId = hoveredStageId ?? activeStageId;
  const hoveredStage = stages.find((s) => s.id === effectiveStageId);

  // Steps that drive user-facing runtime actions (start/stop dev server,
  // trigger a deploy) never produce a snapshot of their own — they always
  // start from an idle state. Treat them as navigable even when their
  // snapshot is empty so the user can always click in.
  const SNAPSHOTLESS_STEPS = new Set(["intent", "initial", "deploy", "serve"]);
  const noSnapshot = (id: string) => stepStates[id] == null && !SNAPSHOTLESS_STEPS.has(id);

  const prdDone = (stepStates["prd"] as { status?: string } | null | undefined)?.status === "completed";
  const l2Items: GroupItem[] = (hoveredStage?.children ?? [])
    .filter((g) => g.id !== "initial")
    .filter((g) => !g.tiers || g.tiers.includes(tier))
    .filter((g) => !g.tiers || prdDone)
    .map((g) => {
      const isStandalone = !g.children || g.children.length === 0;
      const stepResult = isStandalone ? stepStates[g.id] : null;
      return {
        id: g.id,
        label: GROUP_LABELS[g.id as keyof typeof GROUP_LABELS] ?? g.label,
        status: (stepResult as { status?: string } | null | undefined)?.status as StepStatus | undefined,
        disabled: isStandalone
          ? noSnapshot(g.id) && g.id !== activeStep
          : false,
        meta: { isStep: isStandalone, parallelHint: g.parallel && (g.children?.length ?? 0) > 1 },
        children: isStandalone
          ? undefined
          : g.children
              ?.filter((s) => !s.tiers || s.tiers.includes(tier))
              .map((s) => {
                const sid = s.id as StepId;
                const result = stepStates[sid];
                // getFlowNode walks all levels and returns the first match;
                // "deploy" collides (stage and step share id "deploy"), so
                // the stage's dependsOn:["preview"] leaks into the step check.
                // Skip depsMet for deploy since the step itself has no dependsOn.
                const depsMet = sid === "deploy" || areDependenciesMet(sid, completedStepIds);
                return {
                  id: s.id,
                  label: STEP_LABELS[sid] ?? s.label,
                  status: ((result as { status?: string } | null)?.status ?? "idle") as StepStatus,
                  disabled: (noSnapshot(sid) && sid !== activeStep) || (!depsMet && sid !== activeStep),
                };
              }),
      };
    });

  const effectiveGroupId = hoveredGroupId ?? l2Items[0]?.id ?? null;
  const hoveredGroup = l2Items.find((g) => g.id === effectiveGroupId);
  const l3Items = hoveredGroup?.children ?? [];

  const handleItemClick = (id: string) => {
    onNavigate(id as StepId);
    onClose();
  };

  const isItemDisabled = (id: string, disabled?: boolean) =>
    disabled === true;

  return (
    <div className="flex rounded-lg shadow-lg border border-[#e2e8f0] bg-white">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .col-enter { animation: fadeSlideIn 0.15s ease-out both; }
      `}</style>
      {/* Column 1: Stages */}
      <div className="min-w-[180px] py-1 bg-white col-enter" style={{ animationDelay: "0ms" }}>
        {stages.map((stage) => {
          const sid = stage.id as StageId;
          const label = `${STAGE_LABELS[sid]?.num ?? ""} ${STAGE_LABELS[sid]?.name ?? stage.label}`;
          const isHovered = hoveredStageId === stage.id;
          const isActive = stage.id === activeStageId && !hoveredStageId;
          return (
            <button
              key={stage.id}
              type="button"
              onMouseEnter={() => onStageHover(stage.id)}
              className={[
                "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                isActive
                  ? "bg-[#4f46e5]/10 text-[#4f46e5] font-medium"
                  : isHovered
                    ? "bg-[#f1f5f9] text-[#0b1c30]"
                    : "text-[#334155] hover:bg-[#f8fafc]",
              ].join(" ")}
            >
              <span className="flex-1 truncate">{label}</span>
              <ChevronRight size={12} className="text-[#94a3b8] shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Column 2: Groups */}
      {l2Items.length > 0 && (
        <div className="min-w-[180px] border-l border-[#e2e8f0] py-1 bg-white col-enter" style={{ animationDelay: "60ms" }}>
          {l2Items.map((item) => {
            const isHovered = hoveredGroupId === item.id;
            const isActive = item.id === activeGroupId && !hoveredGroupId && !hoveredStageId;
            const isClickable = item.meta?.isStep;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setHoveredGroupId(item.id)}
                onClick={() => !isItemDisabled(item.id, item.disabled) && isClickable && handleItemClick(item.id)}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                  isItemDisabled(item.id, item.disabled)
                    ? "text-[#cbd5e1] cursor-not-allowed"
                    : isActive
                      ? "bg-[#4f46e5]/10 text-[#4f46e5] font-medium"
                      : isHovered
                        ? "bg-[#f1f5f9] text-[#0b1c30]"
                        : "text-[#334155] hover:bg-[#f8fafc]",
                ].join(" ")}
              >
                <span className="flex-1 truncate">{item.label}</span>
                {item.meta?.parallelHint && <span className="text-[10px] text-[#94a3b8] shrink-0">∥</span>}
                {!item.meta?.isStep && (
                  <ChevronRight size={12} className="text-[#94a3b8] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Column 3: Steps */}
      {l3Items.length > 0 && (
        <div className="min-w-[180px] border-l border-[#e2e8f0] py-1 bg-white col-enter" style={{ animationDelay: "120ms" }}>
          {l3Items.map((item) => {
            const isActive = item.id === activeStep && !hoveredStageId && !hoveredGroupId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => !isItemDisabled(item.id, item.disabled) && handleItemClick(item.id)}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                  isItemDisabled(item.id, item.disabled)
                    ? "text-[#cbd5e1] cursor-not-allowed"
                    : isActive
                      ? "bg-[#4f46e5]/10 text-[#4f46e5] font-medium"
                      : "text-[#334155] hover:bg-[#f8fafc]",
                ].join(" ")}
              >
                <StatusDot status={item.status} />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function PipelineBreadcrumb({
  activeStep,
  onStepChange,
  tier,
  stepStates,
}: PipelineBreadcrumbProps) {
  const currentPath = useMemo(() => getNodePath(activeStep), [activeStep]);
  const stages = useMemo(() => getStagesForTier(tier), [tier]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStageId, setMenuStageId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const activeStageId = currentPath?.stage.id ?? "preparation";
  const activeGroupId = currentPath?.group.id ?? null;

  // Close on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const completedStepIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, r] of Object.entries(stepStates)) {
      if (r && r.status === "completed") ids.add(id);
    }
    return ids;
  }, [stepStates]);

  // Build current path label:  Stage > Group > Step
  const pathParts: { label: string; isCurrent: boolean }[] = [];
  if (currentPath) {
    const info = STAGE_LABELS[currentPath.stage.id as StageId];
    if (info) pathParts.push({ label: `${info.num} ${info.name}`, isCurrent: false });
    const isStandalone = currentPath.step && currentPath.step.id === currentPath.group.id;
    if (currentPath.group.id !== "initial") {
      // For standalone L2 steps (e.g. prd), group.id is the step id — use STEP_LABELS
      const groupLabel = isStandalone
        ? (STEP_LABELS[currentPath.group.id as StepId] ?? currentPath.group.id)
        : (GROUP_LABELS[currentPath.group.id as keyof typeof GROUP_LABELS] ?? currentPath.group.id);
      pathParts.push({ label: groupLabel, isCurrent: !!isStandalone });
    }
    if (currentPath.step && !isStandalone) {
      const stepLabel = STEP_LABELS[currentPath.step.id as StepId] ?? currentPath.step.id;
      pathParts.push({ label: stepLabel, isCurrent: true });
    }
  }

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
    } else {
      setMenuStageId(activeStageId);
      setMenuOpen(true);
    }
  };

  return (
    <div ref={ref} className="relative inline-flex items-center text-sm py-3 select-none">
      <button
        type="button"
        onClick={toggleMenu}
        className="inline-flex items-center gap-1 px-2 py-1 -mx-1 rounded-md transition-colors hover:bg-[#f1f5f9]"
      >
        {pathParts.map((part, i) => (
          <React.Fragment key={`${part.label}-${i}`}>
            {i > 0 && <ChevronRight size={13} className="text-[#94a3b8] shrink-0" />}
            <span className={part.isCurrent ? "text-[#0b1c30] font-semibold" : "text-[#64748b]"}>
              {part.label}
            </span>
          </React.Fragment>
        ))}
      </button>

      {/* Cascading menu */}
      {menuOpen && menuStageId && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <CascadingMenu
            stages={stages}
            activeStageId={menuStageId}
            activeGroupId={activeGroupId}
            activeStep={activeStep}
            completedStepIds={completedStepIds}
            tier={tier}
            stepStates={stepStates}
            onNavigate={onStepChange}
            onClose={() => { setMenuOpen(false); setMenuStageId(null); }}
          />
        </div>
      )}
    </div>
  );
}
