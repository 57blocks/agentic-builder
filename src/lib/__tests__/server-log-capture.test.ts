import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  installServerLogCapture,
  logContext,
  withTaskLogContext,
} from "../server-log-capture";
import {
  registerLogSink,
  unregisterLogSink,
  type ServerLogEntry,
} from "@/lib/langgraph/server-log-bridge";

describe("server-log-capture", () => {
  beforeEach(() => installServerLogCapture()); // idempotent

  it("forwards console.log to the session sink with sessionId context", () => {
    const got: ServerLogEntry[] = [];
    registerLogSink("sess", (e) => got.push(e));
    logContext.run({ sessionId: "sess" }, () => {
      console.log("hello", { a: 1 });
    });
    unregisterLogSink("sess");
    expect(got).toHaveLength(1);
    expect(got[0].level).toBe("log");
    expect(got[0].message).toContain("hello");
    expect(got[0].message).toContain("a: 1");
    expect(got[0].taskId).toBeUndefined();
  });

  it("does not forward when there is no log context", () => {
    const sink = vi.fn();
    registerLogSink("sess2", sink);
    console.log("orphan line");
    unregisterLogSink("sess2");
    expect(sink).not.toHaveBeenCalled();
  });

  it("withTaskLogContext tags logs with the node's currentTaskId, inheriting sessionId", () => {
    const got: ServerLogEntry[] = [];
    registerLogSink("sess3", (e) => got.push(e));
    const node = withTaskLogContext((_state: { currentTaskId: string | null }) => {
      console.error("boom");
      return {};
    });
    logContext.run({ sessionId: "sess3" }, () => node({ currentTaskId: "T-7" }));
    unregisterLogSink("sess3");
    expect(got).toHaveLength(1);
    expect(got[0].level).toBe("error");
    expect(got[0].taskId).toBe("T-7");
  });

  it("withTaskLogContext resolves taskId from currentTaskIndex into tasks (worker state shape)", () => {
    const got: ServerLogEntry[] = [];
    registerLogSink("sess4", (e) => got.push(e));
    const node = withTaskLogContext(
      (_state: { currentTaskIndex: number; tasks: Array<{ id: string }> }) => {
        console.log("generating");
        return {};
      },
    );
    logContext.run({ sessionId: "sess4" }, () =>
      node({ currentTaskIndex: 1, tasks: [{ id: "T-1" }, { id: "T-2" }] }),
    );
    unregisterLogSink("sess4");
    expect(got).toHaveLength(1);
    expect(got[0].taskId).toBe("T-2");
  });

  it("withTaskLogContext takes sessionId from worker state when no ALS context is inherited", () => {
    const got: ServerLogEntry[] = [];
    registerLogSink("sessFromState", (e) => got.push(e));
    const node = withTaskLogContext(
      (_state: {
        sessionId: string;
        currentTaskIndex: number;
        tasks: Array<{ id: string }>;
      }) => {
        console.log("worker line");
        return {};
      },
    );
    // No logContext.run wrapper — simulates ALS not propagating into the
    // worker's invoke() boundary; sessionId must come from state.
    node({ sessionId: "sessFromState", currentTaskIndex: 0, tasks: [{ id: "T-9" }] });
    unregisterLogSink("sessFromState");
    expect(got).toHaveLength(1);
    expect(got[0].message).toContain("worker line");
    expect(got[0].taskId).toBe("T-9");
  });
});
