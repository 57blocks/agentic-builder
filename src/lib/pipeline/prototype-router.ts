// src/lib/pipeline/prototype-router.ts
import fs from "fs/promises";
import path from "path";

export interface PrototypeRoutePage {
  componentName: string;
  route: string;
}

/**
 * Derive a safe PascalCase React component name from a PRD page name.
 *
 * PRD headings keep a trailing route note in parentheses — fullwidth `（`/auth`）`
 * (the shared `extractPrdPageHints` intentionally preserves it) or ascii `(…)`.
 * Strip those first so the note isn't fused into the identifier
 * (e.g. `AuthPage（`/auth`）` → `AuthPage`, not `AuthPageAuth`).
 */
export function toViewComponentName(name: string): string {
  const pascal = name
    .replace(/（[^）]*）/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  if (!pascal) return "Page";
  return /^[A-Za-z]/.test(pascal) ? pascal : `Page${pascal}`;
}

/** A route with no dynamic segment — safe as a landing target (`:param` react-router, `{param}` Next-style). */
function isStaticRoute(route: string): boolean {
  return !route.includes(":") && !route.includes("{");
}

/**
 * Pick the `/` redirect target: the most root-level STATIC route (fewest path
 * segments, then shortest), never a parameterised route (which would redirect to a
 * literal `:id`/`{id}` placeholder). Returns null when a page already owns `/`.
 * Page order is generation-completion order and not meaningful, so we choose by
 * route shape rather than taking `pages[0]`.
 */
function pickIndexRedirect(pages: PrototypeRoutePage[]): string | null {
  if (pages.length === 0 || pages.some((p) => p.route === "/")) return null;
  const statics = pages.filter((p) => isStaticRoute(p.route));
  const pool = statics.length > 0 ? statics : pages; // fall back only if every route is param'd
  const depth = (r: string) => r.split("/").filter(Boolean).length;
  const best = [...pool].sort(
    (a, b) => depth(a.route) - depth(b.route) || a.route.length - b.route.length,
  )[0];
  return best.route;
}

/**
 * Regenerate the scaffold `router.tsx` from the prototype page list. Routing is
 * deterministic (not LLM-authored): each page imports its view and registers a
 * `<Route>`; `/` redirects to the most root-level static page (see
 * `pickIndexRedirect`) unless a page already owns `/`; the NotFound catch-all stays.
 */
export function renderPrototypeRouter(pages: PrototypeRoutePage[]): string {
  const imports = pages
    .map((p) => `import { ${p.componentName} } from "./views/${p.componentName}";`)
    .join("\n");
  const routes = pages
    .map((p) => `      <Route path="${p.route}" element={<${p.componentName} />} />`)
    .join("\n");
  const redirectTo = pickIndexRedirect(pages);
  const needsRedirect = redirectTo !== null;
  const redirect = needsRedirect
    ? `      <Route path="/" element={<Navigate to="${redirectTo}" replace />} />\n`
    : "";
  const routerImports = needsRedirect
    ? `import { Routes, Route, Navigate } from "react-router-dom";`
    : `import { Routes, Route } from "react-router-dom";`;
  return `${routerImports}
import { NotFound } from "./views/NotFound";
${imports}

export function AppRouter() {
  return (
    <Routes>
${redirect}${routes}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
`;
}

export async function writePrototypeRouter(
  frontendDir: string,
  pages: PrototypeRoutePage[],
): Promise<void> {
  const routerPath = path.join(frontendDir, "src", "router.tsx");
  await fs.mkdir(path.dirname(routerPath), { recursive: true });
  await fs.writeFile(routerPath, renderPrototypeRouter(pages), "utf-8");
}
