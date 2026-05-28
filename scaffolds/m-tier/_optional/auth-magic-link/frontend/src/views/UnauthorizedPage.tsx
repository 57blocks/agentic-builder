/**
 * 403 placeholder rendered by `<ProtectedRoute>` when the current user
 * doesn't satisfy a `role` / `requiredDomainRole` gate.
 *
 * Wire as the `/unauthorized` route in `router.tsx`:
 *
 *   <Route path="/unauthorized" element={<UnauthorizedPage />} />
 *
 * The codegen worker is expected to restyle this page to match the
 * project's design system — keep tailwind-only, no extra CSS files.
 */

import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function UnauthorizedPage() {
  const { sessionRole, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900/60 p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-white">Access denied</h1>
        <p className="mt-3 text-sm text-neutral-400">
          {sessionRole
            ? `Your account (persona: ${sessionRole}) doesn't have permission to view this page.`
            : "You don't have permission to view this page."}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/"
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-white"
          >
            Back to home
          </Link>
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="rounded-md border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-800/60"
          >
            Switch account
          </button>
        </div>
      </div>
    </div>
  );
}
