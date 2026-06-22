/**
 * Frontend phase split + route-consolidation helpers (pure, unit-tested).
 *
 * The two-stage frontend flow (BLUEPRINT_FE_ROUTE_CONSOLIDATION):
 *   - `fe_foundation` runs the design-system/shell task(s) first (tokens, shared
 *     UI, layout, AuthContext, a MINIMAL router shell).
 *   - page/view tasks then fan out in PARALLEL — they each own only their own
 *     view file(s), so they're conflict-free and never touch the shared router.
 *   - `fe_route_consolidation` finally writes `router.tsx` ONCE, registering
 *     every view that actually exists.
 *
 * This module holds only the deterministic pieces: classifying foundation vs
 * page tasks, and the guardrails the LLM-written router must satisfy.
 */

import type { CodingTask } from "@/lib/pipeline/types";
import { collectTaskFiles } from "./shared/task-chunking";

/** Path fragments that mark a file as design-system / app-shell foundation. */
const FOUNDATION_FILE_PATTERNS: RegExp[] = [
  /\/router\.tsx?$/,
  /\/main\.tsx?$/,
  /\/App\.tsx?$/,
  /(AuthContext|AppLayout|RootLayout|AppRouter)\.tsx?$/,
  /\/components\/layout\//,
  /\/components\/ui\//,
  /\/styles\/tokens\.css$/,
  /\/index\.css$/,
  /\/context\//,
  /\/providers?\//,
];

function isFrontendFile(f: string): boolean {
  return f.startsWith("frontend/");
}

/** A task that creates/owns shell/design-system files (runs before pages). */
export function isFoundationTask(task: CodingTask): boolean {
  const { creates, modifies } = collectTaskFiles(task);
  const owned = [...creates, ...modifies];
  if (owned.length === 0) return false;
  // Foundation = touches a shell file AND does not also create a regular view
  // (a task that creates views is a page task even if it grazes the shell).
  const touchesShell = owned.some((f) =>
    FOUNDATION_FILE_PATTERNS.some((re) => re.test(f)),
  );
  if (!touchesShell) return false;
  const createsView = creates.some((f) =>
    /^frontend\/src\/(views|pages)\//.test(f),
  );
  return !createsView;
}

/** A frontend task at all (creates any frontend/ file). */
export function isFrontendTask(task: CodingTask): boolean {
  const { creates, modifies } = collectTaskFiles(task);
  return [...creates, ...modifies].some(isFrontendFile);
}

export interface FrontendTaskSplit {
  foundation: CodingTask[];
  pages: CodingTask[];
}

/**
 * Partition frontend tasks into the foundation (runs first, serial) and the
 * page/view tasks (fan out in parallel). Non-frontend tasks are ignored.
 * Order within each bucket is preserved.
 */
export function splitFrontendTasks(tasks: CodingTask[]): FrontendTaskSplit {
  const foundation: CodingTask[] = [];
  const pages: CodingTask[] = [];
  for (const t of tasks) {
    if (isFoundationTask(t)) foundation.push(t);
    else pages.push(t);
  }
  return { foundation, pages };
}

// ─── Route-consolidation guardrails ─────────────────────────────────────────

export interface ViewModule {
  /** Project-relative file path, e.g. "frontend/src/views/Dashboard.tsx". */
  file: string;
  /** Import specifier to use from the router, e.g. "@/views/Dashboard". */
  importPath: string;
  /** Exported component identifier (default or named). */
  exportName: string;
  isDefault: boolean;
}

/** Detect the primary React component export of a view module. */
export function detectViewExport(
  src: string,
): { exportName: string; isDefault: boolean } | null {
  // default export forms
  let m = src.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (m) return { exportName: m[1]!, isDefault: true };
  m = src.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/);
  if (m && /^[A-Z]/.test(m[1]!)) return { exportName: m[1]!, isDefault: true };
  if (/export\s+default\s+(?:function|\(|class)/.test(src)) {
    return { exportName: "default", isDefault: true };
  }
  // named export forms — prefer a PascalCase identifier (a component)
  const named = [
    ...src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g),
    ...src.matchAll(/export\s+const\s+([A-Za-z0-9_]+)\s*[:=]/g),
  ]
    .map((x) => x[1]!)
    .filter((n) => /^[A-Z]/.test(n));
  if (named.length > 0) return { exportName: named[0]!, isDefault: false };
  return null;
}

/** Turn a "frontend/src/views/Foo.tsx" path into a "@/views/Foo" import specifier. */
export function viewImportSpecifier(file: string): string {
  let p = file.replace(/^frontend\/src\//, "@/");
  p = p.replace(/\.(tsx|ts|jsx|js)$/, "");
  return p;
}

export interface RouterGuardResult {
  ok: boolean;
  /** View import specifiers the router fails to reference. */
  missingViews: string[];
  /** True when the router still contains an antd <Result> scaffold placeholder. */
  hasPlaceholder: boolean;
  /** True when the router wires React Router (BrowserRouter/Routes/RouterProvider). */
  wiresRouter: boolean;
}

/**
 * Deterministic guardrail for the LLM-written router: it must reference every
 * produced view, wire React Router, and contain no scaffold placeholder.
 */
export function validateConsolidatedRouter(
  routerSrc: string,
  views: ViewModule[],
): RouterGuardResult {
  const missingViews = views
    .filter((v) => !routerSrc.includes(v.importPath))
    .map((v) => v.importPath);
  const hasPlaceholder = /<Result\b/.test(routerSrc);
  const wiresRouter =
    /\bBrowserRouter\b/.test(routerSrc) ||
    /\bcreateBrowserRouter\b/.test(routerSrc) ||
    /\bRouterProvider\b/.test(routerSrc) ||
    /<Routes\b/.test(routerSrc);
  return {
    ok: missingViews.length === 0 && !hasPlaceholder && wiresRouter,
    missingViews,
    hasPlaceholder,
    wiresRouter,
  };
}
