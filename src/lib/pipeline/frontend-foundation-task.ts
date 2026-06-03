/**
 * Post-processing: guarantee a single "Frontend Foundation" task that ships the
 * shared design system as CODE — semantic design tokens, shared UI primitives,
 * a layout shell and a router skeleton — and wire every frontend page/component
 * task to read it.
 *
 * Why this exists:
 *   DesignSpec.md is a *guide document*, not shared code. A doc can only inform
 *   an agent; it cannot enforce reuse. When N page agents each transcribe the
 *   spec independently, the same brand colour drifts across pages
 *   (bg-[#7d976b] vs bg-[#6f875f] vs text-[#4c6a3c]), no shared Button exists,
 *   and Card gets re-invented per domain. The fix is code-level: one Foundation
 *   task creates the tokens + primitives, and pages import them.
 *
 *   This pairs with split-multipage-tasks.ts: the page-count cap REDUCES drift
 *   (fewer independent transcriptions); the Foundation ELIMINATES it (everyone
 *   imports the same `<Button>` and `bg-primary` token).
 *
 * Behaviour (augment-or-create, idempotent):
 *   - No-op unless the project has frontend tasks.
 *   - Foundation files already owned by another task are left where they are
 *     (never create the same file twice).
 *   - If an app-shell-ish task already exists (creates router.tsx / main.tsx /
 *     AppLayout / AuthContext — the same anchor task-dep-inference keys on), the
 *     unowned foundation files are merged INTO it and it is relabelled as the
 *     Foundation. Otherwise a fresh P0 Foundation task is synthesised at the
 *     front and IDs are renumbered.
 *   - Every other frontend view/component/page task gets the token file and the
 *     UI barrel added to its `files.reads` so the coding agent actually opens
 *     and imports them.
 *
 * Dependency wiring is left to task-dep-inference.ts, which already makes every
 * view/component task depend on the app-shell anchor — now the Foundation task.
 */

import type { KickoffWorkItem, TaskFilePlan } from "./types";

const TOKENS_FILE = "frontend/src/styles/tokens.css";
const UI_BARREL = "frontend/src/components/ui/index.ts";
const INDEX_CSS = "frontend/src/index.css";

/** Shared UI primitives every page should compose instead of re-inventing. */
const UI_PRIMITIVES = [
  "Button",
  "Card",
  "Input",
  "Select",
  "Textarea",
  "Badge",
  "Table",
  "Modal",
  "EmptyState",
  "Spinner",
].map((n) => `frontend/src/components/ui/${n}.tsx`);

/** Layout shell + app-shell anchor files (so task-dep-inference locks onto us). */
const LAYOUT_FILES = [
  "frontend/src/components/layout/AppLayout.tsx",
  "frontend/src/components/layout/Sidebar.tsx",
  "frontend/src/components/layout/TopNav.tsx",
];
const SHELL_FILES = [
  "frontend/src/router.tsx",
  "frontend/src/context/AuthContext.tsx",
];

/** Files the Foundation owns, in priority order (tokens first, shell last). */
const FOUNDATION_CREATES = [
  TOKENS_FILE,
  UI_BARREL,
  ...UI_PRIMITIVES,
  ...LAYOUT_FILES,
  ...SHELL_FILES,
];

/** Sentinel used to detect an already-augmented Foundation description. */
const CONTRACT_MARKER = "DESIGN-SYSTEM CONTRACT";

const FOUNDATION_DESCRIPTION = [
  "Establish the shared frontend design system as CODE (not a doc) so every",
  "page reuses one visual language instead of re-deriving it.",
  "",
  "Deliverables:",
  `  1. Semantic design tokens in \`${TOKENS_FILE}\` (imported by \`${INDEX_CSS}\`):`,
  "     map the SELECTED DesignSpec palette/spacing/typography to named tokens",
  "     (--color-primary, --color-surface, --radius-md, --space-*, font scale)",
  "     and expose them to Tailwind (@theme / theme.extend) as bg-primary,",
  "     text-muted, rounded-md, etc.",
  "  2. Shared UI primitives in `frontend/src/components/ui/` (Button, Card,",
  "     Input, Select, Textarea, Badge, Table, Modal, EmptyState, Spinner) that",
  "     consume ONLY the tokens above, re-exported from the `index.ts` barrel.",
  "  3. Layout shell (AppLayout + Sidebar + TopNav) and per-role shells.",
  "  4. Router skeleton (`router.tsx`) with EVERY route pre-registered to its",
  "     (lazy) view — a missing view is then a build error, not a silent 404.",
  "  5. Shared AuthContext / providers.",
  "",
  "DESIGN-SYSTEM CONTRACT for all downstream page tasks:",
  "  - Import primitives from `@/components/ui`; do NOT hand-roll buttons/cards.",
  "  - Use semantic tokens (bg-primary, text-muted, rounded-md). Inline arbitrary",
  "    hex such as bg-[#7d976b] is FORBIDDEN — it causes cross-page colour drift.",
].join("\n");

// ─── helpers ───────────────────────────────────────────────────────────────

function getCreates(t: KickoffWorkItem): string[] {
  if (!t.files) return [];
  if (Array.isArray(t.files)) return t.files;
  return (t.files as TaskFilePlan).creates ?? [];
}

function getReads(t: KickoffWorkItem): string[] {
  if (!t.files || Array.isArray(t.files)) return [];
  return (t.files as TaskFilePlan).reads ?? [];
}

function getModifies(t: KickoffWorkItem): string[] {
  if (!t.files || Array.isArray(t.files)) return [];
  return (t.files as TaskFilePlan).modifies ?? [];
}

function isFrontendTask(t: KickoffWorkItem): boolean {
  return getCreates(t).some((f) => f.startsWith("frontend/"));
}

/** Same app-shell signal task-dep-inference keys on. */
function isShellTask(t: KickoffWorkItem): boolean {
  return getCreates(t).some((f) =>
    /(AuthContext|AppLayout|AppRouter|RootLayout)\.tsx?$|\/router\.tsx?$|\/main\.tsx?$/.test(
      f,
    ),
  );
}

/** Task creates a page/component file that should reuse the shared primitives. */
function createsViewOrComponent(t: KickoffWorkItem): boolean {
  return getCreates(t).some((f) =>
    /^frontend\/src\/(views|pages|components)\//.test(f),
  );
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs)];
}

function renumberTaskIds(tasks: KickoffWorkItem[]): KickoffWorkItem[] {
  const oldToNew = new Map<string, string>();
  tasks.forEach((t, i) => oldToNew.set(t.id, `T-${String(i + 1).padStart(3, "0")}`));
  return tasks.map((t) => ({
    ...t,
    id: oldToNew.get(t.id) ?? t.id,
    dependencies: (t.dependencies ?? []).map((d) => oldToNew.get(d) ?? d),
  }));
}

// ─── main ────────────────────────────────────────────────────────────────────

export function ensureFrontendFoundationTask(
  tasks: KickoffWorkItem[],
): KickoffWorkItem[] {
  // Only relevant to projects with a frontend.
  if (!tasks.some(isFrontendTask)) return tasks;

  // Files already owned by some task — never create them twice.
  const owned = new Set<string>(tasks.flatMap(getCreates));
  const foundationCreates = FOUNDATION_CREATES.filter((f) => !owned.has(f));

  const existingShell = tasks.find(isShellTask);
  const host = existingShell ?? null;

  let result: KickoffWorkItem[];
  let hostId: string;

  if (host) {
    // Augment the existing shell task into the Foundation.
    hostId = host.id;
    const hostCreates = getCreates(host);
    const hostModifies = getModifies(host);
    result = tasks.map((t) => {
      if (t.id !== host.id) return t;
      const alreadyAugmented = (t.description ?? "").includes(CONTRACT_MARKER);
      return {
        ...t,
        title: t.title.toLowerCase().includes("foundation")
          ? t.title
          : "Implement frontend foundation (design tokens, shared UI, shell, router)",
        description: alreadyAugmented
          ? t.description
          : `${FOUNDATION_DESCRIPTION}\n\n---\n\n${t.description ?? ""}`.trim(),
        priority: "P0",
        files: {
          creates: uniq([...hostCreates, ...foundationCreates]),
          modifies: uniq([...hostModifies, INDEX_CSS]),
          reads: getReads(t),
        },
      };
    });
  } else {
    // No shell task — synthesise one at the front.
    hostId = "T-FND";
    const foundation: KickoffWorkItem = {
      id: hostId,
      phase: "Frontend",
      title: "Implement frontend foundation (design tokens, shared UI, shell, router)",
      description: FOUNDATION_DESCRIPTION,
      estimatedHours: 6,
      executionKind: "ai_autonomous",
      priority: "P0",
      dependencies: [],
      files: {
        // Guarantee the shell anchor files exist even if none were owned.
        creates: uniq([...foundationCreates, ...SHELL_FILES]),
        modifies: [INDEX_CSS],
        reads: [],
      },
    };
    result = [foundation, ...tasks];
  }

  // Wire every other frontend page/component task to READ the tokens + barrel,
  // so the coding agent opens and imports them instead of re-deriving styling.
  result = result.map((t) => {
    if (t.id === hostId || !createsViewOrComponent(t)) return t;
    const reads = uniq([...getReads(t), TOKENS_FILE, UI_BARREL]);
    const creates = getCreates(t);
    const modifies = getModifies(t);
    return { ...t, files: { creates, modifies, reads } };
  });

  // Renumber only when we synthesised a new task (to keep a clean sequence and
  // avoid the placeholder "T-FND" id leaking downstream). Augmenting an
  // existing task preserves all ids, so no renumber is needed.
  return existingShell ? result : renumberTaskIds(result);
}
