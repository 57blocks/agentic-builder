"use client";

import BugFixPanel from "@/components/BugFixPanel";
import type { StepUIProps } from "../../../_shared/types";

export function BugFixUI({ onNavigate }: StepUIProps) {
  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <BugFixPanel onNavigate={onNavigate} />
    </div>
  );
}
