// src/lib/pipeline/prototype-anchor-nav.ts
import path from "path";

/** Where the prototype anchor-nav delegate component is written (frontend-relative). */
export const PROTOTYPE_ANCHOR_NAV_REL = path.join("src", "PrototypeAnchorNav.tsx");

/**
 * Source of a prototype-only component that makes the demo's verbatim
 * `<a href="/…">` anchors navigate client-side via react-router (the ported pages
 * keep raw anchors, not <Link>, so without this they full-reload / don't switch).
 */
export const PROTOTYPE_ANCHOR_NAV_SOURCE = `import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Prototype-only: the ported pages keep the demo's verbatim \`<a href="/…">\`
 * anchors (not react-router <Link>), so clicking them would full-reload instead
 * of client-side navigating. This global delegate intercepts same-origin anchor
 * clicks and routes them through react-router, so the prototype is navigable for
 * review. Ignores \`#\`, external, new-tab, download, and modified clicks.
 */
export function PrototypeAnchorNav() {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return; // ignore "#", external, javascript:
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      e.preventDefault();
      navigate(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
  return null;
}
`;

/**
 * Idempotently wire `<PrototypeAnchorNav />` into a scaffold `main.tsx`: add its
 * import and render it just inside the opening `<BrowserRouter>` (so `useNavigate`
 * has a router context). No-op if already wired, or if there is no `<BrowserRouter>`
 * to mount it under.
 */
export function ensureAnchorNavWired(mainTsx: string): string {
  if (mainTsx.includes("PrototypeAnchorNav")) return mainTsx;
  if (!/<BrowserRouter[\s>]/.test(mainTsx)) return mainTsx;

  const importLine = `import { PrototypeAnchorNav } from "./PrototypeAnchorNav";`;
  const lines = mainTsx.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\b/.test(lines[i])) lastImport = i;
  }
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, importLine);
  else lines.unshift(importLine);

  return lines
    .join("\n")
    .replace(/(<BrowserRouter\b[^>]*>)/, `$1\n      <PrototypeAnchorNav />`);
}
