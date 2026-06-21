/**
 * Role-aware session seeding for capturing localStorage-mock prototypes.
 *
 * The generated hi-fi mockups gate routes purely client-side: a session object
 * in `localStorage` carries `role`, and the SPA router redirects a wrong-role /
 * unauthenticated request to that role's default home (PRD §6.2). So capturing
 * `/teacher/*` or `/admin/*` without the matching role in localStorage yields
 * the WRONG page.
 *
 * This module derives the role from the route path and builds the localStorage
 * seed to inject BEFORE navigation. The session key (e.g. `csma_demo_session`)
 * is auto-detected from the PRD §18 "localStorage 存储契约" table — the row whose
 * value-shape declares a `role` field — so nothing is hardcoded to one project.
 */

export type MockRole = "family" | "teacher" | "admin";

export interface MockupSessionSeed {
  /** localStorage key to set (or clear). */
  key: string;
  /** JSON string value to store. Omitted when `clear` is set. */
  value?: string;
  /**
   * Remove the key instead of setting it. Used for login/logout pages: a
   * persisted session would redirect `/auth` → the role's home, so we clear the
   * session first to render the actual login form.
   */
  clear?: boolean;
}

/** Login/logout routes that must render WITHOUT a session. */
const AUTH_PATHS = /^\/(auth|login|sign-?in|logout|sign-?out)\b/i;

/** Role implied by a route path prefix. Defaults to family (public/auth pages). */
export function roleForRoutePath(pathname: string): MockRole {
  const p = (pathname || "/").toLowerCase();
  if (p.startsWith("/teacher")) return "teacher";
  if (p.startsWith("/admin")) return "admin";
  return "family";
}

/**
 * Find the session localStorage key from a PRD §18 contract table: the first
 * row whose data-shape declares a `role` field AND looks like a session (has a
 * companion field such as email/loggedAt/profileCompleted, or "session" in the
 * key) — this disambiguates from rows like `{ [role]: profileData }`.
 */
export function detectSessionKey(prdContent: string): string | null {
  for (const line of prdContent.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t.split("|").map((c) => c.trim());
    // ["", key, shape, ...] for a leading-pipe markdown row
    if (cells.length < 3) continue;
    const keyCell = cells[1];
    const shapeCell = cells[2];
    const keyMatch = keyCell.match(/`([^`]+)`/);
    if (!keyMatch) continue;
    const key = keyMatch[1];
    if (!/\brole\b/.test(shapeCell)) continue;
    const looksLikeSession =
      /\b(email|loggedAt|profileCompleted|loginMethod|agreementsSigned)\b/.test(
        shapeCell,
      ) || /session/i.test(key);
    // Skip a `{ [role]: ... }` index-shape that isn't a session.
    if (/\[\s*role\s*\]/.test(shapeCell) && !looksLikeSession) continue;
    if (looksLikeSession) return key;
  }
  return null;
}

/** Best-effort current policy version from the PRD (to satisfy "signed" guards). */
export function detectPolicyVersion(prdContent: string): string | null {
  const m = prdContent.match(/policyVersion["'\s:=]+["']([^"']+)["']/);
  return m ? m[1] : null;
}

/**
 * Build the localStorage session seed for capturing `url`, or null when the PRD
 * declares no session key (then the caller skips seeding). `nowIso` is passed in
 * so the function stays pure/testable.
 */
export function buildMockupSessionSeed(
  url: string,
  prdContent: string,
  nowIso: string,
): MockupSessionSeed | null {
  const key = detectSessionKey(prdContent);
  if (!key) return null;
  let pathname = "/";
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  // Login/logout pages render only without a session — clear it.
  if (AUTH_PATHS.test(pathname)) {
    return { key, clear: true };
  }
  const role = roleForRoutePath(pathname);
  const value = JSON.stringify({
    email: `${role}@demo.local`,
    role,
    name: `${role[0].toUpperCase()}${role.slice(1)} Demo`,
    loginMethod: "demo",
    loggedAt: nowIso,
    // Permissive flags so role guards / onboarding / policy modals don't block
    // the screenshot (we want the page itself, not a gate).
    profileCompleted: true,
    agreementsSigned: true,
    policyVersion: detectPolicyVersion(prdContent) ?? "2026.05",
  });
  return { key, value };
}
