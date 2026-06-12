"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FirstLoginAccount {
  email: string;
  password: string;
  role?: string;
  source: "rbac" | "demo";
}

interface FirstLoginInfo {
  autoSeed: boolean;
  steps: string[];
  accounts: FirstLoginAccount[];
}

interface Props {
  codeOutputDir: string;
}

/**
 * Getting-started panel shown above the live preview: the run checklist plus
 * the seeded login accounts (with copy buttons), parsed from the generated
 * app's backend seed scripts. Lets a user follow along instead of hitting a
 * silent "Invalid email or password" because the credentials were never shown.
 */
export default function FirstLoginPanel({ codeOutputDir }: Props) {
  const [info, setInfo] = useState<FirstLoginInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/agents/first-login?codeOutputDir=${encodeURIComponent(codeOutputDir)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.error) setError(data.error);
        else setInfo(data as FirstLoginInfo);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [codeOutputDir]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  if (error || !info) return null;

  return (
    <div className="border-b border-zinc-200 bg-zinc-50/80 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left font-medium text-zinc-700 hover:bg-zinc-100"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0" />
        ) : (
          <ChevronRight className="size-4 shrink-0" />
        )}
        <KeyRound className="size-4 shrink-0 text-amber-600" />
        <span>Getting started — run checklist &amp; login credentials</span>
        {info.autoSeed ? (
          <Badge variant="success">auto-seeds on boot</Badge>
        ) : (
          <Badge variant="warning">manual seed required</Badge>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {info.accounts.length} account{info.accounts.length === 1 ? "" : "s"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4 pt-1">
          <ol className="ml-5 list-decimal space-y-1 text-zinc-600">
            {info.steps.map((s, i) => (
              <li key={i} className="[&_code]:rounded [&_code]:bg-zinc-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]">
                {renderInlineCode(s)}
              </li>
            ))}
          </ol>

          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-500">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Email</th>
                  <th className="px-3 py-1.5 font-medium">Password</th>
                  <th className="px-3 py-1.5 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {info.accounts.map((a) => (
                  <tr key={a.email} className="border-t border-zinc-100">
                    <td className="px-3 py-1.5">
                      <CopyCell
                        value={a.email}
                        copied={copied === `e:${a.email}`}
                        onCopy={() => copy(a.email, `e:${a.email}`)}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <CopyCell
                        value={a.password}
                        mono
                        copied={copied === `p:${a.email}`}
                        onCopy={() => copy(a.password, `p:${a.email}`)}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge variant={a.source === "rbac" ? "muted" : "secondary"}>
                        {a.role ?? a.source}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyCell({
  value,
  mono,
  copied,
  onCopy,
}: {
  value: string;
  mono?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy"
      className="group inline-flex items-center gap-1.5 text-zinc-700 hover:text-zinc-900"
    >
      <span className={mono ? "font-mono" : undefined}>{value}</span>
      {copied ? (
        <Check className="size-3 text-emerald-600" />
      ) : (
        <Copy className="size-3 text-zinc-300 group-hover:text-zinc-500" />
      )}
    </button>
  );
}

/** Render `code` spans in a step string as <code> elements. */
function renderInlineCode(text: string) {
  const parts = text.split(/`([^`]+)`/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>,
  );
}
