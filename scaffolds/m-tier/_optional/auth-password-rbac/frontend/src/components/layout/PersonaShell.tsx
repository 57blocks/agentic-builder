/**
 * Generic persona shell used by router.tsx as the layout route for every
 * persona-scoped surface (family / teacher / student / coach / admin / ...).
 *
 * One generic component, parameterised by `persona` + `navItems`, replaces
 * the historic pattern of hand-rolling FamilyShell.tsx + TeacherShell.tsx
 * + AdminShell.tsx + ... in every codegen run — three near-identical files
 * that drifted from each other and forgot to gate on `domainRole`
 * (the F-10 / F-13 / F-15 outage class).
 *
 * Wiring example (in `router.tsx`):
 *
 *   const familyNav = [
 *     { to: "/family/dashboard", label: "Dashboard" },
 *     { to: "/family/lessons",   label: "Lessons" },
 *     { to: "/family/billing",   label: "Billing" },
 *   ];
 *
 *   <Route element={<PersonaShell persona="family" navItems={familyNav} />}>
 *     <Route path="/family/dashboard" element={<FamilyDashboardPage />} />
 *     <Route path="/family/lessons"   element={<FamilyLessonsPage />} />
 *     <Route path="/family/billing"   element={<FamilyBillingPage />} />
 *   </Route>
 *
 * Hard rules:
 *   - Persona-scoped routes MUST mount under a PersonaShell of the same
 *     `persona`. Don't mix family + teacher pages under one shell.
 *   - PersonaShell wraps itself in `<ProtectedRoute requiredDomainRole={persona}>`
 *     by default — DON'T add a second ProtectedRoute on top.
 *   - For sub-pages that also need an RBAC gate (e.g. "Family admin
 *     settings only for the family head"), nest another ProtectedRoute
 *     INSIDE this shell with `role="admin"` — the gates compose.
 *
 * Styling stays tailwind-only and intentionally minimal — the codegen
 * worker is expected to adapt the layout to match the project's design
 * system. Don't ship custom CSS files alongside this component.
 */

import { type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { useAuth } from "../../hooks/useAuth";

export interface PersonaNavItem {
  to: string;
  label: string;
  icon?: ReactNode;
}

export interface PersonaShellProps {
  /** Business persona key (must match a `domainRole` value used in seeds). */
  persona: string;
  /** Sidebar navigation items rendered as `<NavLink>`s. */
  navItems: PersonaNavItem[];
  /** Optional header text. Defaults to capitalised `persona`. */
  title?: string;
  /**
   * Override the domain gate. By default, the shell gates on
   * `requiredDomainRole={[persona]}`. Pass an array to allow multiple
   * personas (e.g. ["teacher", "coach"]) under the same shell.
   */
  requiredDomainRole?: string | string[];
}

export function PersonaShell({
  persona,
  navItems,
  title,
  requiredDomainRole,
}: PersonaShellProps) {
  const { user, logout } = useAuth();
  const headerTitle =
    title ?? persona.charAt(0).toUpperCase() + persona.slice(1);

  return (
    <ProtectedRoute requiredDomainRole={requiredDomainRole ?? [persona]}>
      <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
        <aside className="flex w-60 flex-col border-r border-neutral-800 bg-neutral-900/60 px-4 py-6">
          <h2 className="mb-6 px-2 text-lg font-semibold tracking-tight text-neutral-100">
            {headerTitle}
          </h2>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }: { isActive: boolean }) =>
                  [
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100",
                  ].join(" ")
                }
              >
                {item.icon ? (
                  <span className="flex h-4 w-4 items-center justify-center">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/40 px-6 py-3">
            <span className="text-sm text-neutral-400">
              {user?.displayName ?? user?.email ?? "Signed in"}
            </span>
            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              className="rounded-md border border-neutral-700 bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-200 transition-colors hover:bg-neutral-700/60"
            >
              Log out
            </button>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
