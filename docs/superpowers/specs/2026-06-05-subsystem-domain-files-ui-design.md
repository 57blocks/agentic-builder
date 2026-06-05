# Subsystem Domain Files + Split Subsystems UI Redesign

**Date:** 2026-06-05  
**Branch:** prd-enhance  
**Status:** Approved

---

## Overview

Two related improvements to the Step 2 · Split Subsystems flow:

1. **Domain md files** — After decompose runs, write a `domain-{id}.md` file per subsystem to the same output directory as `PRD.md`. Each file contains the domain's metadata summary plus the actual PRD sections it owns.
2. **UI redesign** — Replace the flat accordion list in `PrdSubsystemPanel.tsx` with a build-layer-grouped card grid that shows key metrics inline.

---

## Part 1 · Domain md File Generation

### Where the change lives

`src/app/api/agents/pipeline/prd-subsystem-decompose/route.ts`

The route already writes `subsystems.json` via `writeSubsystemManifest`. Domain files are written in the same block, immediately after.

### PRD section extraction

Function: `extractPrdSections(prd: string, sectionRefs: string[]): string`

- Parse each ref (`"§10.4"`) to extract the numeric anchor (`"10.4"`).
- Scan PRD line-by-line; detect ATX headings (`#`–`######`).
- When a heading line contains the anchor string, capture it and all following lines until a heading at the same or higher level is encountered.
- Multiple matched sections are joined with `\n\n---\n\n`.
- If a ref matches no heading, it is silently skipped (PRDs don't always carry section numbers).

### Domain md content template

Filename: `domain-{id}.md` — saved to `outRoot` (same directory as `PRD.md`).

```markdown
# {name}

> {description}

**Domain ID:** `{id}` | **Build Layer:** L{n} | **Depends on:** {comma-separated dep names, or "None"}

## Owned Resources

### API Endpoints ({n})
- `GET /api/v1/resource`
- ...

### Routes ({n})
- `/some/path`
- ...

### Data Collections ({n})
- `collection_name`
- ...

### Modules
- `backend/src/api/modules/...`
- ...

## PRD Sections

{extracted PRD content for this domain's prdSections}
```

If `prdSections` is empty or no headings match, the `## PRD Sections` block reads:
```
_No specific PRD sections referenced._
```

### Build layer index

The route already computes `buildLayers` (array of arrays of subsystem ids) from validation. To find a subsystem's layer index: iterate `buildLayers` and find the first layer containing the subsystem's id.

### API response change

Add `domainFilesSaved: boolean` to the response JSON. `true` when `manifestSaved` is true and at least one domain file was written without error. Individual write errors are non-fatal — logged to `console.error`, not thrown.

### File structure after run

```
{codeOutputDir}/
  PRD.md
  .blueprint/
    subsystems.json
  domain-auth-accounts.md
  domain-enrollment.md
  domain-billing.md
  ...
```

---

## Part 2 · PrdSubsystemPanel UI Redesign

### Where the change lives

`src/app/(dashboard)/project/[projectId]/_steps/preparation/core-docs/prd/PrdSubsystemPanel.tsx`

### Stats bar (always visible)

Replaces the current `"{n} lines · {n} sections"` + button row.

**Before run:**
```
[Boxes icon]   {lines} lines · {h2} sections                    [Decompose Subsystems]
```

**After run (success):**
```
[CheckCircle]  {N} domains · {N} layers · {totalEp} endpoints · {totalRt} routes · {totalCol} collections
               domain files saved                                [Re-decompose]
```

- `totalEp / totalRt / totalCol` are sums across all subsystems.
- `domain files saved` appears as a small green badge when `resp.domainFilesSaved` is true.
- Cost + fallback warning remain on the right (`$0.012 · ⚠ fallback`).

### Build layer groups

Replace the existing `buildLayers` text display and the flat accordion list with layer-grouped sections.

**Structure:**
```
┌── LAYER 0 · Foundation  (N domains) ─────────────────┐  ← violet-50 bg, violet-200 border
│  [DomainCard]  [DomainCard]                           │  ← 2-column grid
└───────────────────────────────────────────────────────┘
         [ChevronDown icon — centered, slate-300]
┌── LAYER 1  (N domains) ───────────────────────────────┐
│  [DomainCard]  [DomainCard]  [DomainCard]             │
└───────────────────────────────────────────────────────┘
         [ChevronDown icon]
...
```

- **Layer 0** heading reads `LAYER 0 · Foundation`; all others read `LAYER {n}`.
- Each layer block has a subtle background (`bg-violet-50/40`) and border (`border-violet-100`).
- Domains not found in any build layer (edge case) are grouped under `UNGROUPED`.

### Domain card

Each `SubsystemView` renders as a card inside its layer grid.

**Collapsed (default):**
```
┌────────────────────────────────────────┐
│ Auth & Accounts              [chevron] │  ← name semibold + expand icon
│ User auth, sessions, tokens…           │  ← description truncated ~60 chars, text-slate-500
│                                        │
│ [8 EP] [4 RT] [3 Col]  ↑ core-data   │  ← metric badges + depends-on chips
└────────────────────────────────────────┘
```

- **Metric badges**: `{n} EP`, `{n} RT`, `{n} Col` — small rounded tags, `bg-slate-100 text-slate-600 text-[10px]`.
- **Depends-on chips**: `↑ {dep-name}` per dependency — `bg-violet-50 text-violet-700 text-[10px]` rounded pill.
- When `endpoints === 0 && routes === 0 && collections === 0` — show `no resources` in muted text instead of three `0` badges.

**Expanded (click to toggle):**
Inline expansion below the card header (no new panel). Shows:

```
├ Endpoints (8)
│   GET /api/v1/users  POST /api/v1/sessions  …
├ Routes (4)
│   /login  /register  /account/settings  …
├ Collections (3)
│   users  sessions  oauth_tokens
├ Modules
│   backend/src/api/modules/auth  frontend/src/pages/auth
└ PRD Sections:  §3.1  §3.2  §4.0
```

All lists use `font-mono text-[11px]`. PRD section refs are displayed as small violet badges.

### Errors / warnings

Displayed in a collapsible alert box between the stats bar and the layer groups. Only rendered when `resp.errors.length > 0`.

### Notes

Unchanged — remain at the bottom in `text-[11px] text-slate-500`.

### No longer needed

- The separate `buildLayers` text row (`L0: … → L1: …`) is removed — replaced by the grouped layout.
- The `manifestSaved + manifestPath` text is removed — subsumed into the stats bar.

---

## Data flow

```
User clicks "Decompose Subsystems"
  → POST /api/agents/pipeline/prd-subsystem-decompose { prd, codeOutputDir }
      → decomposePrdIntoSubsystems(prd)
      → writeSubsystemManifest(outRoot, manifest)        // existing
      → writeDomainFiles(outRoot, manifest, prd)         // NEW
          → for each subsystem:
              extractPrdSections(prd, s.prdSections)
              buildDomainMd(s, manifest, layerIndex, sections)
              fs.writeFile(`${outRoot}/domain-${s.id}.md`, content)
      → return { ...existing, domainFilesSaved: true }
  → PrdSubsystemPanel receives response
  → renders layer-grouped card grid
  → savePrdReadiness(projectSlug, { subsystemResult, subsystemDone, qualityDone })
```

---

## Files changed

| File | Change |
|---|---|
| `src/app/api/agents/pipeline/prd-subsystem-decompose/route.ts` | Add `writeDomainFiles`, `extractPrdSections`, `buildDomainMd` helpers; call after manifest write; add `domainFilesSaved` to response |
| `src/app/(dashboard)/project/[projectId]/_steps/preparation/core-docs/prd/PrdSubsystemPanel.tsx` | Full UI rewrite — stats bar, layer groups, domain cards |

No other files require changes.

---

## Edge cases

| Scenario | Handling |
|---|---|
| `codeOutputDir` is undefined | Skip domain file writes (same condition as `writeSubsystemManifest`) |
| `prdSections` is empty | PRD Sections block shows `_No specific PRD sections referenced._` |
| Section ref doesn't match any heading | Section silently skipped |
| Domain write fails | `console.error`, continue with other domains; `domainFilesSaved: false` |
| Single build layer | No chevron separator rendered (nothing to separate) |
| Domain not in any build layer | Placed in `UNGROUPED` section |
| `initialResult` hydration on revisit | Layer-grouped UI reconstructs from stored `subsystemResult` — same data shape |
