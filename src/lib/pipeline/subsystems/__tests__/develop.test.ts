import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { developBySubsystem } from "../develop";
import { CSMA_SUBSYSTEM_MANIFEST } from "../csma-sample";
import { recordSubsystemResult } from "../progress-io";
import type { SubsystemManifest } from "../types";
import type { SubsystemCodingContext } from "../coding-runner";
import type { FoundationBuildResult } from "../foundation";
import type { SubsystemRunResult } from "../orchestrate";

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "subsys-dev-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

const ctx = (): SubsystemCodingContext => ({
  baseUrl: "http://127.0.0.1:3000",
  runId: "run-1",
  allTasks: [],
  projectRoot: root,
});

function fakePipeline(foundation: FoundationBuildResult, subsystems: SubsystemRunResult[]) {
  return vi.fn(async () => ({ foundation, subsystems }));
}

describe("developBySubsystem", () => {
  it("aborts (and never runs the pipeline) when the manifest is invalid", async () => {
    const bad: SubsystemManifest = {
      version: 1,
      subsystems: [{ id: "x", name: "x", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: ["ghost"], prdSections: [] }],
    };
    const runPipeline = fakePipeline({ ok: true, summary: "", generatedFiles: [] }, []);
    const r = await developBySubsystem({ projectRoot: root, allTasks: [], codingContext: ctx(), manifest: bad, runPipeline: runPipeline as never });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/validation/);
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it("aborts when the decomposer returns an invalid manifest", async () => {
    const runPipeline = fakePipeline({ ok: true, summary: "", generatedFiles: [] }, []);
    const decompose = vi.fn(async () => ({
      manifest: { version: 1, subsystems: [] } as SubsystemManifest,
      validation: { ok: false, errors: ["bad"], warnings: [], buildLayers: [] },
      attempts: 1,
      costUsd: 0,
      didFallback: true,
    }));
    const r = await developBySubsystem({ projectRoot: root, allTasks: [], codingContext: ctx(), prd: "x", decompose, runPipeline: runPipeline as never });
    expect(r.ok).toBe(false);
    expect(decompose).toHaveBeenCalled();
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it("runs the pipeline for a valid manifest, persists the manifest, and reports ok", async () => {
    const subsystems: SubsystemRunResult[] = CSMA_SUBSYSTEM_MANIFEST.subsystems.map((s) => ({ subsystemId: s.id, layer: 0, status: "completed" as const }));
    const runPipeline = fakePipeline({ ok: true, summary: "ok", generatedFiles: ["backend/src/models/User.ts"] }, subsystems);
    const r = await developBySubsystem({ projectRoot: root, allTasks: [], codingContext: ctx(), manifest: CSMA_SUBSYSTEM_MANIFEST, runPipeline: runPipeline as never });
    expect(r.ok).toBe(true);
    expect(runPipeline).toHaveBeenCalledOnce();
    // manifest persisted
    const written = JSON.parse(await fs.readFile(path.join(root, ".blueprint", "subsystems.json"), "utf-8"));
    expect(written.subsystems.length).toBe(CSMA_SUBSYSTEM_MANIFEST.subsystems.length);
  });

  it("passes already-completed subsystems as the resume set", async () => {
    await recordSubsystemResult(root, { subsystemId: "auth-accounts", layer: 0, status: "completed" }, "t0");
    const runPipeline = fakePipeline({ ok: true, summary: "ok", generatedFiles: [] }, []);
    await developBySubsystem({ projectRoot: root, allTasks: [], codingContext: ctx(), manifest: CSMA_SUBSYSTEM_MANIFEST, runPipeline: runPipeline as never });
    const passedOpts = (runPipeline.mock.calls[0] as unknown[])[4] as { alreadyDone: Set<string> };
    expect(passedOpts.alreadyDone.has("auth-accounts")).toBe(true);
  });

  it("reports not-ok when the foundation fails", async () => {
    const runPipeline = fakePipeline({ ok: false, summary: "boom", generatedFiles: [] }, []);
    const r = await developBySubsystem({ projectRoot: root, allTasks: [], codingContext: ctx(), manifest: CSMA_SUBSYSTEM_MANIFEST, runPipeline: runPipeline as never });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/foundation failed/);
  });
});
