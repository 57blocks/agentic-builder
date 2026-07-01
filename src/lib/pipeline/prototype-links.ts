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
 * Unwrap Next.js image-optimizer references to the direct asset URL, absolute to
 * the demo origin: `[origin]/_next/image?url=%2Fassets%2Fx.png&w=..&q=..` →
 * `<origin>/assets/x.png`. Ported markup keeps these for both `src` (absolute) and
 * `srcSet` (RELATIVE → 404s on the prototype's dev server, which has no
 * `/_next/image` route; and the browser prefers srcSet). The raw static asset loads
 * cross-origin reliably, unlike the optimizer endpoint (referer/domain checks).
 * Descriptors (` 1x`, ` 640w`) are preserved. No-op for other origins/paths.
 */
export function rewriteNextImageUrls(tsx: string, origin: string): string {
  const re = /(?:https?:\/\/[^"'\s/]+)?\/_next\/image\?url=([^&"'\s]+)[^"'\s]*/g;
  return tsx.replace(re, (_m, enc: string) => {
    let target: string;
    try {
      target = decodeURIComponent(enc);
    } catch {
      target = enc;
    }
    if (/^https?:\/\//.test(target)) return target; // url param was already absolute
    if (!origin) return target; // can't absolutise without an origin; leave as-is
    return target.startsWith("/") ? `${origin}${target}` : `${origin}/${target}`;
  });
}

/**
 * Collect the unique demo-origin image URLs referenced by `src`/`srcSet` in the
 * ported markup, so they can be downloaded into the prototype's `public/` and
 * served locally (no cross-origin hotlinking, which the demo's CDN/WAF rate-limits
 * and browsers block cross-site). Strips srcSet descriptors (` 1x`, ` 640w`).
 */
export function collectDemoImageUrls(tsx: string, origin: string): string[] {
  if (!origin) return [];
  const urls = new Set<string>();
  for (const m of tsx.matchAll(/(?:src|srcSet|srcset)="([^"]*)"/g)) {
    for (const part of m[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url && url.startsWith(origin)) urls.add(url);
    }
  }
  return [...urls];
}

/** The public-relative path a demo asset URL is stored/served at (origin stripped). */
export function demoAssetLocalPath(url: string, origin: string): string {
  const rest = url.slice(origin.length);
  return rest.startsWith("/") ? rest : `/${rest}`;
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
