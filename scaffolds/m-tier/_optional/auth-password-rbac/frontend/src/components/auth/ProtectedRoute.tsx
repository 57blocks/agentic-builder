/**
 * Route guard for the password-rbac scaffold.
 *
 * Usage in `router.tsx`:
 *
 *   <Route
 *     path="/admin/*"
 *     element={
 *       <ProtectedRoute role="admin">
 *         <AdminLayout />
 *       </ProtectedRoute>
 *     }
 *   />
 *
 * Behavior:
 *   - No token in store     → redirect to `/login`
 *   - Has token but no user → call refresh(); show null while loading
 *   - `role` prop set + user role mismatch → redirect to `/` (or render
 *     a 403 child if provided as `fallback`)
 */

import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import type { AuthRole } from "../../api/auth-client";

interface ProtectedRouteProps {
  children: ReactNode;
  role?: AuthRole | AuthRole[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  role,
  fallback,
}: ProtectedRouteProps) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);

  useEffect(() => {
    if (token && !user) void refresh();
  }, [token, user, refresh]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!user) {
    return null; // hydrating — let refresh() resolve
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      return fallback ?? <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
