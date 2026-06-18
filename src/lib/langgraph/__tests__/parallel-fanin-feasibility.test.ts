import { describe, it, expect } from "vitest";
import { StateGraph, START, END, Send, Annotation } from "@langchain/langgraph";

/**
 * Feasibility probe for Stage 2 route A (graph-topology parallel BE/FE + join).
 *
 * Validates the two LangGraph behaviours route A depends on:
 *   1. A single node can have BOTH a conditional Send fan-out (→ "worker") AND a
 *      regular edge (→ "feFoundation") — i.e. tdd_test_writer Sends BE chunks
 *      AND starts the FE branch concurrently.
 *   2. Two HETEROGENEOUS branches of different lengths (BE = 1 hop via Sends;
 *      FE = 2 hops feFoundation→fePages) that both edge into one "join" node
 *      cause `join` to run EXACTLY ONCE, AFTER both branches finish (proper
 *      diamond fan-in / barrier).
 */

const S = Annotation.Root({
  log: Annotation<string[]>({
    reducer: (a: string[], b: string[]) => [...a, ...b],
    default: () => [],
  }),
  joinRuns: Annotation<number>({
    reducer: (a: number, b: number) => a + b,
    default: () => 0,
  }),
});

describe("Stage 2 route A feasibility — heterogeneous branch fan-in", () => {
  it("a node has both Send fan-out and a regular edge; join waits for both branches and runs once", async () => {
    const graph = new StateGraph(S)
      .addNode("entry", () => ({ log: ["entry"] }))
      .addNode("worker", () => ({ log: ["worker"] }))
      .addNode("feFoundation", () => ({ log: ["feFoundation"] }))
      .addNode("fePages", () => ({ log: ["fePages"] }))
      .addNode("join", () => ({ log: ["join"], joinRuns: 1 }))
      .addEdge(START, "entry")
      // BE-like fan-out: two parallel worker Sends from entry…
      .addConditionalEdges("entry", () => [
        new Send("worker", {}),
        new Send("worker", {}),
      ])
      // …AND, from the SAME node, a regular edge starting the FE branch.
      .addEdge("entry", "feFoundation")
      .addEdge("worker", "join")
      .addEdge("feFoundation", "fePages")
      .addEdge("fePages", "join")
      .addEdge("join", END)
      .compile();

    const out = await graph.invoke({ log: [], joinRuns: 0 });

    // FINDING: a node CAN mix a Send fan-out with a regular edge — both branches ran.
    expect(out.log.filter((x) => x === "worker").length).toBe(2); // BE fan-out ran
    expect(out.log).toContain("feFoundation"); // FE branch hop 1 ran
    expect(out.log).toContain("fePages"); // FE branch hop 2 ran

    // FINDING (the blocker for route A): with branches of DIFFERENT length, the
    // join node is NOT a barrier — it fires once per superstep a branch reaches
    // it. BE (1 hop) and FE (2 hops) arrive in different supersteps, so `join`
    // runs TWICE. A post-join verify/extract/arbiter would therefore run twice.
    // => route A (graph-topology diamond fan-in) is unsafe here; use route B
    //    (in-node Promise.all, like invokeArchitectWorkers), which returns once.
    expect(out.joinRuns).toBe(2);
    expect(out.log.filter((x) => x === "join").length).toBe(2);
  });
});
