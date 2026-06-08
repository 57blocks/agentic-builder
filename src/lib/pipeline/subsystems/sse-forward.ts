/**
 * SSE event forwarder for subsystem-orchestration mode.
 *
 * `developBySubsystem` runs a large build as a SEQUENCE of scoped sub-calls to
 * POST /api/agents/coding (the foundation, then each domain layer). Each
 * sub-call is a full coding session with its OWN SSE lifecycle
 * (session_start … agent_* … session_complete). To present the whole
 * multi-domain build to the UI as ONE coding session, the orchestration entry:
 *
 *   1. emits exactly one `session_start` up front (with the full task list), and
 *   2. forwards each sub-call's INTERIOR events verbatim — agent_*,
 *      agent_task_*, agent_log, repair_event, gates, supervisor_log — since
 *      tasks/agents are keyed globally and land on the right rows, but
 *   3. SUPPRESSES each sub-call's own session_start / session_complete (which
 *      would otherwise reset the task list or mark the whole build "done" after
 *      just the foundation), and
 *   4. converts a sub-call's `session_error` into a `supervisor_log` so the user
 *      sees the failing-domain context without the store tearing the session
 *      down — the orchestration emits the single terminal session_complete /
 *      session_error itself based on the aggregate verdict.
 *
 * The forwarder receives raw SSE text chunks (as produced by the coding route)
 * via the orchestrator's `onProgress(subsystemId, chunk)` callback. Chunks may
 * split mid-frame, so it buffers and only parses complete `\n\n`-terminated
 * frames. Builds are serialized, so a single buffer across the whole run is safe.
 */

/** Event types a sub-call emits that must NOT reach the UI verbatim. */
const SUPPRESSED_TYPES = new Set(["session_start", "session_complete"]);

export interface ForwarderHooks {
  /** Emit a (already-shaped) SSE event object to the aggregate stream. */
  emit: (event: Record<string, unknown>) => void;
}

/**
 * Create a forwarder. Returns a function with the
 * `(subsystemId, chunk) => void` shape expected by `SubsystemCodingContext.onProgress`.
 */
export function createSubsystemSseForwarder(
  hooks: ForwarderHooks,
): (subsystemId: string, chunk: string) => void {
  let buffer = "";

  const handleFrame = (subsystemId: string, frame: string): void => {
    // A frame is one or more lines; we only care about the `data:` payload line.
    const dataLine = frame
      .split("\n")
      .find((l) => l.startsWith("data:"));
    if (!dataLine) return;
    const json = dataLine.slice("data:".length).trim();
    if (!json) return;

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(json) as Record<string, unknown>;
    } catch {
      return; // ignore unparseable frames (e.g. comments/keep-alives)
    }

    const type = event.type;

    if (type === "session_error") {
      // Surface the failing domain's context, but don't let it kill the
      // aggregate session — the orchestrator's verdict decides the outcome.
      const data = (event.data ?? {}) as { error?: unknown };
      const detail = typeof data.error === "string" ? data.error : "stream error";
      hooks.emit({
        type: "supervisor_log",
        data: { message: `[${subsystemId}] ${detail}` },
      });
      return;
    }

    if (typeof type === "string" && SUPPRESSED_TYPES.has(type)) return;

    // Pass everything else through unchanged.
    hooks.emit(event);
  };

  return (subsystemId: string, chunk: string): void => {
    buffer += chunk;
    const frames = buffer.split("\n\n");
    // The last element is an incomplete frame (or "") — keep it buffered.
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      if (frame.trim()) handleFrame(subsystemId, frame);
    }
  };
}
