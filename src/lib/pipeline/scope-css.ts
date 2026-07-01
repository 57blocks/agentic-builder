// src/lib/pipeline/scope-css.ts
import postcss, { type Rule, type AtRule } from "postcss";

/** Class placed on every ported page's root element; the demo CSS is scoped under it. */
export const PROTOTYPE_ROOT_CLASS = "prototype-root";

/** Selectors that should map onto the scope wrapper itself rather than nest under it. */
const ROOT_LIKE = new Set([":root", "html", "body"]);

function prefixSelector(selector: string, scope: string): string {
  const sel = selector.trim();
  if (!sel) return sel;
  if (ROOT_LIKE.has(sel)) return scope;
  const m = sel.match(/^(?:html|body)\b(.*)$/);
  if (m) {
    const rest = m[1];
    return rest === "" ? scope : `${scope}${rest}`;
  }
  return `${scope} ${sel}`;
}

/**
 * Scope a stylesheet under `scope` (a selector like `.prototype-root`) so the
 * demo's real CSS renders inside the ported page subtree without polluting the
 * scaffold shell. Style rules (incl. those inside `@media`) are prefixed;
 * `:root`/`html`/`body` map onto the wrapper; global at-rules (`@keyframes`,
 * `@font-face`, `@property`, `@import`, `@charset`) and keyframe step selectors
 * are left untouched. Best-effort: malformed CSS is parsed leniently and never throws.
 */
export function scopeCss(css: string, scope: string): string {
  if (!css.trim()) return "";
  let root: ReturnType<typeof postcss.parse>;
  try {
    root = postcss.parse(css);
  } catch {
    return "";
  }
  root.walkRules((rule: Rule) => {
    const parent = rule.parent as AtRule | undefined;
    if (parent && parent.type === "atrule" && /(-)?keyframes$/i.test(parent.name)) return;
    rule.selectors = rule.selectors.map((s) => prefixSelector(s, scope));
  });
  return root.toString();
}
