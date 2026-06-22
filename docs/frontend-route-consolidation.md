# Frontend: parallel page workers + final route consolidation

## Problem

The frontend phase was effectively **serial**, and routes were authored **too early**:

- The "Frontend Foundation" task pre-registered EVERY route to a (lazy) view in
  `router.tsx` *before the views existed* — so a view created at a slightly
  different path became a silent 404 / triggered the `missing-route-stubs` and
  router-autofix self-heal.
- Every page task `depends on` the Foundation (shell anchor). `chunkTasksByFileConflict`
  unions dependency-linked tasks into one chunk → Foundation + all pages = a single
  chunk → one worker → serial, even with `BLUEPRINT_PARALLEL_CODING_WORKERS` on.

## Change (flag: `BLUEPRINT_FE_ROUTE_CONSOLIDATION`, default ON)

Two-stage frontend phase + a final route-writing step:

```
… → schema_arbiter → fe_foundation → fe_dispatch_gate → fe_worker (parallel pages)
      → fe_route_consolidation → fe_phase_verify → sync_deps → …
```

1. **`fe_foundation`** runs the design-system / shell task(s) ALONE, first: tokens,
   shared UI primitives, layout, AuthContext, and a **minimal** `router.tsx` shell
   (App→layout + an index route — NOT per-page routes).
2. **`fe_worker`** fans out the page/view tasks in **parallel**. With routing removed
   from their responsibility they're file-disjoint and their Foundation dependency is
   already satisfied, so they parallelize freely — independent of
   `BLUEPRINT_PARALLEL_CODING_WORKERS`. Worker count: `frontendPageWorkerCount()`.
   Page workers are told (convention card) to implement only their view and NOT to
   edit the shared router.
3. **`fe_route_consolidation`** writes `router.tsx` ONCE at the end: scans the views
   that actually exist on disk, detects each one's export, and an LLM authors the full
   router (PRD-aware paths/nav). A deterministic guardrail
   (`validateConsolidatedRouter`) enforces: every view imported, real React Router
   wired, no `<Result>` placeholder — with one corrective retry. Then App→router is
   re-wired via the existing `repairFrontendRouterWiring`.

Set `BLUEPRINT_FE_ROUTE_CONSOLIDATION=0` to restore the legacy single-stage dispatch
(Foundation pre-registers all routes; pages serialized).

## Why this is better

- Routes point at views that **exist** (no path-guessing → no silent 404 / stub views).
- Pages are genuinely parallel (Foundation ran first; no shared-router write-conflict).
- Routing stays **centralized** in one file authored once — matches the design-system
  cohesion the Foundation already enforces for styling.

## Code

- `src/lib/langgraph/supervisor/config.ts` — `ENABLE_FE_ROUTE_CONSOLIDATION`,
  `frontendPageWorkerCount()`.
- `src/lib/langgraph/supervisor/frontend-phase-split.ts` — pure helpers
  (`splitFrontendTasks`, `detectViewExport`, `viewImportSpecifier`,
  `validateConsolidatedRouter`) + 14 tests.
- `src/lib/langgraph/supervisor.ts` — `feFoundation`, `feRouteConsolidation` nodes;
  `dispatchFrontendWorkers` fans out pages only; graph edges.
- `src/lib/pipeline/frontend-foundation-task.ts` — Foundation builds a minimal router
  shell, defers per-page routes to consolidation.
- `src/lib/langgraph/agent-subgraph.ts` — page-worker convention: don't register routes.

## Validation caveat

The pure helpers are unit-tested and `src/` typechecks clean. The end-to-end behavior
— Foundation-first ordering, true page parallelism, and the LLM-authored router passing
the guardrail on a real PRD — needs ONE real generation run to validate. Roll out and
compare a generated app's `router.tsx` + parallel timing before/after. The flag lets you
revert instantly if a run regresses.
