import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Stage 2 route B — graph-compile guard for parallel BACKEND+FRONTEND codegen.
 *
 * We can't unit-test the runtime concurrency (that needs a live build), but we CAN
 * assert that BOTH flag states produce a compilable supervisor graph — i.e. the
 * parallel topology has no dangling/unreachable nodes or edges to undefined nodes,
 * and the flag-OFF path is unaffected.
 *
 * ENABLE_PARALLEL_FE_BE is read once at module load, so each case toggles the env
 * var, resets the module registry, and re-imports.
 */
describe("Stage 2 route B — createSupervisorGraph compiles for both flag states", () => {
  const prev = process.env.CODEGEN_PARALLEL_FE_BE;

  beforeEach(() => {
    delete process.env.CODEGEN_PARALLEL_FE_BE;
    vi.resetModules();
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.CODEGEN_PARALLEL_FE_BE;
    else process.env.CODEGEN_PARALLEL_FE_BE = prev;
  });

  it("compiles with the flag OFF (default sequential BE→extract→FE)", async () => {
    process.env.CODEGEN_PARALLEL_FE_BE = "0";
    const mod = await import("../supervisor");
    expect(typeof mod.createSupervisorGraph).toBe("function");
    const graph = mod.createSupervisorGraph();
    expect(graph).toBeTruthy();
    // Compiled graphs expose invoke/stream.
    expect(typeof graph.invoke).toBe("function");
  });

  it("compiles with the flag ON (parallel_codegen node + post-join verify)", async () => {
    process.env.CODEGEN_PARALLEL_FE_BE = "1";
    const mod = await import("../supervisor");
    const graph = mod.createSupervisorGraph();
    expect(graph).toBeTruthy();
    expect(typeof graph.invoke).toBe("function");
  });
});
