# Auto Deploy Pipeline Design

**Date:** 2026-05-08
**Status:** Approved (v3 — reuses existing GitHub/push infrastructure)

## Overview

After code generation completes, automatically push the generated application to GitHub and deploy it via Dokploy. Progress is streamed to the pipeline-ui in real time via Server-Sent Events.

Each generated app includes a `docker-compose.yml` that defines all its services. Dokploy deploys it as a Compose project. All generated apps share one PostgreSQL container on the Dokploy server; each app gets its own database within that instance.

## Existing Infrastructure (reused)

The codebase already has a partial GitHub push pipeline built during the kickoff phase:

| File | What it does |
|------|-------------|
| `src/lib/pipeline/kickoff-integrations.ts` | Creates a GitHub repo via REST API during kickoff; saves metadata to `.blueprint/kickoff-repo.json` |
| `src/lib/pipeline/push-kickoff-repo.ts` | Pushes generated code to the kickoff repo (clone → copy → commit → push) |
| `src/app/api/agents/push-generated-code/route.ts` | API endpoint wrapping the above push logic |
| `src/components/kickoff/PushGeneratedCodeSection.tsx` | Manual "Push" button UI in the coding stage |

**Key implication:** The GitHub repo is created during kickoff, not at deploy time. The deploy pipeline reads `.blueprint/kickoff-repo.json` to get the repo URL and reuses `pushGeneratedCodeToKickoffRepo()` for the push step.

## Scope

- Triggered after code generation finishes (no tier distinction at deploy time)
- GitHub repo already created during kickoff phase — deploy pipeline reuses it
- One Dokploy Compose Project per generated app
- Shared PostgreSQL container on Dokploy; one database per app
- Builder itself is not deployed — only the generated output

## Environment Variables

```
GITHUB_TOKEN=...                   # also used as PROJECT_KICKOFF_GITHUB_TOKEN
DOKPLOY_URL=https://...            # Running Dokploy instance base URL
DOKPLOY_TOKEN=...
SHARED_PG_CONNECTION_STRING=...    # Admin connection to shared PostgreSQL instance
```

## Overall Flow

```
User clicks "Deploy"
      │
      ▼
POST /api/deploy              ← returns { jobId } immediately
      │
      ▼
Background Deploy Job
  Step 1: Verify kickoff repo exists (.blueprint/kickoff-repo.json)
  Step 2: Push generated code → reuse pushGeneratedCodeToKickoffRepo()
  Step 3: Create database in shared PostgreSQL (CREATE DATABASE <appName>)
  Step 4: Create Dokploy Compose Project, set GitHub repo as source
  Step 5: Inject DATABASE_URL env var into Dokploy project
  Step 6: Trigger first deploy
  Step 7: Poll deploy status until done or error
      │
      ▼
GET /api/deploy/[jobId]/stream  ← SSE, frontend receives step updates
      │
      ▼
pipeline-ui shows step progress + final deploy URL
```

## API Layer

### Endpoints

```
POST  /api/deploy                   # Start deployment, returns { jobId }
GET   /api/deploy/[jobId]/stream    # SSE stream of step events
GET   /api/deploy/[jobId]           # Query final status (polling fallback)
```

### POST /api/deploy Request Body

```ts
{
  appName: string            // used as Dokploy project name and DB name
  generatedCodePath: string  // relative path to the generated app directory (e.g. "generated-code")
}
```

`appName` is derived from the project name; GitHub repo name comes from `.blueprint/kickoff-repo.json`.

### SSE Event Format

```json
{ "step": "verify-repo",     "status": "running", "message": "Verifying GitHub repository..." }
{ "step": "verify-repo",     "status": "done",    "message": "Repository confirmed: github.com/owner/app" }
{ "step": "git-push",        "status": "running", "message": "Pushing generated code..." }
{ "step": "git-push",        "status": "done",    "message": "Code pushed" }
{ "step": "create-database", "status": "running", "message": "Creating database..." }
{ "step": "create-database", "status": "done",    "message": "Database ready" }
{ "step": "create-dokploy",  "status": "running", "message": "Creating Dokploy project..." }
{ "step": "create-dokploy",  "status": "done",    "message": "Project created" }
{ "step": "trigger-deploy",  "status": "running", "message": "Deploying..." }
{ "step": "trigger-deploy",  "status": "done",    "message": "Deploy complete", "url": "https://app.example.com" }
{ "step": "trigger-deploy",  "status": "error",   "message": "Deploy failed: ..." }
```

### In-Memory Job Manager

No Redis required. Jobs live in process memory; acceptable since the builder is single-user.

```ts
// src/lib/deploy/job-manager.ts
interface DeployJob {
  id: string
  status: 'running' | 'done' | 'error'
  steps: StepResult[]
  url?: string
  subscribers: Set<ReadableStreamDefaultController>
}

const jobs = new Map<string, DeployJob>()
```

On each step transition, all SSE subscribers are notified. A reconnecting client can recover history from `GET /api/deploy/[jobId]`.

## Scaffold: docker-compose.yml

Each generated app must include a `docker-compose.yml`. The scaffold templates provide this file. Example for a frontend + backend app:

```yaml
services:
  backend:
    build: ./backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
    ports:
      - "3001:3001"
  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: ${VITE_API_URL}
    ports:
      - "3000:3000"
```

`DATABASE_URL` is left as an env var placeholder — the builder injects the real value via Dokploy API before triggering deploy. For frontend-only apps, the compose file has a single service with no `DATABASE_URL`.

## GitHub Integration

**No new GitHub code needed.** The deploy pipeline calls existing functions:

- `readKickoffRepoMetadata(projectRoot)` — reads `.blueprint/kickoff-repo.json`
- `pushGeneratedCodeToKickoffRepo({ projectRoot, codeOutputDir, token })` — handles clone/copy/commit/push

Both are already exported from `src/lib/pipeline/push-kickoff-repo.ts`.

## Database Integration

File: `src/lib/deploy/database.ts` *(new)*

- Connect to the shared PostgreSQL instance via `SHARED_PG_CONNECTION_STRING`
- Run `CREATE DATABASE "<appName>"` (sanitized — lowercase, alphanumeric + hyphens only)
- Return the per-app connection string to inject into Dokploy

The shared PostgreSQL container is created once manually in Dokploy and reused across all generated apps.

## Dokploy Integration

File: `src/lib/deploy/dokploy.ts` *(new)*

Dokploy API call sequence per generated app:

1. `POST /api/compose.create` — create a Compose project → `{ composeId }`
2. `POST /api/compose.update` — set `repository`, `branch: "main"`, `composeType: "docker-compose"`
3. `POST /api/compose.update` — inject env vars (`DATABASE_URL`, etc.)
4. `POST /api/compose.deploy` — trigger first deploy
5. `GET /api/compose.one` — poll every 3 s, timeout 5 min → returns deploy status + URL

**Private repo access:** Dokploy must have a GitHub token configured to pull private repos. One-time setup on the Dokploy server — not handled by the builder at runtime.

## UI Integration

The existing `PushGeneratedCodeSection` manual button is **kept as-is** — it remains useful for pushing code without triggering a full deployment. The new automated deploy flow is a separate action alongside it.

Frontend connects to SSE after receiving `jobId`:

```ts
const source = new EventSource(`/api/deploy/${jobId}/stream`)
source.onmessage = (e) => updatePipelineStep(JSON.parse(e.data))
```

### Step Display

```
✓ Generate code           done
⟳ Verify GitHub repo      running...
○ Push code               pending
○ Create database         pending
○ Create Dokploy project  pending
○ Deploy                  pending
○ Wait for deploy         pending
```

### Completion State

- Clickable app URL
- GitHub repository link
- Dokploy console link (for logs)

### Error State

- Failed step highlighted with error message
- "Retry" button re-posts to `POST /api/deploy` with same `appName`

## File Structure

```
src/
  app/api/deploy/
    route.ts                    # POST — start job
    [jobId]/
      route.ts                  # GET — status
      stream/route.ts           # GET — SSE stream
  lib/deploy/
    job-manager.ts              # In-memory job state + SSE fanout
    database.ts                 # Create per-app database in shared PostgreSQL
    dokploy.ts                  # Dokploy Compose API client
    pipeline.ts                 # Orchestrates steps, emits events; reuses push-kickoff-repo
    types.ts                    # Shared types (Step, StepStatus, DeployJob)

# Reused (no changes needed):
src/lib/pipeline/push-kickoff-repo.ts
src/lib/pipeline/kickoff-integrations.ts
```
