"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { PrdQualityReportPanel } from "./PrdQualityReportPanel";
import { PrdSubsystemPanel } from "./PrdSubsystemPanel";
import type { PrdReadiness } from "./snapshot";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";

/**
 * Guided two-step PRD readiness flow (sequential):
 *   Step 1 — Validate PRD  → must run before Step 2 unlocks.
 *   Step 2 — Split Subsystems (large PRDs) → unlocked after Step 1 has a result.
 * Both are required before the PRD step's Next Step is enabled.
 */
function StepHeader(props: {
  n: number;
  title: string;
  state: "todo" | "active" | "done" | "locked";
}) {
  const { n, title, state } = props;
  const Icon = state === "done" ? CheckCircle2 : state === "locked" ? Lock : Circle;
  const color =
    state === "done"
      ? "text-green-600"
      : state === "locked"
        ? "text-slate-300"
        : "text-indigo-600";
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={color} />
      <span className={`text-sm font-semibold ${state === "locked" ? "text-slate-400" : "text-slate-900"}`}>
        Step {n} · {title}
      </span>
      {state === "done" && <span className="text-[11px] text-green-600">done</span>}
    </div>
  );
}

export function PrdReadinessPanel(props: {
  prd: string;
  spec?: PrdSpec | null;
  /** Directly triggers a PRD fix without pre-filling the edit bar. */
  onDirectFix: (instruction: string) => Promise<void>;
  onQualityResult?: () => void;
  onSubsystemResult?: () => void;
  /** Persist results to this project (survives reload). */
  projectSlug?: string;
  /** Hydrated readiness state (from prd step metadata) to restore on revisit. */
  initialReadiness?: PrdReadiness | null;
}) {
  const init = props.initialReadiness ?? null;
  // Step 2 only unlocks after Step 1, so a persisted subsystem result implies
  // Step 1 was completed too.
  const [qualityDone, setQualityDone] = useState(
    Boolean(init?.qualityDone || init?.subsystemDone),
  );
  const [subsystemDone, setSubsystemDone] = useState(Boolean(init?.subsystemDone));

  return (
    <div className="flex flex-col gap-5">
      {/* Step 1 — Validate */}
      <section>
        <StepHeader n={1} title="Validate PRD" state={qualityDone ? "done" : "active"} />
        <p className="text-[11px] text-slate-500 mt-1 mb-2">
          Check flows, pages and downstream buildability; fix blockers first.
        </p>
        <PrdQualityReportPanel
          prd={props.prd}
          spec={props.spec ?? null}
          projectSlug={props.projectSlug}
          initialReport={(init?.qualityResult as never) ?? null}
          onDirectFix={props.onDirectFix}
          onResult={() => {
            // The quality panel persists qualityDone + the full report itself.
            setQualityDone(true);
            props.onQualityResult?.();
          }}
        />
      </section>

      <div className="border-t border-slate-200" />

      {/* Step 2 — Split Subsystems */}
      <section>
        <StepHeader
          n={2}
          title="Split Subsystems"
          state={subsystemDone ? "done" : qualityDone ? "active" : "locked"}
        />
        {qualityDone ? (
          <>
            <p className="text-[11px] text-slate-500 mt-1 mb-2">
              Split into business-domain subsystems (foundation first, then layered build).
            </p>
            <PrdSubsystemPanel
              prd={props.prd}
              projectSlug={props.projectSlug}
              initialResult={(init?.subsystemResult as never) ?? null}
              onResult={() => {
                setSubsystemDone(true);
                props.onSubsystemResult?.();
              }}
            />
          </>
        ) : (
          <p className="text-[11px] text-slate-400 mt-1">
            Complete Step 1 (Validate PRD) first to unlock subsystem splitting.
          </p>
        )}
      </section>
    </div>
  );
}
