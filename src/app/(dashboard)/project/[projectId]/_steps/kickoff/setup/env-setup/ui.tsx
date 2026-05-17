"use client";
import { useMemo, useState } from "react";
import {
  Rocket,
  Loader2,
  ExternalLink,
  Key,
  Server,
  Sparkles,
  Wrench,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStepStore } from "@/store/step-store";
import {
  ENV_KEY_CATALOG,
  getEnvKeyMeta,
  type EnvKeyMeta,
} from "@/lib/agents/setup/env-key-catalog";
import { parseEnvKeysFromTrd } from "@/lib/agents/setup/parse-trd-env";
import type { StepUIProps } from "../../../_shared/types";

type KeyState = "provided" | "skipped" | "auto" | "deferred";

interface FieldState {
  value: string;
  state: KeyState;
}

type Phase = "infra" | "vendor" | "deploy" | "running";

export function EnvSetupUI({ onNavigate }: StepUIProps) {
  const featureBrief = useStepStore((s) => s.featureBrief);
  const codeOutputDir = useStepStore((s) => s.codeOutputDir);
  const steps = useStepStore((s) => s.steps);
  const setStepResult = useStepStore((s) => s.setStepResult);
  const setStepFailed = useStepStore((s) => s.setStepFailed);

  // ── Discover which keys are needed for THIS project ─────────────────
  const trdContent = steps.trd?.content ?? "";
  const detectedKeys = useMemo(() => parseEnvKeysFromTrd(trdContent), [trdContent]);
  const projectName = useMemo(
    () => extractProjectName(steps.prd?.content ?? ""),
    [steps.prd?.content],
  );

  // Merge detected keys with the catalog. If detection turns up nothing
  // (e.g. TRD §12 was elided), fall back to "any vendor/auth/deploy entry in
  // catalog" so the Wizard is still useful.
  const wizardKeys = useMemo<EnvKeyMeta[]>(() => {
    if (detectedKeys.length > 0) {
      return detectedKeys
        .map((k) => getEnvKeyMeta(k))
        .filter((m) => m.category !== "infrastructure"); // infra handled in Phase 1
    }
    return ENV_KEY_CATALOG.filter((e) => e.category !== "infrastructure");
  }, [detectedKeys]);

  // ── Form state ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("infra");
  const [infraChoice, setInfraChoice] = useState<"bundled" | "byo">("bundled");
  const [byoDb, setByoDb] = useState("");
  const [byoRedis, setByoRedis] = useState("");

  // Per-key form values, keyed by env var name.
  const [fields, setFields] = useState<Record<string, FieldState>>(() => {
    const init: Record<string, FieldState> = {};
    for (const meta of ENV_KEY_CATALOG) {
      if (meta.autoGenerate) {
        init[meta.key] = { value: meta.autoGenerate(), state: "auto" };
      } else {
        init[meta.key] = { value: meta.defaultValue ?? "", state: "skipped" };
      }
    }
    return init;
  });

  const setField = (key: string, patch: Partial<FieldState>) =>
    setFields((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { value: "", state: "skipped" }), ...patch },
    }));

  const vendorKeys = wizardKeys.filter((k) => k.category === "vendor" || k.category === "auth");
  const deployKeys = wizardKeys.filter((k) => k.category === "deploy");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Save + Kickoff ──────────────────────────────────────────────────
  const handleSaveAndKickoff = async () => {
    setSubmitting(true);
    setSubmitError(null);

    // Build envValues payload.
    const envValues: Record<string, FieldState> = { ...fields };

    // Infrastructure → DATABASE_URL / REDIS_URL
    if (infraChoice === "bundled") {
      envValues.DATABASE_URL = {
        value: "postgresql://app:app@postgres:5432/app",
        state: "provided",
      };
      envValues.REDIS_URL = {
        value: "redis://redis:6379",
        state: "provided",
      };
    } else {
      envValues.DATABASE_URL = {
        value: byoDb.trim(),
        state: byoDb.trim() ? "provided" : "skipped",
      };
      envValues.REDIS_URL = {
        value: byoRedis.trim(),
        state: byoRedis.trim() ? "provided" : "skipped",
      };
    }

    // Filter: only POST keys the Wizard actually surfaced + DATABASE/REDIS.
    const relevantKeys = new Set<string>([
      "DATABASE_URL",
      "REDIS_URL",
      ...wizardKeys.map((k) => k.key),
      "AUTH_JWT_SECRET", // always include auto-secret if present
    ]);
    const filtered: Record<string, FieldState> = {};
    for (const [k, v] of Object.entries(envValues)) {
      if (!relevantKeys.has(k)) continue;
      // If user left a non-auto field empty and didn't deliberately skip, mark skipped.
      if (v.state === "provided" && !v.value.trim()) {
        filtered[k] = { value: "", state: "skipped" };
      } else {
        filtered[k] = v;
      }
    }

    try {
      const res = await fetch("/api/agents/save-env-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeOutputDir,
          projectName,
          infraChoice,
          envValues: filtered,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Save failed (HTTP ${res.status})`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Save failed");
      setSubmitting(false);
      return;
    }

    // Now run the existing Kickoff flow (preserved verbatim from old UI).
    setPhase("running");
    try {
      const resp = await fetch("/api/agents/kickoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureBrief,
          codeOutputDir,
          prd: steps.prd?.content ?? "",
          trd: steps.trd?.content ?? "",
          sysdesign: steps.sysdesign?.content ?? "",
          implguide: steps.implguide?.content ?? "",
          design: steps.design?.content ?? "",
          pencil: steps.pencil?.content ?? "",
          sessionId: useStepStore.getState().kickoffSessionId ?? "",
        }),
      });
      if (!resp.ok) throw new Error("Kickoff request failed");

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let kickoffContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "step_stream") {
              kickoffContent += event.data?.chunk ?? "";
            } else if (event.type === "step_complete") {
              kickoffContent = event.data?.content ?? kickoffContent;
            } else if (event.type === "done") {
              const kickoffMeta = event.run?.steps?.kickoff;
              const costUsd = kickoffMeta?.costUsd ?? 0;
              const durationMs = kickoffMeta?.durationMs ?? 0;
              const metadata = kickoffMeta?.metadata ?? {};
              const now = new Date().toISOString();
              setStepResult("env-setup", {
                stepId: "env-setup",
                status: "completed",
                content: kickoffContent,
                costUsd,
                durationMs,
                metadata,
                timestamp: now,
              });
              setStepResult("task-breakdown", {
                stepId: "task-breakdown",
                status: "completed",
                content: kickoffContent,
                costUsd: 0,
                durationMs: 0,
                metadata,
                timestamp: now,
              });
              onNavigate("task-breakdown");
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setStepFailed("env-setup", err instanceof Error ? err.message : "Kickoff failed");
      setPhase("deploy"); // back to last form phase
      setSubmitting(false);
    }
  };

  // ── Renders per-phase ───────────────────────────────────────────────
  if (phase === "running") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5">
          <Rocket className="size-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">Running kick-off</h1>
        <p className="text-[15px] text-[#64748b] mb-6">
          Generated <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[13px]">.env</code> and{" "}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[13px]">SETUP.md</code>. Now scaffolding the project…
        </p>
        <Loader2 className="size-6 animate-spin text-[#712ae2]" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto px-8 py-8">
      <div className="max-w-3xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-linear-to-br from-[#712ae2] to-[#5a1fc4] flex items-center justify-center">
            <Wrench size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#0b1c30] leading-tight">Setup Wizard</h1>
            <p className="text-[13px] text-[#64748b]">
              Configure infrastructure + credentials before kick-off
            </p>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex items-center gap-2 mt-6 mb-8 text-[12px]">
          <PhaseChip active={phase === "infra"} done={phase !== "infra"} label="1. Infrastructure" />
          <ChevronArrow />
          <PhaseChip
            active={phase === "vendor"}
            done={phase === "deploy"}
            label="2. Vendor credentials"
          />
          <ChevronArrow />
          <PhaseChip active={phase === "deploy"} done={false} label="3. Deploy (optional)" />
        </div>

        {/* Phase 1: Infrastructure */}
        {phase === "infra" && (
          <PhaseCard
            icon={<Server size={16} className="text-[#712ae2]" />}
            title="How do you want PostgreSQL + Redis?"
            subtitle="Both are required for the app to run. The bundled option uses the docker-compose.yml that's generated alongside the project."
          >
            <div className="flex flex-col gap-3">
              <RadioOption
                checked={infraChoice === "bundled"}
                onSelect={() => setInfraChoice("bundled")}
                title="Bundled — use the generated docker-compose"
                description="docker-compose.yml brings up PostgreSQL 16 + TimescaleDB extension + Redis 7 on default ports. Recommended for local dev."
              />
              <RadioOption
                checked={infraChoice === "byo"}
                onSelect={() => setInfraChoice("byo")}
                title="Bring your own — point to existing instances"
                description="You'll supply DATABASE_URL and REDIS_URL. Make sure the Postgres has TimescaleDB extension enabled."
              />
              {infraChoice === "byo" && (
                <div className="flex flex-col gap-3 mt-3 pl-7">
                  <LabeledInput
                    label="DATABASE_URL"
                    placeholder="postgresql://user:pass@host:5432/dbname"
                    value={byoDb}
                    onChange={setByoDb}
                    type="text"
                  />
                  <LabeledInput
                    label="REDIS_URL"
                    placeholder="redis://localhost:6379"
                    value={byoRedis}
                    onChange={setByoRedis}
                    type="text"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => setPhase("vendor")}>
                Next: vendor keys
              </Button>
            </div>
          </PhaseCard>
        )}

        {/* Phase 2: Vendor + Auth keys */}
        {phase === "vendor" && (
          <PhaseCard
            icon={<Key size={16} className="text-[#712ae2]" />}
            title={`${vendorKeys.length} vendor / auth credentials`}
            subtitle="Fill in what you have. Skip the rest — the backend boots regardless; affected data feeds get marked stale until you add the key later in .env."
          >
            <div className="flex flex-col gap-5">
              {vendorKeys.map((meta) => (
                <KeyRow
                  key={meta.key}
                  meta={meta}
                  field={fields[meta.key] ?? { value: "", state: "skipped" }}
                  onChange={(patch) => setField(meta.key, patch)}
                />
              ))}
              {vendorKeys.length === 0 && (
                <p className="text-[13px] text-slate-500">
                  No vendor keys detected in the TRD — your project probably doesn't need any.
                </p>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setPhase("infra")}>← Back</Button>
              <Button onClick={() => setPhase("deploy")}>Next: deploy (optional)</Button>
            </div>
          </PhaseCard>
        )}

        {/* Phase 3: Deploy keys + finalize */}
        {phase === "deploy" && (
          <PhaseCard
            icon={<Rocket size={16} className="text-[#712ae2]" />}
            title="Deploy credentials (optional)"
            subtitle="Only needed when you run deploy.sh. Safe to skip now — fill them in .env later."
          >
            <div className="flex flex-col gap-5">
              {deployKeys.map((meta) => (
                <KeyRow
                  key={meta.key}
                  meta={meta}
                  field={fields[meta.key] ?? { value: "", state: "skipped" }}
                  onChange={(patch) => setField(meta.key, patch)}
                />
              ))}
              {deployKeys.length === 0 && (
                <p className="text-[13px] text-slate-500">No deploy-specific keys detected.</p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mt-6 text-[12px] text-slate-600">
              <div className="font-semibold text-slate-900 mb-1">On save we'll write:</div>
              <ul className="space-y-0.5">
                <li>• <code className="bg-white px-1 py-0.5 rounded">{codeOutputDir}/.env</code> — actual values (skipped keys commented out)</li>
                <li>• <code className="bg-white px-1 py-0.5 rounded">{codeOutputDir}/SETUP.md</code> — companion doc explaining each key, where to obtain it, and what skipping means</li>
              </ul>
            </div>

            {submitError && (
              <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mt-3">
                {submitError}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setPhase("vendor")} disabled={submitting}>
                ← Back
              </Button>
              <Button
                onClick={() => void handleSaveAndKickoff()}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {submitting ? <Loader2 size={14} className="animate-spin mr-2" /> : <Rocket size={14} className="mr-2" />}
                {submitting ? "Saving…" : "Save & Run Kick-off"}
              </Button>
            </div>
          </PhaseCard>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function PhaseCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h2 className="text-[16px] font-semibold text-slate-900">{title}</h2>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed">{subtitle}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function PhaseChip({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={[
        "px-2.5 py-1 rounded-full font-medium flex items-center gap-1",
        active ? "bg-[#712ae2] text-white" : done ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {done && <Check size={11} />}
      {label}
    </span>
  );
}

function ChevronArrow() {
  return <span className="text-slate-300">→</span>;
}

function RadioOption({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-colors ${
        checked
          ? "border-[#712ae2] bg-[rgba(113,42,226,0.04)]"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className={`mt-0.5 size-4 rounded-full border-2 flex items-center justify-center ${checked ? "border-[#712ae2]" : "border-slate-300"}`}>
        {checked && <span className="size-2 rounded-full bg-[#712ae2]" />}
      </span>
      <span className="flex-1">
        <div className="text-[13px] font-medium text-slate-900">{title}</div>
        <div className="text-[12px] text-slate-600 mt-0.5">{description}</div>
      </span>
    </button>
  );
}

function LabeledInput({
  label,
  placeholder,
  value,
  onChange,
  type,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type: "text" | "password" | "url" | "email";
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-mono font-semibold text-slate-700">{label}</span>
      <input
        type={type === "password" ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 px-3 rounded-md border border-slate-200 bg-white text-[13px] focus:outline-none focus:border-[#712ae2] focus:ring-1 focus:ring-[#712ae2]"
      />
    </label>
  );
}

function KeyRow({
  meta,
  field,
  onChange,
}: {
  meta: EnvKeyMeta;
  field: FieldState;
  onChange: (patch: Partial<FieldState>) => void;
}) {
  const isSkipped = field.state === "skipped";
  const isAuto = field.state === "auto";

  return (
    <div className={`rounded-lg border px-4 py-3 ${isSkipped ? "border-slate-200 bg-slate-50" : "border-[#712ae2]/30 bg-[rgba(113,42,226,0.03)]"}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-[12px] font-semibold text-slate-900">{meta.key}</code>
            {isAuto && (
              <span className="text-[10px] uppercase tracking-wide font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-[1px] rounded-full">
                <Sparkles size={9} className="inline mr-0.5" /> Auto-generated
              </span>
            )}
            {meta.freeTierOk && !isAuto && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-[1px] rounded">
                Free tier OK
              </span>
            )}
          </div>
          <div className="text-[12px] text-slate-600 mt-0.5">{meta.feature}</div>
          {meta.signupUrl && !isAuto && (
            <a
              href={meta.signupUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#712ae2] hover:underline mt-0.5"
            >
              <ExternalLink size={10} /> Get key: {prettyUrl(meta.signupUrl)}
            </a>
          )}
        </div>
        {!isAuto && (
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 shrink-0">
            <input
              type="checkbox"
              checked={isSkipped}
              onChange={(e) => onChange({ state: e.target.checked ? "skipped" : "provided" })}
            />
            Skip
          </label>
        )}
      </div>

      {!isSkipped && (
        <input
          type={meta.inputType === "password" ? "password" : "text"}
          value={field.value}
          readOnly={isAuto}
          placeholder={meta.defaultValue ? `e.g. ${meta.defaultValue}` : "Paste value…"}
          onChange={(e) => onChange({ value: e.target.value, state: "provided" })}
          className={`w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-[13px] font-mono focus:outline-none focus:border-[#712ae2] focus:ring-1 focus:ring-[#712ae2] ${
            isAuto ? "text-slate-500" : ""
          }`}
        />
      )}

      {isSkipped && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
          ⚠ If left empty: {meta.skipBehavior}
        </div>
      )}
    </div>
  );
}

function prettyUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function extractProjectName(prd: string): string {
  const m = prd.match(/^#\s+PRD[:\s]+([^\n]+)/m);
  return m ? m[1].trim() : "Generated project";
}
