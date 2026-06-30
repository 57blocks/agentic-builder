// src/lib/pipeline/prototype-router.ts
import fs from "fs/promises";
import path from "path";

export interface PrototypeRoutePage {
  componentName: string;
  route: string;
}

/** Derive a safe PascalCase React component name from a PRD page name. */
export function toViewComponentName(name: string): string {
  const pascal = name
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  if (!pascal) return "Page";
  return /^[A-Za-z]/.test(pascal) ? pascal : `Page${pascal}`;
}

/**
 * Regenerate the scaffold `router.tsx` from the prototype page list. Routing is
 * deterministic (not LLM-authored): each page imports its view and registers a
 * `<Route>`; `/` redirects to the first page unless a page already owns it; the
 * NotFound catch-all is preserved.
 */
export function renderPrototypeRouter(pages: PrototypeRoutePage[]): string {
  const imports = pages
    .map((p) => `import { ${p.componentName} } from "./views/${p.componentName}";`)
    .join("\n");
  const routes = pages
    .map((p) => `      <Route path="${p.route}" element={<${p.componentName} />} />`)
    .join("\n");
  const hasIndex = pages.some((p) => p.route === "/");
  const needsRedirect = !hasIndex && pages.length > 0;
  const redirect = needsRedirect
    ? `      <Route path="/" element={<Navigate to="${pages[0].route}" replace />} />\n`
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
  await fs.writeFile(routerPath, renderPrototypeRouter(pages), "utf-8");
}
