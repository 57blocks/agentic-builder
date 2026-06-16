/**
 * Deterministic frontend router-wiring auto-fix.
 *
 * Sibling of the backend `route-audit-autofix` (which wires `*.routes.ts`
 * into `backend/src/api/modules/index.ts`). This one fixes the FRONTEND
 * counterpart: an **orphaned router**.
 *
 *   The S-tier scaffold ships `src/App.tsx` with an INLINE `<Routes>` of
 *   placeholder pages and NO `src/router.tsx`. The coding agent — following
 *   the M/L convention "register routes in router.tsx" — creates a real
 *   `src/router.tsx` (e.g. `export default function AppRouter()` mounting the
 *   actual product pages) but never rewires `App.tsx`. Result: the entry
 *   chain stays `main.tsx → App.tsx (scaffold placeholder)`, the real
 *   `AppRouter` is imported by nobody, and the running app shows the
 *   scaffold "Welcome" page instead of the product.
 *
 * The fix is mechanical, not creative: when a Routes-rendering router module
 * exists but the App that `main.tsx` renders is still the scaffold
 * placeholder (and doesn't import that router), rewrite `App.tsx` to render
 * the router. `main.tsx → App → AppRouter` is then closed.
 *
 * The pure helpers are string→string transforms so they unit-test without IO;
 * the IO orchestrator (`repairFrontendRouterWiring`) walks the known frontend
 * roots and applies them. It writes via `fs` directly (NOT the `fsWrite`
 * tool): this is a deterministic codemod that intentionally replaces a large
 * placeholder with a few lines, which the tool's content-loss guard would
 * (correctly, for LLM writes) reject.
 */

import fs from "fs/promises";
import path from "path";

/** Frontend roots to inspect, in priority order: S single-package, then M/L. */
const FRONTEND_ROOTS = ["src", "frontend/src"];

/** Substrings that prove an `App.tsx` is the untouched scaffold placeholder. */
const SCAFFOLD_APP_MARKERS = [
  "Replace with real page content",
  "S-Tier · React + Vite",
];

export interface RouterEntryExport {
  /** Component name to import/render (binding name for default imports). */
  name: string;
  /** Whether it is the module's default export. */
  isDefault: boolean;
}

/**
 * Detect a `<Routes>`-rendering router component exported from a router
 * module. Returns null when the file is not a real router (no `<Routes>`) or
 * exposes no usable export. Prefers a default export; falls back to the first
 * named function/const export.
 */
export function detectRouterEntryExport(
  routerSrc: string,
): RouterEntryExport | null {
  // Must actually render a route tree to be a router worth wiring.
  if (!/<Routes\b/.test(routerSrc)) return null;

  // Default export forms.
  let m = routerSrc.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (m) return { name: m[1], isDefault: true };

  m = routerSrc.match(/export\s+default\s+function\s*\(/);
  if (m) return { name: "AppRouter", isDefault: true };

  m = routerSrc.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/);
  if (m) return { name: m[1], isDefault: true };

  // Named export forms.
  m = routerSrc.match(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
  if (m) return { name: m[1], isDefault: false };

  m = routerSrc.match(/export\s+const\s+([A-Za-z0-9_]+)\s*[:=]/);
  if (m) return { name: m[1], isDefault: false };

  return null;
}

/** Does the App source already import from the given router module path? */
export function appImportsRouterModule(
  appSrc: string,
  importPath: string,
): boolean {
  const esc = importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`from\\s*['"]${esc}(\\.[jt]sx?)?['"]`).test(appSrc);
}

/**
 * Is this App the untouched scaffold placeholder, or does it inline its own
 * `<Routes>` tree (i.e. it owns routing, competing with a separate router
 * module)? Either case is the orphan signature the orchestrator repairs —
 * but only ever when a separate router module also exists (checked there), so
 * a legitimate custom App that inlines routing without a rival router is left
 * untouched.
 */
export function appIsScaffoldPlaceholder(appSrc: string): boolean {
  if (SCAFFOLD_APP_MARKERS.some((s) => appSrc.includes(s))) return true;
  return /<Routes\b/.test(appSrc);
}

/** Build a thin `App.tsx` that renders the detected router entry. */
export function buildRouterAppSource(
  entry: RouterEntryExport,
  importPath: string,
): string {
  const importLine = entry.isDefault
    ? `import ${entry.name} from '${importPath}';`
    : `import { ${entry.name} } from '${importPath}';`;
  return `${importLine}

function App() {
  return <${entry.name} />;
}

export default App;
`;
}

export interface FrontendRouterRepairResult {
  /** Files rewritten (relative to outputDir) with a short reason. */
  changed: Array<{ file: string; reason: string }>;
  /** Roots inspected but not changed, with why. */
  skipped: Array<{ root: string; reason: string }>;
}

async function readIf(abs: string): Promise<string | null> {
  try {
    return await fs.readFile(abs, "utf-8");
  } catch {
    return null;
  }
}

/** Resolve `<root>/<base>.tsx` or `.jsx`, returning the existing one. */
async function resolveEntryFile(
  outputDir: string,
  root: string,
  base: string,
): Promise<{ abs: string; rel: string; src: string } | null> {
  for (const ext of [".tsx", ".jsx"]) {
    const rel = path.join(root, `${base}${ext}`);
    const abs = path.join(outputDir, rel);
    const src = await readIf(abs);
    if (src != null) return { abs, rel: rel.split(path.sep).join("/"), src };
  }
  return null;
}

/**
 * Repair orphaned frontend router wiring under `outputDir`. Idempotent: a
 * project whose App already renders its router is left unchanged. Conservative:
 * only rewrites an App that is the scaffold placeholder / inlines routing AND
 * has a separate Routes-rendering router module it isn't importing.
 */
export async function repairFrontendRouterWiring(
  outputDir: string,
): Promise<FrontendRouterRepairResult> {
  const changed: FrontendRouterRepairResult["changed"] = [];
  const skipped: FrontendRouterRepairResult["skipped"] = [];

  for (const root of FRONTEND_ROOTS) {
    const app = await resolveEntryFile(outputDir, root, "App");
    const router = await resolveEntryFile(outputDir, root, "router");

    if (!app || !router) continue; // no App+router pair here

    const entry = detectRouterEntryExport(router.src);
    if (!entry) {
      skipped.push({ root, reason: "router module renders no <Routes>" });
      continue;
    }

    const importPath = "./router";
    if (appImportsRouterModule(app.src, importPath)) {
      skipped.push({ root, reason: "App already imports the router" });
      continue;
    }
    if (!appIsScaffoldPlaceholder(app.src)) {
      skipped.push({
        root,
        reason: "App is custom (no scaffold marker / inline routes) — left as-is",
      });
      continue;
    }

    const newApp = buildRouterAppSource(entry, importPath);
    await fs.writeFile(app.abs, newApp, "utf-8");
    changed.push({
      file: app.rel,
      reason: `rewired App → ${entry.isDefault ? "" : "{ "}${entry.name}${entry.isDefault ? "" : " }"} from ${importPath}`,
    });
  }

  return { changed, skipped };
}
