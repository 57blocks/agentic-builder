/**
 * Route guard used by router.tsx for every authenticated page.
 *
 * Why two role props?
 *   - `role` (RBAC, `AuthRole`)      → who can DO what (admin / operator / viewer)
 *   - `requiredDomainRole` (string)  → which business persona OWNS the page
 *                                      (family / teacher / student / coach / ...)
 *
 * Most pages only need ONE of the two. A "Family billing" page wants
 * `requiredDomainRole="family"`. An "Audit log" page wants `role="admin"`.
 * The admin RBAC role bypasses domainRole gates by design — admins can
 * impersonate every persona surface.
 *
 * Usage in `router.tsx`:
 *
 *   <Route element={<ProtectedRoute requiredDomainRole="family" />}>
 *     <Route element={<PersonaShell persona="family" navItems={familyNav} />}>
 *       <Route path="/family/dashboard" element={<FamilyDashboardPage />} />
 *       ...
 *     </Route>
 *   </Route>
 *
 *   <Route element={<ProtectedRoute role="admin" />}>
 *     <Route path="/admin/audit" element={<AuditPage />} />
 *   </Route>
 *
 * Behavior:
 *   - No token in store        → redirect to `redirectTo` (default `/login`)
 *   - Token but no user yet    → call refresh(); show null while hydrating
 *   - role mismatch            → redirect to `/unauthorized` (or `fallback`)
 *   - domainRole mismatch      → redirect to `/unauthorized` (or `fallback`)
 *   - admin RBAC role          → bypasses any domainRole gate
 */

import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { AuthRole } from "../../api/auth-client";

export interface ProtectedRouteProps {
  /** RBAC role gate. Single value or array (any-of semantics). */
  role?: AuthRole | AuthRole[];
  /** Business persona gate. Single value or array (any-of semantics). */
  requiredDomainRole?: string | string[];
  /** Where to send unauthenticated users. Defaults to `/login`. */
  redirectTo?: string;
  /** Custom 403 element. Defaults to `<Navigate to="/unauthorized" replace />`. */
  fallback?: ReactNode;
  /**
   * If provided, rendered as the protected content. If omitted, the
   * component renders `<Outlet />` so it can be used as a layout route.
   */
  children?: ReactNode;
}

export function ProtectedRoute({
  role,
  requiredDomainRole,
  redirectTo = "/login",
  fallback,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { token, user, refresh } = useAuth();

  useEffect(() => {
    if (token && !user) void refresh();
  }, [token, user, refresh]);

  if (!token) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  if (!user) {
    // hydrating — `refresh()` will resolve and re-render
    return null;
  }

  // RBAC gate first: a value mismatch is always a hard 403.
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      return fallback ?? <Navigate to="/unauthorized" replace />;
    }
  }

  // Persona gate: admin bypasses by convention so back-office accounts
  // can navigate every domain shell without spoofing `domain_role`.
  if (requiredDomainRole && user.role !== "admin") {
    const allowed = Array.isArray(requiredDomainRole)
      ? requiredDomainRole
      : [requiredDomainRole];
    const current = user.domainRole ?? "";
    if (!allowed.includes(current)) {
      return fallback ?? <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
