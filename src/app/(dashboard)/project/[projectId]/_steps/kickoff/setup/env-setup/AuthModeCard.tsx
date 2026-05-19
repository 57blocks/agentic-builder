/**
 * AuthModeCard — Phase 0 of the env-setup Wizard.
 *
 * Shows the architect's recommended auth mode (3 modes only in v1),
 * lets the user override, and persists the choice to
 * `.blueprint/auth-decision.json` via the `/api/agents/pipeline/auth-decision`
 * route. Downstream phases (infra / vendor / deploy) react to the chosen
 * mode by surfacing the right env keys (e.g. SMTP_* for magic-link).
 *
 * Stateless w.r.t. the parent: the parent owns the AuthDecision via
 * props + onChange. Loading + saving happens here so the parent stays
 * focused on the multi-phase form orchestration.
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Mail,
  Sparkles,
  Loader2,
  ChevronDown,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  type AuthDecision,
  type AuthMode,
} from "@/lib/agents/architect/auth-decision-types";

interface AuthModeCardProps {
  /** Current decision. May be null when the page first mounts; the card
   *  fetches a default-if-missing on its own. */
  decision: AuthDecision | null;
  /** Called whenever the user picks a different mode OR the decision has
   *  just been hydrated from the server. Parent should store it. */
  onChange: (decision: AuthDecision) => void;
  /** Project documents (PRD/TRD) to send when running the decider. The
   *  card auto-runs the decider when no decision exists yet. */
  prd: string;
  trd?: string;
  /** Next-button handler — proceeds to infrastructure phase. */
  onNext: () => void;
}

type ModeOption = {
  mode: AuthMode;
  label: string;
  description: string;
  envBadge?: string;
  icon: React.ReactNode;
};

const MODE_OPTIONS: readonly ModeOption[] = [
  {
    mode: "password-rbac",
    label: "Username + Password + RBAC",
    description:
      "Local email/password login. Seeds 3 default accounts (admin / operator / viewer). Zero external dependency — works offline, ideal for demos and internal tools.",
    icon: <ShieldCheck size={16} className="text-emerald-600" />,
  },
  {
    mode: "magic-link",
    label: "Magic Link (passwordless)",
    description:
      "Email a one-time login link. Modern UX, no password to remember. Requires SMTP credentials.",
    envBadge: "needs SMTP_*",
    icon: <Mail size={16} className="text-sky-600" />,
  },
  {
    mode: "privy",
    label: "Privy (Google / Email / Wallet)",
    description:
      "Privy hosted OAuth with multi-provider picker. Best for consumer apps with Web3 or multiple social providers. Requires a Privy app.",
    envBadge: "needs PRIVY_APP_ID",
    icon: <Sparkles size={16} className="text-violet-600" />,
  },
] as const;

const PRIMARY_PURPLE = "#712ae2";

export function AuthModeCard({
  decision,
  onChange,
  prd,
  trd,
  onNext,
}: AuthModeCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-hydrate: when no decision exists, GET it; if still empty, POST to
  // run the decider against PRD content.
  useEffect(() => {
    if (decision) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const cached = await fetchExistingDecision();
        if (cancelled) return;
        if (cached) {
          onChange(cached);
          return;
        }
        if (!prd.trim()) {
          setLoading(false);
          return;
        }
        const fresh = await runDecider(prd, trd);
        if (cancelled) return;
        if (fresh) onChange(fresh);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load auth decision");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally only hydrate once on mount when decision is null.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePick = async (next: AuthMode) => {
    if (!decision || decision.mode === next) return;
    setError(null);
    const optimistic: AuthDecision = {
      ...decision,
      mode: next,
      scaffold:
        next === "password-rbac"
          ? "auth-password-rbac"
          : next === "magic-link"
            ? "auth-magic-link"
            : "auth-privy",
      requiredEnvKeys:
        next === "password-rbac"
          ? []
          : next === "magic-link"
            ? ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]
            : ["PRIVY_APP_ID", "PRIVY_APP_SECRET", "VITE_PRIVY_APP_ID"],
      userOverridden: true,
      updatedAt: new Date().toISOString(),
    };
    onChange(optimistic);
    try {
      const saved = await persistOverride(optimistic);
      onChange(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save selection");
    }
  };

  const handleRerun = async () => {
    if (!prd.trim()) {
      setError("PRD content missing — cannot ask the architect.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fresh = await runDecider(prd, trd);
      if (fresh) onChange(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decider failed");
    } finally {
      setLoading(false);
    }
  };

  const activeMode = decision?.mode ?? "password-rbac";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} style={{ color: PRIMARY_PURPLE }} />
          <h2 className="text-[16px] font-semibold text-slate-900">
            Authentication strategy
          </h2>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Pick how users sign in. The recommendation is derived from your PRD; you
          can override it before kick-off.
        </p>
      </div>

      <div className="px-6 py-5">
        {/* Architect recommendation banner */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-5 flex items-start gap-3">
          <Info size={14} className="text-slate-500 mt-[2px] shrink-0" />
          <div className="flex-1 text-[12.5px] leading-relaxed text-slate-700">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Loader2 size={12} className="animate-spin" /> Asking the architect…
              </span>
            ) : decision ? (
              <>
                <span className="font-medium text-slate-900">Architect suggests: </span>
                <code className="text-[11.5px] bg-white border border-slate-200 rounded px-1.5 py-[1px]">
                  {decision.mode}
                </code>
                <ConfidencePill confidence={decision.confidence} />
                <div className="mt-1 text-slate-600">{decision.rationale}</div>
              </>
            ) : (
              <span className="text-slate-500">
                No recommendation yet. Click "Ask architect" to generate one.
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleRerun()}
            disabled={loading || !prd.trim()}
            className="text-[11.5px]"
          >
            {loading ? "…" : "Re-ask"}
          </Button>
        </div>

        {/* Mode picker */}
        <div className="flex flex-col gap-3">
          {MODE_OPTIONS.map((opt) => (
            <ModeRow
              key={opt.mode}
              option={opt}
              active={activeMode === opt.mode}
              recommended={decision?.mode === opt.mode && !decision.userOverridden}
              disabled={loading}
              onSelect={() => void handlePick(opt.mode)}
            />
          ))}
        </div>

        {/* Advanced: seed accounts preview */}
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="mt-5 flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-900"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
          Advanced — default seed accounts
        </button>

        {showAdvanced && decision && (
          <SeedAccountsTable decision={decision} />
        )}

        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mt-4">
            {error}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button
            onClick={onNext}
            disabled={!decision || loading}
          >
            Next: infrastructure →
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────

function ConfidencePill({ confidence }: { confidence: AuthDecision["confidence"] }) {
  const cls =
    confidence === "high"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : confidence === "medium"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`ml-2 inline-block text-[10px] font-medium px-1.5 py-[1px] border rounded-full ${cls}`}
    >
      confidence: {confidence}
    </span>
  );
}

function ModeRow({
  option,
  active,
  recommended,
  disabled,
  onSelect,
}: {
  option: ModeOption;
  active: boolean;
  recommended: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-colors ${
        active
          ? "border-[#712ae2] bg-[rgba(113,42,226,0.05)]"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <span
        className={`mt-1 size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
          active ? "border-[#712ae2]" : "border-slate-300"
        }`}
      >
        {active && <span className="size-2 rounded-full bg-[#712ae2]" />}
      </span>
      <span className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {option.icon}
          <span className="text-[13px] font-medium text-slate-900">{option.label}</span>
          {recommended && (
            <span className="text-[10px] uppercase tracking-wide font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-[1px] rounded-full">
              Architect's pick
            </span>
          )}
          {option.envBadge && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-[1px] rounded">
              {option.envBadge}
            </span>
          )}
        </div>
        <div className="text-[12px] text-slate-600 mt-1 leading-relaxed">
          {option.description}
        </div>
      </span>
    </button>
  );
}

function SeedAccountsTable({ decision }: { decision: AuthDecision }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11.5px] text-slate-600">
        These accounts are inserted on first run. Change the passwords in
        production — they are intentionally weak for demo / E2E convenience.
        {decision.mode !== "password-rbac" && (
          <span className="block mt-1 text-slate-500">
            (For <code className="font-mono">{decision.mode}</code>, the email + role
            are used to pre-assign permissions on first sign-in; passwords are
            ignored.)
          </span>
        )}
      </div>
      <table className="w-full text-[12px]">
        <thead className="bg-white border-b border-slate-100 text-slate-500 text-[11px]">
          <tr>
            <th className="text-left px-3 py-1.5 font-medium">Email</th>
            <th className="text-left px-3 py-1.5 font-medium">Role</th>
            {decision.mode === "password-rbac" && (
              <th className="text-left px-3 py-1.5 font-medium">Password (fixed)</th>
            )}
          </tr>
        </thead>
        <tbody>
          {decision.seedAccounts.map((acc) => (
            <tr key={acc.email} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-1.5 font-mono text-slate-800">{acc.email}</td>
              <td className="px-3 py-1.5">
                <span className="text-[11px] font-medium px-1.5 py-[1px] rounded bg-slate-100 text-slate-700">
                  {acc.role}
                </span>
              </td>
              {decision.mode === "password-rbac" && (
                <td className="px-3 py-1.5 font-mono text-slate-700">
                  {acc.password ?? "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── API helpers ───────────────────────────────────────────────────────

async function fetchExistingDecision(): Promise<AuthDecision | null> {
  const res = await fetch("/api/agents/pipeline/auth-decision", { method: "GET" });
  if (!res.ok) return null;
  const body = (await res.json()) as { decision: AuthDecision | null };
  return body.decision;
}

async function runDecider(prd: string, trd?: string): Promise<AuthDecision | null> {
  const res = await fetch("/api/agents/pipeline/auth-decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prd, trd }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Decider HTTP ${res.status}`);
  }
  const body = (await res.json()) as { decision: AuthDecision };
  return body.decision;
}

async function persistOverride(decision: AuthDecision): Promise<AuthDecision> {
  const res = await fetch("/api/agents/pipeline/auth-decision", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Save HTTP ${res.status}`);
  }
  const body = (await res.json()) as { decision: AuthDecision };
  return body.decision;
}
