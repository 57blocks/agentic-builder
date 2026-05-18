/**
 * LoginPage — magic-link variant.
 *
 * Submits to `POST /api/v1/auth/magic` and shows a "check your email"
 * confirmation. The actual login happens on `MagicLinkCallbackPage`
 * when the user clicks the link from their inbox.
 *
 * In dev mode (no SMTP_HOST), the backend logs the link to stdout —
 * see `backend/src/services/emailService.ts`.
 */

import { useState, type FormEvent } from "react";
import { useAuthStore } from "../store/auth-store";

export default function LoginPage() {
  const requestLink = useAuthStore((s) => s.requestLink);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await requestLink(email);
      setSentTo(email);
    } catch {
      /* error surfaced via store */
    }
  };

  if (sentTo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur p-7 shadow-xl">
          <h1 className="text-xl font-semibold text-slate-100 mb-2">
            Check your email
          </h1>
          <p className="text-[13px] text-slate-400 leading-relaxed">
            We sent a sign-in link to <strong className="text-slate-200">{sentTo}</strong>.
            It expires in 15 minutes.
          </p>
          <p className="mt-3 text-[12px] text-slate-500">
            Dev tip: if SMTP is not configured, the link is printed to the
            backend console — copy it from there.
          </p>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setEmail("");
            }}
            className="mt-5 text-[12px] text-emerald-400 hover:text-emerald-300"
          >
            Send to a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur p-7 shadow-xl">
          <h1 className="text-xl font-semibold text-slate-100 mb-1">Sign in</h1>
          <p className="text-[13px] text-slate-400 mb-6">
            We'll email you a one-time sign-in link.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide font-medium text-slate-500">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-[14px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                placeholder="you@example.com"
              />
            </label>

            {error && (
              <div className="text-[12px] text-red-300 bg-red-950/40 border border-red-900 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-[14px] font-semibold transition-colors"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500 mb-2">
              Pre-assigned roles
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              <code className="font-mono text-slate-300">admin@example.com</code> →
              admin role.{" "}
              <code className="font-mono text-slate-300">operator@example.com</code>{" "}
              → operator. Any other email → viewer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
