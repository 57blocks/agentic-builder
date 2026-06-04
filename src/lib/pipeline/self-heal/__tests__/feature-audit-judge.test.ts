/**
 * Unit tests for the feature-checklist audit L3 judge.
 *
 *  1. `parseJudgeResponse` — defensive JSON parsing + verdict/category mapping
 *     (notably the "wiring" verdict word → partial verdict + wiring category).
 *  2. `judgeFeatureEntries` — kill switch, empty-input no-op, and that an
 *     injected chat impl drives the verdict map.
 *  3. Integration through `runFeatureChecklistAudit` with an injected judge:
 *     an L2 `partial` is upgraded to `implemented` (drops out of uncovered),
 *     and a `wiring` verdict stays uncovered with category=wiring.
 */

import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  judgeFeatureEntries,
  parseJudgeResponse,
} from "../feature-audit-judge";
import { runFeatureChecklistAudit } from "../feature-checklist-audit";
import type { JudgeFeatureEntriesResult } from "../feature-audit-judge";
import type { AuditTaskSummary } from "../feature-checklist-audit";
import type { RepairEvent } from "../events";
import type { KickoffWorkItem } from "@/lib/pipeline/types";
import type { PrdRequirementIndex } from "@/lib/requirements/prd-spec-types";
import type { OpenRouterResponse } from "@/lib/llm-types";

function fakeResponse(content: string): OpenRouterResponse {
  return {
    id: "test",
    model: "test-model",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  } as unknown as OpenRouterResponse;
}

describe("parseJudgeResponse", () => {
  it("parses verdicts and uppercases ids", () => {
    const m = parseJudgeResponse(
      JSON.stringify({
        verdicts: [
          { id: "fr-1", verdict: "implemented", category: "coverage", reason: "ok", evidence: ["a.tsx:1"] },
        ],
      }),
    );
    const v = m.get("FR-1");
    expect(v?.verdict).toBe("implemented");
    expect(v?.evidence).toEqual(["a.tsx:1"]);
  });

  it("maps the 'wiring' verdict word to partial verdict + wiring category", () => {
    const m = parseJudgeResponse(
      JSON.stringify({ verdicts: [{ id: "FR-2", verdict: "wiring", reason: "dead handler" }] }),
    );
    const v = m.get("FR-2");
    expect(v?.verdict).toBe("partial");
    expect(v?.category).toBe("wiring");
  });

  it("tolerates surrounding prose / fences and bad rows", () => {
    const raw = "here you go:\n```json\n" +
      JSON.stringify({ verdicts: [null, { verdict: "missing" }, { id: "FR-3", verdict: "missing", category: "coverage", reason: "none" }] }) +
      "\n```";
    const m = parseJudgeResponse(raw);
    expect(m.size).toBe(1);
    expect(m.get("FR-3")?.verdict).toBe("missing");
  });

  it("returns an empty map for non-JSON", () => {
    expect(parseJudgeResponse("not json at all").size).toBe(0);
  });
});

describe("judgeFeatureEntries", () => {
  const ENV = process.env.FEATURE_AUDIT_L3;
  afterEach(() => {
    if (ENV === undefined) delete process.env.FEATURE_AUDIT_L3;
    else process.env.FEATURE_AUDIT_L3 = ENV;
    vi.restoreAllMocks();
  });

  it("is a no-op when disabled via FEATURE_AUDIT_L3=0", async () => {
    process.env.FEATURE_AUDIT_L3 = "0";
    const impl = vi.fn();
    const res = await judgeFeatureEntries({
      entries: [{ id: "FR-1", labels: [], coveringTaskIds: ["T1"], candidateFiles: [] }],
      outputDir: "/tmp/does-not-matter",
      chatCompletionImpl: impl,
    });
    expect(res.ran).toBe(false);
    expect(impl).not.toHaveBeenCalled();
  });

  it("is a no-op when given no entries", async () => {
    process.env.FEATURE_AUDIT_L3 = "1";
    const impl = vi.fn();
    const res = await judgeFeatureEntries({
      entries: [],
      outputDir: "/tmp/x",
      chatCompletionImpl: impl,
    });
    expect(res.ran).toBe(false);
    expect(impl).not.toHaveBeenCalled();
  });

  it("returns verdicts from the injected chat impl", async () => {
    process.env.FEATURE_AUDIT_L3 = "1";
    const impl = vi.fn(async () =>
      fakeResponse(
        JSON.stringify({
          verdicts: [{ id: "FR-1", verdict: "implemented", category: "coverage", reason: "wired" }],
        }),
      ),
    );
    const res = await judgeFeatureEntries({
      entries: [{ id: "FR-1", labels: ["Login"], coveringTaskIds: ["T1"], candidateFiles: [] }],
      outputDir: "/tmp/x",
      chatCompletionImpl: impl,
    });
    expect(res.ran).toBe(true);
    expect(impl).toHaveBeenCalledTimes(1);
    expect(res.verdicts.get("FR-1")?.verdict).toBe("implemented");
  });

  it("keeps the L2 verdict (drops the id) when the batch call throws", async () => {
    process.env.FEATURE_AUDIT_L3 = "1";
    const impl = vi.fn(async () => {
      throw new Error("boom");
    });
    const res = await judgeFeatureEntries({
      entries: [{ id: "FR-1", labels: [], coveringTaskIds: ["T1"], candidateFiles: [] }],
      outputDir: "/tmp/x",
      chatCompletionImpl: impl,
    });
    expect(res.ran).toBe(true);
    expect(res.verdicts.size).toBe(0);
  });
});

describe("runFeatureChecklistAudit with injected L3 judge", () => {
  let dir: string;
  const events: RepairEvent[] = [];
  const emitter = (e: Omit<RepairEvent, "timestamp"> & { timestamp?: string }) => {
    events.push({ ...e, timestamp: e.timestamp ?? "t" } as RepairEvent);
  };

  beforeEach(async () => {
    events.length = 0;
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "l3-audit-"));
    // A source file with NO requirement anchors → both ids land in the L2
    // `partial` bucket (tasks produced files, but no textual anchor found).
    await fs.writeFile(
      path.join(dir, "view.tsx"),
      "export function View() { return <button>Go</button>; }\n",
      "utf-8",
    );
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("upgrades a partial to implemented and surfaces a wiring gap", async () => {
    const prdIndex: PrdRequirementIndex = {
      acceptanceCriteriaIds: [],
      featureIds: ["FR-1", "FR-2"],
      userStoryIds: [],
      componentIds: [],
    };
    const tasks: KickoffWorkItem[] = [
      {
        id: "T1",
        phase: "Frontend",
        title: "t1",
        description: "",
        estimatedHours: 1,
        executionKind: "ai_autonomous",
        coversRequirementIds: ["FR-1", "FR-2"],
      },
    ];
    const taskResults: AuditTaskSummary[] = [
      {
        id: "T1",
        title: "t1",
        coversRequirementIds: ["FR-1", "FR-2"],
        generatedFiles: ["view.tsx"],
        status: "completed",
      },
    ];

    const judgeImpl = async (): Promise<JudgeFeatureEntriesResult> => ({
      ran: true,
      costUsd: 0,
      durationMs: 1,
      model: "test",
      verdicts: new Map([
        ["FR-1", { id: "FR-1", verdict: "implemented", category: "coverage", reason: "real handler", evidence: ["view.tsx:1"] }],
        ["FR-2", { id: "FR-2", verdict: "partial", category: "wiring", reason: "button has no onClick", evidence: ["view.tsx:1"] }],
      ]),
    });

    const result = await runFeatureChecklistAudit({
      prdIndex,
      prdSpec: null,
      tasks,
      taskResults,
      outputDir: dir,
      emitter,
      judgeImpl,
    });

    const fr1 = result.entries.find((e) => e.id === "FR-1");
    const fr2 = result.entries.find((e) => e.id === "FR-2");
    expect(fr1?.verdict).toBe("implemented");
    expect(fr1?.layer).toBe("l3");
    expect(fr2?.verdict).toBe("partial");
    expect(fr2?.layer).toBe("l3");
    expect(fr2?.category).toBe("wiring");

    // FR-1 left the uncovered set; FR-2 remains and blocks the gate.
    expect(result.uncovered.map((e) => e.id)).toEqual(["FR-2"]);
    expect(result.hardUncovered.map((e) => e.id)).toEqual(["FR-2"]);
    expect(result.passed).toBe(false);

    const l3Event = events.find((e) => e.event === "audit_l3_judged");
    expect(l3Event?.details?.upgradedToImplemented).toBe(1);
    expect(l3Event?.details?.wiringGaps).toBe(1);
  });
});
