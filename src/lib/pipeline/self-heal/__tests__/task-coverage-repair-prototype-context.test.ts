/**
 * Verifies `repairTaskCoverage` forwards `prototypeContext` through to
 * `TaskBreakdownAgent.generateSupplementaryTasks`. Without this, the
 * coverage-gate self-heal loop re-creates components that are already
 * inlined in prototype-generated pages, because it never sees the
 * prototype's per-page CMP-* declarations.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { repairTaskCoverage } from "../task-coverage-repair";
import { noopRepairEmitter } from "../events";

const generateSupplementaryTasksMock = vi.fn();

vi.mock("@/lib/agents/kickoff/task-breakdown-agent", () => ({
  TaskBreakdownAgent: vi.fn().mockImplementation(function () {
    return {
      generateSupplementaryTasks: generateSupplementaryTasksMock,
    };
  }),
}));

describe("repairTaskCoverage — prototypeContext threading", () => {
  beforeEach(() => {
    generateSupplementaryTasksMock.mockReset();
    generateSupplementaryTasksMock.mockResolvedValue({ content: "[]", costUsd: 0 });
  });

  it("passes prototypeContext through to generateSupplementaryTasks", async () => {
    await repairTaskCoverage({
      missingIds: ["CMP-001"],
      existingTasks: [],
      prd: "PRD text",
      tier: "M",
      emitter: noopRepairEmitter,
      prototypeContext: "## PROTOTYPE ALREADY EXISTS\nCMP-001 already implemented",
    });

    expect(generateSupplementaryTasksMock).toHaveBeenCalledTimes(1);
    const params = generateSupplementaryTasksMock.mock.calls[0]![0];
    expect(params.prototypeContext).toContain("CMP-001 already implemented");
  });

  it("omits prototypeContext when not provided (legacy behaviour unchanged)", async () => {
    await repairTaskCoverage({
      missingIds: ["FR-001"],
      existingTasks: [],
      prd: "PRD text",
      tier: "M",
      emitter: noopRepairEmitter,
    });

    const params = generateSupplementaryTasksMock.mock.calls[0]![0];
    expect(params.prototypeContext).toBeUndefined();
  });
});
