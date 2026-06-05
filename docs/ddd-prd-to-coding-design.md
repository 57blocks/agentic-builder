# DDD / Subsystem Pipeline — PRD → Coding (Design)

> End-to-end design of the domain-driven (subsystem-split) path: how a large
> PRD is decomposed into business-domain subsystems and built domain-by-domain.
> Complements `docs/subsystem-build-design.md` (problem framing + the P3.x plan);
> this doc is the **current, code-referenced data/flow reference** including the
> recent additions: manifest persist + fallback (`4e9f80d`), the L3 functional
> audit judge (`231dbc7`), TRD subsystem/domain/scaffold awareness.

All references are `path:line` against the repo at time of writing.

---

## 0. TL;DR

```
PRD (tier-aware)
  │  ├─ extract PrdDomainSpec (entities/rules/workflows/…)  → prd.metadata.prdSpec, .blueprint/PRD_SPEC.json
  │  └─ (Prepare-PRD) decompose into business-domain subsystems → .blueprint/subsystems.json
  ▼
Eligibility gate (L-tier + ≥80 endpoints + ≥5 balanced domains)
  ▼
TRD (only when L)  ── consumes: subsystem manifest (§3 per domain) + PrdDomainSpec + scaffold inventory
  ▼
Kickoff → domain-scoped task breakdown
  │  foundation tasks (shared) + per-domain tasks (tagged subsystem=<id>), generated in dependency layers
  ▼
Build orchestration
  │  Phase 1: foundation built ONCE
  │  Phase 2: domains built in topological layers (dependsOn DAG), each = one /api/agents/coding call
  │           with retryFailedTaskIds = that domain's tasks, scoped via active-subsystem-scope.json
  │  Phase 3: cross-domain integration smoke gate (whole-app, scope cleared)
  ▼
Post-gen feature audit (L1 structural → L2 anchor → L3 functional LLM judge)
```

When the eligibility gate fails, **everything falls back to the single-pass
whole-system flow** — non-qualifying projects pay nothing.

---

## 1. Philosophy & invariants

- **Horizontal decomposition.** A "subsystem" is a **business domain** (auth,
  catalog, enrollment, …), not a layer. The PRD is never split into separate
  documents — only its *inventory* (routes / API endpoints / collections) is
  partitioned. The whole PRD stays the single source of truth.
- **Exclusive ownership.** Every route and endpoint belongs to exactly one
  subsystem (`decompose.ts:49` rule 2). Cross-domain access goes through
  documented contracts following `dependsOn`.
- **One foundation, many domains.** Scaffold + global data layer + frozen API
  contracts + app shell + shared UI are built **once**; domains then patch into
  that shared app (single `frontend/`, one router, one API client — see
  `docs/ddd-prd-to-coding-design.md` §6 scaffold).
- **Additive & reversible.** The subsystem path is gated so the default
  whole-system flow is untouched for projects that don't qualify.

Data structures: `src/lib/pipeline/subsystems/types.ts:21`
```ts
export interface Subsystem {
  id: string; name: string; description?: string;
  requirementIds?: string[];
  ownedRoutes: string[];        // frontend pages/routes
  ownedApiEndpoints: string[];  // "METHOD /api/..."
  ownedCollections: string[];   // db tables/collections
  ownedModules: string[];       // code module roots, e.g. backend/src/api/modules/enrollment
  dependsOn: string[];          // subsystem ids that must build first (DAG)
  prdSections: string[];
}
export interface SubsystemManifest { subsystems: Subsystem[]; generatedAt?: string; }
```
`PrdDomainSpec` (the structured domain facts): `src/lib/requirements/prd-spec-types.ts:70` — `entities`, `variables`, `rules`, `dataSources`, `schedules`, `workflows`, `alerts`.

---

## 2. Eligibility gates (when DDD kicks in)

Two-level gate so non-qualifying projects don't even pay for a decompose call.

**Gate 1 — cheap, no-LLM precheck.** `subsystem-aware-breakdown.ts:42`
```ts
export function isSubsystemSplitCandidate(prd, tier) {
  if (process.env.BLUEPRINT_SUBSYSTEM_BREAKDOWN === "0") return false;
  if (tier !== "L") return false;
  return extractPrdInventory(prd).apiEndpoints.length >= MIN_ENDPOINTS_FOR_SPLIT;
}
```

**Gate 2 — per-project decision** after one decompose. `split-decision.ts:58`
- `tier === "L"` (else skip)
- manifest valid (exclusive ownership, DAG acyclic)
- `endpoints ≥ 80` (`MIN_ENDPOINTS_FOR_SPLIT`)
- `domains ≥ 5` (`MIN_DOMAINS_FOR_SPLIT`)
- largest domain owns `< 40%` of endpoints (`MAX_DOMAIN_ENDPOINT_SHARE`) — rejects a fake split where one domain is the whole app.

Thresholds + env overrides (`split-decision.ts:23`, `:54`):
`BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS`, `BLUEPRINT_SUBSYSTEM_MIN_DOMAINS`,
`BLUEPRINT_SUBSYSTEM_MAX_DOMAIN_SHARE`.

> **Practical note (current M-tier issue):** because the gate is L-only and the
> classifier defaults to M, a project must be tier **L** for any of this to run.
> A manual tier override exists in the PRD UI (set S/M/L), which rewrites the
> `**Project Tier**` badge and re-gates downstream.

---

## 3. PRD stage

### 3.1 Tier-aware PRD generation
The classifier sets the tier (intent step). `PMAgent(tier)` writes the PRD with a
tier-specific prompt and injects a `> **Project Tier: X**` badge that is
**authoritative** for all downstream steps.

### 3.2 PrdDomainSpec extraction
After the PRD completes, the engine extracts the structured domain spec:
`engine.ts:1992` `attachPrdStructuredSpec` → `extractPrdSpec(prd.content)` →
attached to `run.steps.prd.metadata.prdSpec` and persisted to
`.blueprint/PRD_SPEC.json` (`engine.ts:1257`).

> **Fixed gotcha (`6c1397a`):** the client PRD-step SSE handler used to drop the
> step's `metadata`, so `prdSpec` never reached later steps on a standalone
> re-run. `createPipelineSseAgent` now persists step metadata
> (`pipeline-sse-helpers.ts`), so `prd.metadata.prdSpec` survives reload and
> feeds the TRD.

### 3.3 Decomposition (Prepare-PRD → subsystems)
`src/lib/pipeline/subsystems/`:
1. **Inventory** (`inventory.ts:26`): regex-extract API endpoints
   (`METHOD /api/...` from headings), routes, and collections from the PRD.
2. **LLM grouping** (`decompose.ts:49`): the decomposer prompt groups the
   inventory into `Subsystem[]` by business domain with exclusive ownership and
   a `dependsOn` DAG; "right-size — fewest domains that satisfy the rules".
3. **Validate + repair** (`decompose.ts:207`): validate exclusive ownership /
   acyclic DAG; up to 2 repair rounds that explicitly feed back UNASSIGNED
   routes/endpoints (`decompose.ts:166`).
4. **Domain requirement IDs** (`domain-requirements.ts:58`): map each domain's
   owned routes/endpoints back to PRD requirement IDs (`PAGE-*`, `API-*`) — the
   handle used to scope the per-domain task breakdown.

### 3.4 Manifest persistence + fallback (`4e9f80d`)
- Write: `manifest-io.ts:18` → `.blueprint/subsystems.json`. The Prepare-PRD
  decompose persists it here.
- Read: `manifest-io.ts:40` (null → whole-system mode).
- **Fallback safety net** (`subsystem-aware-breakdown.ts:87`): if the *live*
  decompose at kickoff fails the split gate (a one-off LLM hiccup), the engine
  reuses the **persisted** manifest from the PRD step instead of silently
  dropping a qualified project back to whole-system mode.

---

## 4. TRD stage (L-tier only)

The TRD agent is fed three authoritative context blocks
(`trd-agent.ts` `generateTRD`):

1. **Subsystem architecture** — `renderSubsystemArchitectureBlock(manifest)`
   (`trd-agent.ts:578`). The manifest is read from disk in the route
   (`parallel-generate/route.ts:321` → passed as the `subsystemManifest` arg).
   It forces §3.1 Services = one boundary per domain, §3.3 APIs grouped by
   owning domain, §3.2 tables grouped by owning domain, cross-domain calls per
   `dependsOn`, build order = the dependency graph.
2. **Domain spec** — `renderAuthoritativeDomainBlock(prdSpec.domain)`
   (`trd-agent.ts`): renders entities→§3.2+fixtures, variables→§3.2/§6,
   rules→§7, dataSources→§3 adapters/§4 secrets, schedules→§8 DAG,
   workflows→§3 FSMs, alerts→§3 notifications — verbatim, "do not invent".
3. **Scaffold foundation** — `renderScaffoldFoundationBlock(tier)`
   (`trd-scaffold-block.ts`): tells the architect what the per-tier scaffold
   already ships (stack, HTTP client, auth/JWT utils, DB wiring, middlewares,
   Docker; L adds logger/rate-limit/queue/workers) and to **not re-specify or
   duplicate** it — only design what's project-specific and missing.

Net effect: the TRD reflects the domain decomposition + domain logic and builds
**on** the scaffold rather than re-inventing infrastructure.

---

## 5. Domain-scoped task breakdown

`domain-breakdown.ts` `runDomainScopedBreakdown` (`:88`):

1. Run a full breakdown once, keep only **foundation tasks** — phases
   `Scaffolding / Data Layer / Integration / Infrastructure` (`:28`) plus
   frontend shell/tokens/router/ui (`FOUNDATION_FILE_RE`, `:43`) and shared
   frontend titles (`FOUNDATION_TITLE_RE`).
2. For each **dependency layer** (topological from `dependsOn`), run a *scoped*
   incremental breakdown per domain with `requirementsToCover = that domain's
   requirement ids`, passing the already-accumulated tasks so IDs/files don't
   collide. Tag every produced task `subsystem = domainId` (`:120`).
3. Accumulate across layers → one task list where each task is either shared
   (foundation, no `subsystem`) or owned by exactly one domain.

`subsystem-aware-breakdown.ts` is the entry point the kickoff calls instead of
the plain breakdown; it returns the **same shape** plus a `subsystem` extra
(manifest + build layers) so the engine is unchanged when a project doesn't
qualify.

---

## 6. Build orchestration

`orchestrate.ts` + `coding-runner.ts` + `develop.ts`:

1. **Plan** (`orchestrate.ts:148` `planSubsystemBuilds`): assign tasks to
   subsystems, compute topological **layers**, and per step compute
   `scopeEndpoints` = the domain's endpoints **plus its transitive deps'**
   endpoints (a domain may call what it depends on).
2. **Phase 1 — foundation**: built once before any domain.
3. **Phase 2 — domains in layers** (`orchestrate.ts:217` `runSubsystemBuilds`):
   each layer runs its domains **concurrently**; `stopOnFailure` aborts
   dependents if a domain in a layer fails. Resumable via
   `.blueprint/subsystems-progress.json` (`progress-io.ts`), so completed
   domains are skipped on re-run.
4. **Each domain = one coding call** (`coding-runner.ts:130` `makeHttpCodingRunner`):
   - writes `.blueprint/active-subsystem-scope.json` (the domain's scoped
     endpoints) so the coding-side gates validate only this domain's surface;
   - `POST /api/agents/coding` with `retryFailedTaskIds = step.taskIds`
     (`coding-runner.ts:59`) — the existing subset mechanism runs ONLY that
     domain's tasks against the shared, already-built foundation;
   - reads the session checkpoint for a pass/fail verdict.

### Active scope (`active-scope.ts`)
A sidecar `.blueprint/active-subsystem-scope.json` (`active-scope.ts:18`) lists
the endpoints the current domain build is allowed to "see". Coding-side
contract/route gates filter to this set (`filterEndpointsToScope`, `:99`) using
a param-normalized match key (`endpointMatchKey`, `:35`), so a domain build
isn't failed for not-yet-built domains' endpoints.

> This is also why the **flow-navigation wiring audit** is skipped during a
> scoped per-domain build (`scopedBuild` guard) — not-yet-built domains' routes
> aren't registered yet; cross-domain nav is validated at integration time.

---

## 7. Cross-domain integration gate (Phase 3 / `4e9f80d`)

`integrate.ts:48` `runCrossDomainIntegration` (after all domains pass):
- **clears** the active scope (restore whole-app validation),
- runs the runtime smoke gate over the **whole** app,
- returns findings; `develop.ts:140` folds the result into the final verdict
  (`finalOk = allOk && (!integration.ran || integration.ok)`).
- Toggle: `BLUEPRINT_SUBSYSTEM_INTEGRATE=0` skips it.

This catches the cross-domain breakage the per-domain scoped builds intentionally
ignore (e.g. domain A navigating to a route that domain B owns).

---

## 8. Post-generation feature audit (L1 → L2 → L3)

`feature-checklist-audit.ts` proves requirements are actually implemented:
- **L1 structural**: each covered requirement id has ≥1 generated file.
- **L2 anchor**: textual anchor (id / page / component name) found in the source.
  No anchor → `partial`.
- **L3 functional judge** (`231dbc7`): `feature-audit-judge.ts` `judgeFeatureEntries`
  reads the covering tasks' **actual code** and upgrades each `partial` to a real
  verdict — `implemented` | `wiring` (control exists but inert) | `missing` —
  with a `category` (`coverage` | `wiring`) and file:line evidence. Strict
  prompt ("a mere import/string/comment is NOT implementation"; "when in doubt
  between implemented and wiring, choose wiring"). Plugged in at
  `feature-checklist-audit.ts:238`; verdict mutation + `audit_l3_judged` event at
  `:291`. Gated by `FEATURE_AUDIT_L3`; model `MODEL_CONFIG.featureAuditJudge`.

Findings flow into the existing audit-repair dispatch; `wiring`-category
findings route to the scoped wiring-repair worker (see the feature-coherence
work in `docs/feature-coherence-plan.md`).

---

## 9. Artifact catalog (`.blueprint/`)

| File | Producer | Consumer |
|---|---|---|
| `PRD_SPEC.json` | engine `attachPrdStructuredSpec` | TRD domain block, gates |
| `subsystems.json` | Prepare-PRD decompose / kickoff | TRD §3, task breakdown, build orchestration |
| `active-subsystem-scope.json` | per-domain coding runner | coding-side contract/route gates |
| `subsystems-progress.json` | `recordSubsystemResult` | resume (skip completed domains) |
| `auth-decision.json` | auth step | TRD §1/§4 auth contract |

---

## 10. Config / env switches

| Env | Effect |
|---|---|
| `BLUEPRINT_SUBSYSTEM_BREAKDOWN=0` | disable subsystem split entirely (force whole-system) |
| `BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS` | override the 80-endpoint gate |
| `BLUEPRINT_SUBSYSTEM_MIN_DOMAINS` | override the 5-domain gate |
| `BLUEPRINT_SUBSYSTEM_MAX_DOMAIN_SHARE` | override the 40% balance gate |
| `BLUEPRINT_SUBSYSTEM_INTEGRATE=0` | skip the Phase-3 cross-domain smoke gate |
| `FEATURE_AUDIT_L3` | enable the L3 functional judge |

---

## 11. UI surfaces

- **Prepare-PRD** drawer: `PrdReadinessPanel.tsx` — two sequential steps,
  Validate PRD → Split Subsystems (Step 2 locked until Step 1; persisted).
- **Subsystem panel**: `PrdSubsystemPanel.tsx` — decompose button; shows
  validation, cost, build-layer order, and expandable per-domain cards
  (endpoints / routes / collections / modules / deps).
- **Tier selector**: PRD header S/M/L control (rewrites the tier badge + DB) —
  the manual override that unlocks the L-only DDD path.

---

## 12. Known gaps / follow-ups

- **L-only gate vs M mis-classification.** The classifier defaults to M; many
  genuinely-complex projects need a manual tier bump to reach the DDD path.
  Consider relaxing the M→L criteria or auto-detecting multi-domain signals.
- **TRD ⇄ task-breakdown alignment.** Both now consume the manifest, but they
  derive domains independently from the PRD; a shared domain resolution would
  remove drift.
- **Foundation completeness.** Per-domain builds assume the foundation already
  shipped shared contracts/shell; weak foundation → cross-domain integration
  failures surface only at Phase 3.
- Pre-existing build errors on `main` unrelated to this pipeline
  (`cover/route.ts` `updateProjectCover`, missing `SkillsTracePanel`) should be
  fixed by their authors.

---

*See also: `docs/subsystem-build-design.md` (problem framing + P3.x plan),
`docs/feature-coherence-plan.md` (wiring audit + L3 repair), `docs/prd-codegen-outcome-attribution-plan.md`.*
