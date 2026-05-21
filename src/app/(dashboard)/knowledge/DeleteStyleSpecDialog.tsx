"use client";

import { motion } from "motion/react";

import type { KnowledgeRecordFull } from "@/app/api/memory/knowledge/records/route";

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export function DeleteStyleSpecDialog({
  record,
  deleting,
  onCancel,
  onConfirm,
}: {
  record: KnowledgeRecordFull;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const label = record.imageName ?? record.title;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
      onClick={deleting ? undefined : onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex gap-4 px-8 py-7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <TrashIcon />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-950">Delete this style spec?</h2>
            <p className="mt-6 text-base leading-7 text-slate-600">
              <span className="font-semibold text-slate-950">{label}</span>{" "}
              and its generated design knowledge record will be permanently removed.
            </p>
            <p className="mt-4 text-base text-slate-500">This cannot be undone.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-5 border-t border-slate-100 bg-slate-50 px-8 py-5">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="rounded-xl px-5 py-3 text-base font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="inline-flex min-w-[150px] items-center justify-center rounded-xl bg-rose-600 px-6 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deleting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              "Delete style spec"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
