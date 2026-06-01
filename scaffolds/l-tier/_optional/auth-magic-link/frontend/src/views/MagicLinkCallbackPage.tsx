/**
 * MagicLinkCallbackPage — receives `?token=...` after the user clicks the
 * email link, verifies it via the backend, stores the resulting JWT, and
 * redirects to `/`.
 *
 * Mount at `/auth/magic/callback` in `router.tsx`. The backend hard-codes
 * that path when constructing the link URL.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

type Status = "verifying" | "success" | "error";

export default function MagicLinkCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const consume = useAuthStore((s) => s.consumeToken);

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("Missing token in URL.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await consume(token);
        if (cancelled) return;
        setStatus("success");
        setTimeout(() => navigate("/", { replace: true }), 400);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Verification failed.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, consume, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur p-7 text-center shadow-xl">
        {status === "verifying" && (
          <>
            <div className="size-10 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <h1 className="text-lg font-semibold text-slate-100 mb-1">
              Signing you in…
            </h1>
            <p className="text-[13px] text-slate-400">
              Verifying your magic link.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="text-lg font-semibold text-emerald-400 mb-1">
              Signed in
            </h1>
            <p className="text-[13px] text-slate-400">Redirecting…</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-lg font-semibold text-red-300 mb-2">
              Sign-in failed
            </h1>
            <p className="text-[13px] text-slate-400 mb-4">{errorMsg}</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="h-9 px-4 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[13px]"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
