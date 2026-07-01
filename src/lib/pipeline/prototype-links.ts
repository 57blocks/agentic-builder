// src/lib/pipeline/prototype-links.ts
import type { DesignReferenceEntry } from "@/lib/pipeline/design-references";

/**
 * Convert a PRD/demo route's dynamic segments to react-router syntax:
 * `{program}` / `[program]` → `:program`. PRDs and Next-style demos write
 * `{param}` or `[param]`; react-router matches `:param`. Without this the route
 * is a literal segment and never matches a concrete URL.
 */
export function toReactRouterPath(route: string): string {
  return route
    .replace(/\{([^}/]+)\}/g, ":$1")
    .replace(/\[([^\]/]+)\]/g, ":$1");
}

/** The demo's origin (e.g. `https://x-school.org`) from any url-sourced reference label. */
export function deriveDemoOrigin(manifest: DesignReferenceEntry[]): string {
  for (const e of manifest) {
    if (e.source === "url" && typeof e.label === "string" && /^https?:\/\//.test(e.label)) {
      try {
        return new URL(e.label).origin;
      } catch {
        /* skip malformed */
      }
    }
  }
  return "";
}

/**
 * Rewrite navigation `href`s that point at the demo's own origin to relative
 * paths, so the ported page navigates its OWN routes (and the anchor-nav delegate,
 * which only handles `/`-relative hrefs, can intercept them) instead of opening the
 * live demo site. Sub-project-1 capture absolutises URLs, so ported anchors arrive
 * as `href="https://demo.example/foo"`. Only `href` is touched — `src` (images)
 * stays absolute so assets still load from the demo. Bare origin → `/`.
 */
export function relativizeDemoHrefs(tsx: string, origin: string): string {
  if (!origin) return tsx;
  const esc = origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tsx
    .replace(new RegExp(`(href=")${esc}(/[^"]*)?"`, "g"), (_m, p1, p) => `${p1}${p || "/"}"`)
    .replace(new RegExp(`(href=')${esc}(/[^']*)?'`, "g"), (_m, p1, p) => `${p1}${p || "/"}'`);
}
