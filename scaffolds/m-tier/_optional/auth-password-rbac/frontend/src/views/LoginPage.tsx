/**
 * LoginPage — password-rbac variant.
 *
 * Overwrites the base scaffold's LoginPage. Submits to `POST /api/v1/auth/login`
 * via the auth-store, then redirects to `/` on success.
 *
 * Default seed accounts (shown inline as demo affordances):
 *   - admin@example.com    / Admin@2026
 *   - operator@example.com / Operator@2026
 *   - viewer@example.com   / Viewer@2026
 *
 * Workers may restyle freely but MUST keep the call to
 * `useAuthStore.login(email, password)` — that's the contract between this
 * page and the rest of the scaffold.
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

interface DemoCredential {
  email: string;
  password: string;
  role: string;
}

const DEMO_ACCOUNTS: DemoCredential[] = [
  { email: "admin@example.com", password: "Admin@2026", role: "admin" },
  { email: "operator@example.com", password: "Operator@2026", role: "operator" },
  { email: "viewer@example.com", password: "Viewer@2026", role: "viewer" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      /* error surfaced via store */
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur p-7 shadow-xl">
          <h1 className="text-xl font-semibold text-slate-100 mb-1">
            Sign in
          </h1>
          <p className="text-[13px] text-slate-400 mb-6">
            Use one of the seed accounts below for the demo.
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
                placeholder="admin@example.com"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide font-medium text-slate-500">
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-[14px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                placeholder="••••••••"
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500 mb-2">
              Demo accounts
            </div>
            <div className="flex flex-col gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                  }}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-600 text-[12px] text-left transition-colors"
                >
                  <div>
                    <div className="font-mono text-slate-200">{acc.email}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {acc.password}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-[1px] rounded bg-slate-800 text-slate-400">
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
