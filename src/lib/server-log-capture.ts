import { AsyncLocalStorage } from "node:async_hooks";
import { inspect } from "node:util";
import { bufferLog, getLogSink } from "@/lib/langgraph/server-log-bridge";

export interface LogContextStore {
  sessionId: string;
  taskId?: string;
  agentId?: string;
}

/** Carries the active coding session (and optional task) down the async call
 *  tree so the patched console can route each line to the right SSE sink. */
export const logContext = new AsyncLocalStorage<LogContextStore>();

type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";
const LEVELS: ConsoleLevel[] = ["log", "info", "warn", "error", "debug"];

let installed = false;

/** Idempotently patch console so every call still prints to the terminal AND,
 *  when inside a logContext, forwards a structured entry to the session sink. */
export function installServerLogCapture(): void {
  if (installed) return;
  installed = true;
  for (const level of LEVELS) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      orig(...args); // terminal output unchanged
      try {
        const store = logContext.getStore();
        if (!store?.sessionId) return; // no session context → terminal only
        const message = args
          .map((a) =>
            typeof a === "string"
              ? a
              : inspect(a, { depth: 3, breakLength: 120 }),
          )
          .join(" ");
        const entry = {
          level,
          message,
          taskId: store.taskId,
          timestamp: new Date().toISOString(),
        };
        const sink = getLogSink(store.sessionId);
        // Before the SSE sink attaches (prep phase), buffer so the lines aren't
        // lost — registerLogSink flushes the buffer when the stream opens.
        if (sink) sink(entry);
        else bufferLog(store.sessionId, entry);
      } catch {
        // Logging must never crash the caller.
      }
    };
  }
}

/** Resolve the id of the task a worker node is currently processing.
 *
 *  WorkerState identifies the active task by `currentTaskIndex` into `tasks`
 *  (`currentTaskId` is only returned transiently by pick_next_task for the SSE
 *  stream and is NOT a persisted channel, so it is absent from the state passed
 *  to later nodes). We therefore index into `tasks` here. Falls back to a bare
 *  `currentTaskId` field if present, for non-worker callers. */
function resolveTaskId(state: object): string | undefined {
  const s = state as {
    currentTaskIndex?: number;
    tasks?: Array<{ id?: string }>;
    currentTaskId?: string | null;
  };
  if (
    typeof s.currentTaskIndex === "number" &&
    Array.isArray(s.tasks) &&
    s.currentTaskIndex >= 0 &&
    s.currentTaskIndex < s.tasks.length
  ) {
    return s.tasks[s.currentTaskIndex]?.id ?? undefined;
  }
  return s.currentTaskId ?? undefined;
}

/** Wrap a LangGraph worker node so any console output during its execution is
 *  tagged with the task the node is processing.
 *
 *  The worker sub-graph runs via `workerGraph.invoke(...)`, and AsyncLocalStorage
 *  does NOT reliably propagate across that boundary — so we cannot count on the
 *  route's `enterWith({sessionId})` reaching here. Instead we read `sessionId`
 *  straight off WorkerState (the supervisor propagates it as a real channel),
 *  falling back to the inherited ALS store, then to empty. */
export function withTaskLogContext<S extends object, R>(
  node: (state: S) => R,
): (state: S) => R {
  return (state: S) => {
    const inherited = logContext.getStore();
    const sessionId =
      (state as { sessionId?: string }).sessionId ||
      inherited?.sessionId ||
      "";
    return logContext.run(
      { ...inherited, sessionId, taskId: resolveTaskId(state) },
      () => node(state),
    );
  };
}
