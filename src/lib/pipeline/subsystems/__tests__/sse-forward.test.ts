import { describe, it, expect } from "vitest";
import { createSubsystemSseForwarder } from "../sse-forward";

/** Helper: build an SSE frame string the coding route would emit. */
function frame(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

describe("createSubsystemSseForwarder", () => {
  it("forwards interior events verbatim", () => {
    const out: Record<string, unknown>[] = [];
    const fwd = createSubsystemSseForwarder({ emit: (e) => out.push(e) });

    fwd("auth", frame({ type: "agent_created", data: { agentId: "a1" } }));
    fwd("auth", frame({ type: "agent_task_complete", data: { taskId: "t1", status: "completed" } }));

    expect(out).toEqual([
      { type: "agent_created", data: { agentId: "a1" } },
      { type: "agent_task_complete", data: { taskId: "t1", status: "completed" } },
    ]);
  });

  it("suppresses sub-call session_start and session_complete", () => {
    const out: Record<string, unknown>[] = [];
    const fwd = createSubsystemSseForwarder({ emit: (e) => out.push(e) });

    fwd("auth", frame({ type: "session_start", sessionId: "s1", data: { tasks: [] } }));
    fwd("auth", frame({ type: "agent_log", data: { message: "hi" } }));
    fwd("auth", frame({ type: "session_complete", sessionId: "s1" }));

    expect(out).toEqual([{ type: "agent_log", data: { message: "hi" } }]);
  });

  it("converts a sub-call session_error into a supervisor_log (does not tear down)", () => {
    const out: Record<string, unknown>[] = [];
    const fwd = createSubsystemSseForwarder({ emit: (e) => out.push(e) });

    fwd("billing", frame({ type: "session_error", data: { error: "boom", errorCategory: "llm_error" } }));

    expect(out).toEqual([
      { type: "supervisor_log", data: { message: "[billing] boom" } },
    ]);
  });

  it("buffers across chunk boundaries that split a frame mid-JSON", () => {
    const out: Record<string, unknown>[] = [];
    const fwd = createSubsystemSseForwarder({ emit: (e) => out.push(e) });

    const full = frame({ type: "agent_task_start", data: { taskId: "t9" } });
    const mid = Math.floor(full.length / 2);
    fwd("auth", full.slice(0, mid)); // partial — nothing emitted yet
    expect(out).toEqual([]);
    fwd("auth", full.slice(mid)); // completes the frame

    expect(out).toEqual([{ type: "agent_task_start", data: { taskId: "t9" } }]);
  });

  it("handles multiple frames in a single chunk", () => {
    const out: Record<string, unknown>[] = [];
    const fwd = createSubsystemSseForwarder({ emit: (e) => out.push(e) });

    fwd(
      "auth",
      frame({ type: "agent_log", data: { n: 1 } }) + frame({ type: "agent_log", data: { n: 2 } }),
    );

    expect(out).toEqual([
      { type: "agent_log", data: { n: 1 } },
      { type: "agent_log", data: { n: 2 } },
    ]);
  });

  it("ignores unparseable frames (keep-alive comments)", () => {
    const out: Record<string, unknown>[] = [];
    const fwd = createSubsystemSseForwarder({ emit: (e) => out.push(e) });

    fwd("auth", ": keep-alive\n\n");
    fwd("auth", "data: not-json\n\n");

    expect(out).toEqual([]);
  });
});
