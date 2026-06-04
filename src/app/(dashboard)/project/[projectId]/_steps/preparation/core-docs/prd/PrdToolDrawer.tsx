"use client";

import React from "react";
import { X } from "lucide-react";

/**
 * Right-side slide-in drawer for PRD-step tools (quality check, subsystem
 * decomposition). Fixed to the viewport so it escapes the PRD step's
 * overflow-hidden layout; body scrolls independently.
 */
export function PrdToolDrawer(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  /** Drawer width (Tailwind class), defaults to ~560px. */
  widthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* backdrop */}
      <div
        onClick={props.onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          props.open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-full ${props.widthClass ?? "w-[560px] max-w-[92vw]"} flex-col bg-white shadow-2xl transition-transform duration-200 ease-out ${
          props.open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        role="dialog"
        aria-hidden={!props.open}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
            {props.icon}
            {props.title}
          </div>
          <button
            onClick={props.onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {/* Children stay mounted while closed (drawer is just translated
            off-screen) so in-progress results / step state survive open/close. */}
        <div className="flex-1 overflow-y-auto p-4">{props.children}</div>
      </aside>
    </>
  );
}
