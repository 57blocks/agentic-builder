/**
 * Plan the "auto-capture all pages from one entry URL" flow.
 *
 * Pure (no Electron / network) so it's unit-testable. Given an entry URL, the
 * PRD page list (with routes, from `extractPrdPageHints`), and any same-origin
 * links discovered while capturing, it produces the ordered list of
 * `{ url, pageHint }` to screenshot — each bound DETERMINISTICALLY to its PRD
 * page card (no Vision auto-match):
 *
 *   - static route → `<entryOrigin><route>`
 *   - `:param` route → a crawled concrete instance matching the template
 *     (e.g. `/family/courses/private/:courseId` ← `/family/courses/private/abc`)
 *   - no route (`暂无路由`) → skipped (reported)
 */
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";

export interface CapturePlanItem {
  /** Absolute URL to screenshot. */
  url: string;
  /** PAGE-id to bind the screenshot to (manual pageHint → its grid card). */
  pageHint: string;
  /** The PRD route this satisfies (for logging). */
  routeTemplate: string;
}

export interface AutoCapturePlan {
  plan: CapturePlanItem[];
  skipped: Array<{ page: string; reason: string }>;
}

/**
 * True when the page actually landed on the route we asked for. A role guard /
 * login wall redirects a cross-role or unauthenticated request to a DIFFERENT
 * path (e.g. `/teacher/dashboard` → `/auth` or `/family/dashboard`); binding
 * that screenshot to the requested page's card is wrong. Compares pathname only
 * (ignores query/hash/trailing slash, case-insensitive). Unparseable → treated
 * as same-route (don't block on a parsing failure).
 */
export function isSameRoutePath(requestedUrl: string, finalUrl: string): boolean {
  try {
    const norm = (u: string) =>
      (new URL(u).pathname.replace(/\/+$/, "") || "/").toLowerCase();
    return norm(requestedUrl) === norm(finalUrl);
  } catch {
    return true;
  }
}

function originOf(entryUrl: string): string | null {
  try {
    return new URL(entryUrl).origin;
  } catch {
    return null;
  }
}

function pathOf(absUrl: string): string | null {
  try {
    const p = new URL(absUrl).pathname.replace(/\/+$/, "");
    return p || "/";
  } catch {
    return null;
  }
}

/** `/a/:id/b` → /^\/a\/[^/]+\/b\/?$/ — matches one concrete segment per `:param`. */
function paramRouteToRegex(template: string): RegExp {
  const body = template
    .replace(/\/+$/, "")
    .split("/")
    .map((seg) =>
      seg.startsWith(":")
        ? "[^/]+"
        : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  return new RegExp(`^${body}/?$`);
}

export function buildAutoCapturePlan(
  entryUrl: string,
  pages: PrdPageHint[],
  crawledUrls: string[] = [],
): AutoCapturePlan {
  const plan: CapturePlanItem[] = [];
  const skipped: Array<{ page: string; reason: string }> = [];

  const origin = originOf(entryUrl);
  if (!origin) {
    return {
      plan,
      skipped: [{ page: "(entry)", reason: "entry URL is not a valid http(s) URL" }],
    };
  }

  const crawlPaths = crawledUrls
    .map(pathOf)
    .filter((p): p is string => p !== null);

  const seenUrls = new Set<string>();
  const push = (item: CapturePlanItem) => {
    if (seenUrls.has(item.url)) return;
    seenUrls.add(item.url);
    plan.push(item);
  };

  for (const page of pages) {
    if (!page.route) {
      skipped.push({ page: page.name, reason: "no route in PRD" });
      continue;
    }
    if (page.isParamRoute) {
      const re = paramRouteToRegex(page.route);
      const hit = crawlPaths.find((p) => re.test(p));
      if (hit) {
        push({ url: origin + hit, pageHint: page.id, routeTemplate: page.route });
      } else {
        skipped.push({
          page: page.name,
          reason: `param route ${page.route} — no concrete instance discovered`,
        });
      }
      continue;
    }
    push({ url: origin + page.route, pageHint: page.id, routeTemplate: page.route });
  }

  return { plan, skipped };
}
