# Auto Deploy Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After code generation, automatically push generated code to GitHub and deploy it to Dokploy as a Docker Compose project with a dedicated PostgreSQL database, streaming step-by-step progress to the UI via SSE.

**Architecture:** A `POST /api/deploy` endpoint spawns a background job (in-memory `Map`); the pipeline calls existing `pushGeneratedCodeToKickoffRepo()` for the git push step, then creates a per-app database in a shared PostgreSQL instance, and finally creates/deploys a Dokploy Compose project. A `GET /api/deploy/[jobId]/stream` SSE endpoint fans out progress events to the UI in real time.

**Tech Stack:** Next.js App Router route handlers, TypeScript, `pg` (already installed), Dokploy REST API, SSE via `ReadableStream`, Vitest with `vi.mock`, existing `src/lib/pipeline/push-kickoff-repo.ts`

---

## File Map

**New files:**
- `src/lib/deploy/types.ts` — DeployStep, StepStatus, DeployJob, DeployRequest
- `src/lib/deploy/job-manager.ts` — in-memory job state + SSE subscriber fanout
- `src/lib/deploy/database.ts` — creates per-app database in shared PostgreSQL
- `src/lib/deploy/dokploy.ts` — Dokploy Compose REST API client
- `src/lib/deploy/pipeline.ts` — step orchestrator
- `src/lib/deploy/__tests__/job-manager.test.ts`
- `src/lib/deploy/__tests__/database.test.ts`
- `src/lib/deploy/__tests__/dokploy.test.ts`
- `src/lib/deploy/__tests__/pipeline.test.ts`
- `src/app/api/deploy/route.ts` — POST: start deploy job
- `src/app/api/deploy/[jobId]/route.ts` — GET: job status
- `src/app/api/deploy/[jobId]/stream/route.ts` — GET: SSE stream
- `src/components/kickoff/DeploySection.tsx` — deploy UI panel
- `scaffolds/m-tier/docker-compose.yml`
- `scaffolds/m-tier/backend/Dockerfile`
- `scaffolds/m-tier/frontend/Dockerfile`
- `scaffolds/m-tier/frontend/nginx.conf`
- `scaffolds/s-tier/docker-compose.yml`
- `scaffolds/s-tier/Dockerfile`
- `scaffolds/s-tier/nginx.conf`

**Modified files:**
- `src/components/kickoff/KickoffSummaryView.tsx` — add `<DeploySection />`

---

## Task 1: Shared Types

**Files:**
- Create: `src/lib/deploy/types.ts`

- [ ] **Step 1: Create types file**

```ts
// src/lib/deploy/types.ts

export type StepStatus = "pending" | "running" | "done" | "error";

export type StepId =
  | "verify-repo"
  | "git-push"
  | "create-database"
  | "create-dokploy"
  | "trigger-deploy";

export interface StepResult {
  step: StepId;
  status: StepStatus;
  message: string;
  url?: string;
}

export interface DeployJob {
  id: string;
  status: "running" | "done" | "error";
  steps: StepResult[];
  url?: string;
  repoUrl?: string;
  subscribers: Set<ReadableStreamDefaultController<Uint8Array>>;
}

export interface DeployRequest {
  appName: string;
  generatedCodePath: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/deploy/types.ts
git commit -m "feat(deploy): add shared types"
```

---

## Task 2: Job Manager

**Files:**
- Create: `src/lib/deploy/job-manager.ts`
- Create: `src/lib/deploy/__tests__/job-manager.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/deploy/__tests__/job-manager.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createJob, getJob, emitStep, completeJob, failJob } from "../job-manager";
import type { StepResult } from "../types";

beforeEach(() => {
  // Reset module-level state between tests by re-importing
  // (job-manager uses a module-level Map)
});

describe("createJob", () => {
  it("creates a job with running status and empty steps", () => {
    const job = createJob();
    expect(job.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(job.status).toBe("running");
    expect(job.steps).toEqual([]);
    expect(job.subscribers.size).toBe(0);
  });
});

describe("getJob", () => {
  it("returns the job by id", () => {
    const job = createJob();
    expect(getJob(job.id)).toBe(job);
  });

  it("returns undefined for unknown id", () => {
    expect(getJob("nonexistent")).toBeUndefined();
  });
});

describe("emitStep", () => {
  it("appends step to job.steps", () => {
    const job = createJob();
    const step: StepResult = { step: "git-push", status: "done", message: "Pushed" };
    emitStep(job.id, step);
    expect(getJob(job.id)!.steps).toHaveLength(1);
    expect(getJob(job.id)!.steps[0]).toEqual(step);
  });

  it("updates existing step if same stepId is emitted again", () => {
    const job = createJob();
    emitStep(job.id, { step: "git-push", status: "running", message: "Pushing..." });
    emitStep(job.id, { step: "git-push", status: "done", message: "Done" });
    const steps = getJob(job.id)!.steps;
    expect(steps).toHaveLength(1);
    expect(steps[0].status).toBe("done");
  });
});

describe("completeJob / failJob", () => {
  it("sets status to done and records url", () => {
    const job = createJob();
    completeJob(job.id, "https://app.example.com", "https://github.com/owner/app");
    expect(getJob(job.id)!.status).toBe("done");
    expect(getJob(job.id)!.url).toBe("https://app.example.com");
    expect(getJob(job.id)!.repoUrl).toBe("https://github.com/owner/app");
  });

  it("sets status to error", () => {
    const job = createJob();
    failJob(job.id);
    expect(getJob(job.id)!.status).toBe("error");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/deploy/__tests__/job-manager.test.ts
```

Expected: FAIL — `Cannot find module '../job-manager'`

- [ ] **Step 3: Implement job-manager**

```ts
// src/lib/deploy/job-manager.ts
import { randomUUID } from "crypto";
import type { DeployJob, StepResult, StepId } from "./types";

const jobs = new Map<string, DeployJob>();

export function createJob(): DeployJob {
  const job: DeployJob = {
    id: randomUUID(),
    status: "running",
    steps: [],
    subscribers: new Set(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): DeployJob | undefined {
  return jobs.get(id);
}

export function emitStep(jobId: string, step: StepResult): void {
  const job = jobs.get(jobId);
  if (!job) return;

  const existing = job.steps.findIndex((s) => s.step === step.step);
  if (existing >= 0) {
    job.steps[existing] = step;
  } else {
    job.steps.push(step);
  }

  const data = `data: ${JSON.stringify(step)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  for (const controller of job.subscribers) {
    try {
      controller.enqueue(encoded);
    } catch {
      job.subscribers.delete(controller);
    }
  }
}

export function completeJob(jobId: string, url: string, repoUrl: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "done";
  job.url = url;
  job.repoUrl = repoUrl;
  closeSubscribers(job);
}

export function failJob(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "error";
  closeSubscribers(job);
}

function closeSubscribers(job: DeployJob): void {
  for (const controller of job.subscribers) {
    try {
      controller.close();
    } catch {
      // already closed
    }
  }
  job.subscribers.clear();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/deploy/__tests__/job-manager.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/deploy/job-manager.ts src/lib/deploy/__tests__/job-manager.test.ts
git commit -m "feat(deploy): add in-memory job manager with SSE fanout"
```

---

## Task 3: Database Module

**Files:**
- Create: `src/lib/deploy/database.ts`
- Create: `src/lib/deploy/__tests__/database.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/deploy/__tests__/database.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pg before importing the module under test
vi.mock("pg", () => {
  const Client = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn().mockResolvedValue(undefined),
  }));
  return { Client };
});

import { Client } from "pg";
import { createAppDatabase, sanitizeDbName } from "../database";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sanitizeDbName", () => {
  it("lowercases and replaces non-alphanumeric with underscore", () => {
    expect(sanitizeDbName("My Cool App!")).toBe("my_cool_app_");
  });

  it("truncates to 63 chars (PostgreSQL identifier limit)", () => {
    expect(sanitizeDbName("a".repeat(100))).toHaveLength(63);
  });

  it("prepends 'app_' if starts with a digit", () => {
    expect(sanitizeDbName("123abc")).toBe("app_123abc");
  });
});

describe("createAppDatabase", () => {
  it("connects, runs CREATE DATABASE, and returns connection string", async () => {
    const mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(Client).mockImplementationOnce(() => mockClient as never);

    const result = await createAppDatabase({
      connectionString: "postgresql://user:pass@host:5432/postgres",
      appName: "my-app",
    });

    expect(mockClient.connect).toHaveBeenCalledOnce();
    expect(mockClient.query).toHaveBeenCalledWith(
      'CREATE DATABASE "my_app"'
    );
    expect(mockClient.end).toHaveBeenCalledOnce();
    expect(result).toBe("postgresql://user:pass@host:5432/my_app");
  });

  it("does not throw if database already exists (duplicate_database error)", async () => {
    const mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockRejectedValueOnce(
        Object.assign(new Error("already exists"), { code: "42P04" })
      ),
      end: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(Client).mockImplementationOnce(() => mockClient as never);

    await expect(
      createAppDatabase({
        connectionString: "postgresql://user:pass@host:5432/postgres",
        appName: "my-app",
      })
    ).resolves.toBe("postgresql://user:pass@host:5432/my_app");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/deploy/__tests__/database.test.ts
```

Expected: FAIL — `Cannot find module '../database'`

- [ ] **Step 3: Implement database module**

```ts
// src/lib/deploy/database.ts
import { Client } from "pg";

export function sanitizeDbName(name: string): string {
  let sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 63);
  if (/^[0-9]/.test(sanitized)) sanitized = `app_${sanitized}`.slice(0, 63);
  return sanitized;
}

export async function createAppDatabase(params: {
  connectionString: string;
  appName: string;
}): Promise<string> {
  const dbName = sanitizeDbName(params.appName);
  const client = new Client({ connectionString: params.connectionString });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code !== "42P04") throw err; // 42P04 = duplicate_database, safe to ignore
  } finally {
    await client.end();
  }

  // Replace database name in connection string
  const url = new URL(params.connectionString);
  url.pathname = `/${dbName}`;
  return url.toString();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/deploy/__tests__/database.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/deploy/database.ts src/lib/deploy/__tests__/database.test.ts
git commit -m "feat(deploy): add database module for per-app PostgreSQL creation"
```

---

## Task 4: Dokploy Client

**Files:**
- Create: `src/lib/deploy/dokploy.ts`
- Create: `src/lib/deploy/__tests__/dokploy.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/deploy/__tests__/dokploy.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  createDokployProject,
  createDokployCompose,
  updateDokployCompose,
  deployDokployCompose,
  pollDeployStatus,
} from "../dokploy";

const BASE = "https://dokploy.example.com";
const TOKEN = "test-token";

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDokployProject", () => {
  it("posts to /api/project.create and returns projectId", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ projectId: "proj-1" }));
    const id = await createDokployProject({ baseUrl: BASE, token: TOKEN, name: "my-app" });
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/api/project.create`,
      expect.objectContaining({ method: "POST" })
    );
    expect(id).toBe("proj-1");
  });
});

describe("createDokployCompose", () => {
  it("posts to /api/compose.create and returns composeId", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ composeId: "comp-1" }));
    const id = await createDokployCompose({ baseUrl: BASE, token: TOKEN, name: "my-app", projectId: "proj-1" });
    expect(id).toBe("comp-1");
  });
});

describe("updateDokployCompose", () => {
  it("posts to /api/compose.update with all fields", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}));
    await updateDokployCompose({
      baseUrl: BASE,
      token: TOKEN,
      composeId: "comp-1",
      repository: "https://github.com/owner/app",
      branch: "main",
      env: "DATABASE_URL=postgresql://...\n",
    });
    const body = JSON.parse(vi.mocked(mockFetch).mock.calls[0][1]!.body as string);
    expect(body.composeId).toBe("comp-1");
    expect(body.repository).toBe("https://github.com/owner/app");
    expect(body.env).toContain("DATABASE_URL");
  });
});

describe("deployDokployCompose", () => {
  it("posts to /api/compose.deploy", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}));
    await deployDokployCompose({ baseUrl: BASE, token: TOKEN, composeId: "comp-1" });
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/api/compose.deploy`,
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("pollDeployStatus", () => {
  it("resolves with url when composeStatus becomes done", async () => {
    mockFetch
      .mockReturnValueOnce(jsonResponse({ composeStatus: "running", domains: [] }))
      .mockReturnValueOnce(jsonResponse({ composeStatus: "done", domains: [{ host: "app.example.com", https: true }] }));

    const url = await pollDeployStatus({
      baseUrl: BASE,
      token: TOKEN,
      composeId: "comp-1",
      intervalMs: 10,
      timeoutMs: 5000,
    });
    expect(url).toBe("https://app.example.com");
  });

  it("rejects when composeStatus is error", async () => {
    mockFetch.mockReturnValue(jsonResponse({ composeStatus: "error", domains: [] }));
    await expect(
      pollDeployStatus({ baseUrl: BASE, token: TOKEN, composeId: "comp-1", intervalMs: 10, timeoutMs: 500 })
    ).rejects.toThrow("Dokploy deploy failed");
  });

  it("rejects on timeout", async () => {
    mockFetch.mockReturnValue(jsonResponse({ composeStatus: "running", domains: [] }));
    await expect(
      pollDeployStatus({ baseUrl: BASE, token: TOKEN, composeId: "comp-1", intervalMs: 10, timeoutMs: 50 })
    ).rejects.toThrow("timed out");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/deploy/__tests__/dokploy.test.ts
```

Expected: FAIL — `Cannot find module '../dokploy'`

- [ ] **Step 3: Implement Dokploy client**

```ts
// src/lib/deploy/dokploy.ts

interface DokployBase {
  baseUrl: string;
  token: string;
}

async function dokployPost<T>(url: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": token,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dokploy API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function dokployGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "x-api-key": token },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dokploy API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function createDokployProject(
  params: DokployBase & { name: string }
): Promise<string> {
  const data = await dokployPost<{ projectId: string }>(
    `${params.baseUrl}/api/project.create`,
    params.token,
    { name: params.name, description: `Generated by Agentic Builder` }
  );
  return data.projectId;
}

export async function createDokployCompose(
  params: DokployBase & { name: string; projectId: string }
): Promise<string> {
  const data = await dokployPost<{ composeId: string }>(
    `${params.baseUrl}/api/compose.create`,
    params.token,
    { name: params.name, projectId: params.projectId }
  );
  return data.composeId;
}

export async function updateDokployCompose(
  params: DokployBase & {
    composeId: string;
    repository: string;
    branch: string;
    env: string;
  }
): Promise<void> {
  await dokployPost(
    `${params.baseUrl}/api/compose.update`,
    params.token,
    {
      composeId: params.composeId,
      repository: params.repository,
      branch: params.branch,
      composeType: "docker-compose",
      env: params.env,
    }
  );
}

export async function deployDokployCompose(
  params: DokployBase & { composeId: string }
): Promise<void> {
  await dokployPost(
    `${params.baseUrl}/api/compose.deploy`,
    params.token,
    { composeId: params.composeId }
  );
}

interface ComposeStatusResponse {
  composeStatus: "idle" | "running" | "done" | "error";
  domains: Array<{ host: string; https: boolean }>;
}

export async function pollDeployStatus(
  params: DokployBase & {
    composeId: string;
    intervalMs: number;
    timeoutMs: number;
  }
): Promise<string> {
  const deadline = Date.now() + params.timeoutMs;

  while (Date.now() < deadline) {
    const data = await dokployGet<ComposeStatusResponse>(
      `${params.baseUrl}/api/compose.one?composeId=${params.composeId}`,
      params.token
    );

    if (data.composeStatus === "done") {
      const domain = data.domains[0];
      if (domain) {
        return `${domain.https ? "https" : "http"}://${domain.host}`;
      }
      return `${params.baseUrl}/dashboard/compose/${params.composeId}`;
    }

    if (data.composeStatus === "error") {
      throw new Error("Dokploy deploy failed");
    }

    await new Promise((r) => setTimeout(r, params.intervalMs));
  }

  throw new Error("Dokploy deploy timed out after waiting");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/deploy/__tests__/dokploy.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/deploy/dokploy.ts src/lib/deploy/__tests__/dokploy.test.ts
git commit -m "feat(deploy): add Dokploy Compose API client"
```

---

## Task 5: Pipeline Orchestrator

**Files:**
- Create: `src/lib/deploy/pipeline.ts`
- Create: `src/lib/deploy/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/deploy/__tests__/pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pipeline/push-kickoff-repo", () => ({
  readKickoffRepoMetadata: vi.fn(),
  pushGeneratedCodeToKickoffRepo: vi.fn(),
}));
vi.mock("../database", () => ({
  createAppDatabase: vi.fn(),
}));
vi.mock("../dokploy", () => ({
  createDokployProject: vi.fn(),
  createDokployCompose: vi.fn(),
  updateDokployCompose: vi.fn(),
  deployDokployCompose: vi.fn(),
  pollDeployStatus: vi.fn(),
}));
vi.mock("../job-manager", () => ({
  emitStep: vi.fn(),
  completeJob: vi.fn(),
  failJob: vi.fn(),
}));

import { readKickoffRepoMetadata, pushGeneratedCodeToKickoffRepo } from "@/lib/pipeline/push-kickoff-repo";
import { createAppDatabase } from "../database";
import { createDokployProject, createDokployCompose, updateDokployCompose, deployDokployCompose, pollDeployStatus } from "../dokploy";
import { emitStep, completeJob, failJob } from "../job-manager";
import { runDeployPipeline } from "../pipeline";

const ENV = {
  GITHUB_TOKEN: "gh-token",
  DOKPLOY_URL: "https://dokploy.example.com",
  DOKPLOY_TOKEN: "dk-token",
  SHARED_PG_CONNECTION_STRING: "postgresql://user:pass@host:5432/postgres",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readKickoffRepoMetadata).mockResolvedValue({
    cloneUrl: "https://github.com/owner/app.git",
    htmlUrl: "https://github.com/owner/app",
    name: "app",
    savedAt: new Date().toISOString(),
  });
  vi.mocked(pushGeneratedCodeToKickoffRepo).mockResolvedValue({ ok: true, message: "Pushed" });
  vi.mocked(createAppDatabase).mockResolvedValue("postgresql://user:pass@host:5432/my_app");
  vi.mocked(createDokployProject).mockResolvedValue("proj-1");
  vi.mocked(createDokployCompose).mockResolvedValue("comp-1");
  vi.mocked(updateDokployCompose).mockResolvedValue(undefined);
  vi.mocked(deployDokployCompose).mockResolvedValue(undefined);
  vi.mocked(pollDeployStatus).mockResolvedValue("https://app.example.com");
});

describe("runDeployPipeline", () => {
  it("runs all steps and calls completeJob on success", async () => {
    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "verify-repo", status: "done" }));
    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "git-push", status: "done" }));
    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "create-database", status: "done" }));
    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "create-dokploy", status: "done" }));
    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "trigger-deploy", status: "done" }));
    expect(completeJob).toHaveBeenCalledWith("job-1", "https://app.example.com", "https://github.com/owner/app");
  });

  it("calls failJob and emits error step when verify-repo fails", async () => {
    vi.mocked(readKickoffRepoMetadata).mockResolvedValue(null);

    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "verify-repo", status: "error" }));
    expect(failJob).toHaveBeenCalledWith("job-1");
    expect(pushGeneratedCodeToKickoffRepo).not.toHaveBeenCalled();
  });

  it("calls failJob when git push fails", async () => {
    vi.mocked(pushGeneratedCodeToKickoffRepo).mockResolvedValue({ ok: false, message: "Push failed" });

    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "git-push", status: "error" }));
    expect(failJob).toHaveBeenCalledWith("job-1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/deploy/__tests__/pipeline.test.ts
```

Expected: FAIL — `Cannot find module '../pipeline'`

- [ ] **Step 3: Implement pipeline orchestrator**

```ts
// src/lib/deploy/pipeline.ts
import { readKickoffRepoMetadata, pushGeneratedCodeToKickoffRepo } from "@/lib/pipeline/push-kickoff-repo";
import { createAppDatabase } from "./database";
import { createDokployProject, createDokployCompose, updateDokployCompose, deployDokployCompose, pollDeployStatus } from "./dokploy";
import { emitStep, completeJob, failJob } from "./job-manager";
import type { StepId } from "./types";

interface PipelineEnv {
  GITHUB_TOKEN: string;
  DOKPLOY_URL: string;
  DOKPLOY_TOKEN: string;
  SHARED_PG_CONNECTION_STRING: string;
}

interface PipelineParams {
  jobId: string;
  appName: string;
  generatedCodePath: string;
  projectRoot: string;
  env: PipelineEnv;
}

function emit(jobId: string, step: StepId, status: "running" | "done" | "error", message: string, url?: string) {
  emitStep(jobId, { step, status, message, url });
}

export async function runDeployPipeline(params: PipelineParams): Promise<void> {
  const { jobId, appName, generatedCodePath, projectRoot, env } = params;

  // Step 1: Verify kickoff repo exists
  emit(jobId, "verify-repo", "running", "Verifying GitHub repository...");
  const repoMeta = await readKickoffRepoMetadata(projectRoot);
  if (!repoMeta?.cloneUrl) {
    emit(jobId, "verify-repo", "error", "No kickoff repository found. Run the kickoff stage first.");
    failJob(jobId);
    return;
  }
  emit(jobId, "verify-repo", "done", `Repository confirmed: ${repoMeta.htmlUrl ?? repoMeta.cloneUrl}`);

  // Step 2: Push generated code
  emit(jobId, "git-push", "running", "Pushing generated code to GitHub...");
  const pushResult = await pushGeneratedCodeToKickoffRepo({
    projectRoot,
    codeOutputDir: generatedCodePath,
    token: env.GITHUB_TOKEN,
  });
  if (!pushResult.ok) {
    emit(jobId, "git-push", "error", pushResult.message);
    failJob(jobId);
    return;
  }
  emit(jobId, "git-push", "done", "Code pushed to GitHub");

  // Step 3: Create per-app database
  emit(jobId, "create-database", "running", "Creating database...");
  let databaseUrl: string;
  try {
    databaseUrl = await createAppDatabase({
      connectionString: env.SHARED_PG_CONNECTION_STRING,
      appName,
    });
  } catch (err) {
    emit(jobId, "create-database", "error", `Database creation failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
    return;
  }
  emit(jobId, "create-database", "done", "Database ready");

  // Step 4: Create Dokploy project + compose service
  emit(jobId, "create-dokploy", "running", "Creating Dokploy project...");
  let composeId: string;
  try {
    const projectId = await createDokployProject({ baseUrl: env.DOKPLOY_URL, token: env.DOKPLOY_TOKEN, name: appName });
    composeId = await createDokployCompose({ baseUrl: env.DOKPLOY_URL, token: env.DOKPLOY_TOKEN, name: appName, projectId });
    await updateDokployCompose({
      baseUrl: env.DOKPLOY_URL,
      token: env.DOKPLOY_TOKEN,
      composeId,
      repository: repoMeta.htmlUrl ?? repoMeta.cloneUrl,
      branch: "main",
      env: `DATABASE_URL=${databaseUrl}\n`,
    });
  } catch (err) {
    emit(jobId, "create-dokploy", "error", `Dokploy setup failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
    return;
  }
  emit(jobId, "create-dokploy", "done", "Dokploy project created");

  // Steps 5+6: Deploy and poll
  emit(jobId, "trigger-deploy", "running", "Deploying...");
  try {
    await deployDokployCompose({ baseUrl: env.DOKPLOY_URL, token: env.DOKPLOY_TOKEN, composeId });
    const appUrl = await pollDeployStatus({
      baseUrl: env.DOKPLOY_URL,
      token: env.DOKPLOY_TOKEN,
      composeId,
      intervalMs: 3000,
      timeoutMs: 300_000,
    });
    emit(jobId, "trigger-deploy", "done", "Deploy complete", appUrl);
    completeJob(jobId, appUrl, repoMeta.htmlUrl ?? repoMeta.cloneUrl);
  } catch (err) {
    emit(jobId, "trigger-deploy", "error", `Deploy failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/deploy/__tests__/pipeline.test.ts
```

Expected: all PASS

- [ ] **Step 5: Run all deploy tests**

```bash
npx vitest run src/lib/deploy/__tests__/
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/deploy/pipeline.ts src/lib/deploy/__tests__/pipeline.test.ts
git commit -m "feat(deploy): add pipeline orchestrator"
```

---

## Task 6: API Routes

**Files:**
- Create: `src/app/api/deploy/route.ts`
- Create: `src/app/api/deploy/[jobId]/route.ts`
- Create: `src/app/api/deploy/[jobId]/stream/route.ts`

- [ ] **Step 1: Create POST /api/deploy**

```ts
// src/app/api/deploy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/deploy/job-manager";
import { runDeployPipeline } from "@/lib/deploy/pipeline";
import type { DeployRequest } from "@/lib/deploy/types";

export const maxDuration = 300;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Partial<DeployRequest>;

  if (!body.appName?.trim() || !body.generatedCodePath?.trim()) {
    return NextResponse.json(
      { error: "appName and generatedCodePath are required" },
      { status: 400 }
    );
  }

  let env: { GITHUB_TOKEN: string; DOKPLOY_URL: string; DOKPLOY_TOKEN: string; SHARED_PG_CONNECTION_STRING: string };
  try {
    env = {
      GITHUB_TOKEN: requireEnv("GITHUB_TOKEN"),
      DOKPLOY_URL: requireEnv("DOKPLOY_URL"),
      DOKPLOY_TOKEN: requireEnv("DOKPLOY_TOKEN"),
      SHARED_PG_CONNECTION_STRING: requireEnv("SHARED_PG_CONNECTION_STRING"),
    };
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Missing configuration" },
      { status: 500 }
    );
  }

  const job = createJob();

  // Fire and forget — pipeline runs in background
  void runDeployPipeline({
    jobId: job.id,
    appName: body.appName.trim(),
    generatedCodePath: body.generatedCodePath.trim(),
    projectRoot: process.cwd(),
    env,
  });

  return NextResponse.json({ jobId: job.id });
}
```

- [ ] **Step 2: Create GET /api/deploy/[jobId]**

```ts
// src/app/api/deploy/[jobId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/deploy/job-manager";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: job.id,
    status: job.status,
    steps: job.steps,
    url: job.url,
    repoUrl: job.repoUrl,
  });
}
```

- [ ] **Step 3: Create GET /api/deploy/[jobId]/stream (SSE)**

```ts
// src/app/api/deploy/[jobId]/stream/route.ts
import { NextRequest } from "next/server";
import { getJob } from "@/lib/deploy/job-manager";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send all steps so far (catch-up for reconnecting clients)
      for (const step of job.steps) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
      }

      if (job.status !== "running") {
        controller.close();
        return;
      }

      job.subscribers.add(controller);
    },
    cancel(controller) {
      job.subscribers.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 4: Manually test the endpoints**

Start the dev server and verify:

```bash
npm run dev
```

In another terminal:
```bash
# Should return 400 (missing fields)
curl -X POST http://localhost:3000/api/deploy -H "Content-Type: application/json" -d '{}'

# Should return { jobId: "..." } if env vars are set, or 500 if not
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"appName":"test-app","generatedCodePath":"generated-code"}'
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/deploy/
git commit -m "feat(deploy): add deploy API routes with SSE streaming"
```

---

## Task 7: Scaffold Docker Files

**Files:**
- Create: `scaffolds/m-tier/docker-compose.yml`
- Create: `scaffolds/m-tier/backend/Dockerfile`
- Create: `scaffolds/m-tier/frontend/Dockerfile`
- Create: `scaffolds/m-tier/frontend/nginx.conf`
- Create: `scaffolds/s-tier/docker-compose.yml`
- Create: `scaffolds/s-tier/Dockerfile`
- Create: `scaffolds/s-tier/nginx.conf`

- [ ] **Step 1: Create m-tier docker-compose.yml**

```yaml
# scaffolds/m-tier/docker-compose.yml
version: "3.9"
services:
  backend:
    build:
      context: ./backend
    environment:
      NODE_ENV: production
      PORT: "3001"
      DATABASE_URL: ${DATABASE_URL}
    ports:
      - "3001:3001"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:80"
    restart: unless-stopped
    depends_on:
      - backend
```

- [ ] **Step 2: Create m-tier backend Dockerfile**

```dockerfile
# scaffolds/m-tier/backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

- [ ] **Step 3: Create m-tier frontend nginx.conf**

```nginx
# scaffolds/m-tier/frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 4: Create m-tier frontend Dockerfile**

```dockerfile
# scaffolds/m-tier/frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 5: Create s-tier nginx.conf**

```nginx
# scaffolds/s-tier/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 6: Create s-tier Dockerfile**

```dockerfile
# scaffolds/s-tier/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 7: Create s-tier docker-compose.yml**

```yaml
# scaffolds/s-tier/docker-compose.yml
version: "3.9"
services:
  frontend:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

- [ ] **Step 8: Commit**

```bash
git add scaffolds/
git commit -m "feat(scaffold): add Dockerfiles and docker-compose for m-tier and s-tier"
```

---

## Task 8: Deploy UI Component

**Files:**
- Create: `src/components/kickoff/DeploySection.tsx`
- Modify: `src/components/kickoff/KickoffSummaryView.tsx`

- [ ] **Step 1: Read KickoffSummaryView to find the insertion point**

Open `src/components/kickoff/KickoffSummaryView.tsx` and locate the line:
```tsx
<PushGeneratedCodeSection codeOutputDir={codeOutputDir} />
```
This is the insertion point — `DeploySection` goes below it.

Also check what props are available: `codeOutputDir` and `featureBrief` (from `usePipelineStore`).

- [ ] **Step 2: Create DeploySection component**

```tsx
// src/components/kickoff/DeploySection.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { StepResult } from "@/lib/deploy/types";
import { usePipelineStore } from "@/store/pipeline-store";

const STEP_LABELS: Record<string, string> = {
  "verify-repo": "Verify GitHub repo",
  "git-push": "Push code",
  "create-database": "Create database",
  "create-dokploy": "Create Dokploy project",
  "trigger-deploy": "Deploy",
};

const ALL_STEPS = ["verify-repo", "git-push", "create-database", "create-dokploy", "trigger-deploy"] as const;

function StepRow({ step, result }: { step: string; result?: StepResult }) {
  const status = result?.status ?? "pending";
  const label = STEP_LABELS[step] ?? step;

  const icon =
    status === "done" ? "✓"
    : status === "running" ? "⟳"
    : status === "error" ? "✗"
    : "○";

  const color =
    status === "done" ? "text-green-600"
    : status === "running" ? "text-blue-600 animate-spin"
    : status === "error" ? "text-red-500"
    : "text-zinc-400";

  return (
    <div className="flex items-center gap-2 py-1 text-[13px]">
      <span className={`w-4 text-center font-bold ${color}`}>{icon}</span>
      <span className={status === "error" ? "text-red-600" : "text-zinc-700"}>{label}</span>
      {result?.message && status !== "done" && (
        <span className="text-zinc-400 text-[11px] truncate max-w-[200px]">{result.message}</span>
      )}
    </div>
  );
}

export default function DeploySection({ codeOutputDir }: { codeOutputDir: string }) {
  const featureBrief = usePipelineStore((s) => s.featureBrief);
  const [jobId, setJobId] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [finalStatus, setFinalStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const appName = featureBrief
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "generated-app";

  const handleDeploy = async () => {
    setFinalStatus("running");
    setSteps([]);
    setDeployUrl(null);
    setRepoUrl(null);
    setErrorMsg(null);

    const res = await fetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName, generatedCodePath: codeOutputDir }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setErrorMsg(data.error ?? "Failed to start deployment");
      setFinalStatus("error");
      return;
    }

    const { jobId: id } = await res.json() as { jobId: string };
    setJobId(id);

    const es = new EventSource(`/api/deploy/${id}/stream`);
    sourceRef.current = es;

    es.onmessage = (e) => {
      const step = JSON.parse(e.data as string) as StepResult;
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.step === step.step);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = step;
          return next;
        }
        return [...prev, step];
      });
      // Update final state from SSE events directly — no render-time side effects
      if (step.step === "trigger-deploy" && step.status === "done") {
        if (step.url) setDeployUrl(step.url);
        setFinalStatus("done");
        es.close();
      }
      if (step.status === "error") {
        setFinalStatus("error");
        es.close();
      }
    };

    es.onerror = () => {
      es.close();
      // SSE closed before trigger-deploy done — fetch final status
      void fetch(`/api/deploy/${id}`)
        .then((r) => r.json())
        .then((data: { status: string; url?: string; repoUrl?: string }) => {
          setFinalStatus(data.status === "done" ? "done" : "error");
          if (data.url) setDeployUrl(data.url);
          if (data.repoUrl) setRepoUrl(data.repoUrl);
        });
    };
  };

  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  const stepMap = new Map(steps.map((s) => [s.step, s]));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
      <p className="text-[15px] font-semibold text-zinc-900">Deploy to Dokploy</p>
      <p className="mt-1 text-[12px] text-zinc-500">
        Pushes code to GitHub, creates a database, and deploys via Docker Compose.
      </p>

      {finalStatus === "idle" && (
        <button
          type="button"
          onClick={() => void handleDeploy()}
          className="mt-3 rounded-lg bg-[#712ae2] hover:bg-[#5f24c2] px-4 py-2 text-xs font-semibold text-white transition-colors"
        >
          Deploy {appName}
        </button>
      )}

      {finalStatus !== "idle" && (
        <div className="mt-3">
          {ALL_STEPS.map((step) => (
            <StepRow key={step} step={step} result={stepMap.get(step)} />
          ))}
        </div>
      )}

      {errorMsg && (
        <p className="mt-2 text-[12px] text-red-600">{errorMsg}</p>
      )}

      {finalStatus === "done" && (
        <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
          {deployUrl && (
            <a href={deployUrl} target="_blank" rel="noreferrer"
              className="text-indigo-600 underline">
              Open app ↗
            </a>
          )}
          {repoUrl && (
            <a href={repoUrl} target="_blank" rel="noreferrer"
              className="text-zinc-500 underline">
              GitHub repo ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => { setFinalStatus("idle"); setJobId(null); }}
            className="text-zinc-400 hover:text-zinc-600"
          >
            Deploy again
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add DeploySection to KickoffSummaryView**

In `src/components/kickoff/KickoffSummaryView.tsx`, add the import at the top:

```tsx
import DeploySection from "./DeploySection";
```

Then after the existing `<PushGeneratedCodeSection ... />` line, add:

```tsx
{/* ─── Auto deploy to Dokploy ─── */}
<DeploySection codeOutputDir={codeOutputDir} />
```

- [ ] **Step 4: Start dev server and verify UI renders**

```bash
npm run dev
```

Navigate to a project that has completed kickoff. The "Deploy to Dokploy" panel should appear below the "Push generated code" panel in the kickoff summary view.

- [ ] **Step 5: Commit**

```bash
git add src/components/kickoff/DeploySection.tsx src/components/kickoff/KickoffSummaryView.tsx
git commit -m "feat(deploy): add deploy UI panel with SSE step progress"
```

---

## Task 9: Environment Setup Verification

**Files:** `.env.local` (not committed)

- [ ] **Step 1: Verify required env vars are documented**

Add the following to `.env.local` on the server (not committed to git):

```bash
# GitHub — same token used by kickoff
GITHUB_TOKEN=ghp_...

# Dokploy instance
DOKPLOY_URL=https://your-dokploy-host.com
DOKPLOY_TOKEN=your-dokploy-api-token

# Shared PostgreSQL on Dokploy (admin connection)
SHARED_PG_CONNECTION_STRING=postgresql://postgres:password@your-dokploy-host.com:5432/postgres
```

- [ ] **Step 2: One-time Dokploy setup (manual)**

In your Dokploy dashboard:
1. Go to **Settings → Git** and add your GitHub token so Dokploy can pull private repos
2. Create a PostgreSQL service named `shared-postgres` — this is the shared instance all generated apps will use
3. Copy the PostgreSQL connection string into `SHARED_PG_CONNECTION_STRING`

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run src/lib/deploy/__tests__/
```

Expected: all PASS

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(deploy): complete auto-deploy pipeline — GitHub push + PostgreSQL + Dokploy"
```
