/**
 * Session-keyed bridge for forwarding captured server console output into the
 * coding route's SSE pipe. Mirrors worker-event-bridge.ts: the route registers
 * a sink at session start and removes it in finally{}, so a stale sink cannot
 * leak into a later session.
 */
export interface ServerLogEntry {
  level: "log" | "info" | "warn" | "error" | "debug";
  message: string;
  taskId?: string;
  timestamp: string;
}

export type LogSink = (entry: ServerLogEntry) => void;

const sinks = new Map<string, LogSink>();

/** Logs emitted before a session's sink attaches (e.g. scaffold / pnpm install
 *  prep, which runs before the SSE stream opens) are buffered here, keyed by
 *  sessionId, and flushed when registerLogSink fires. */
const pending = new Map<string, ServerLogEntry[]>();
const PENDING_CAP = 1000;

/** Buffer a log line for a session whose sink has not attached yet. */
export function bufferLog(sessionId: string, entry: ServerLogEntry): void {
  if (!sessionId) return;
  const arr = pending.get(sessionId) ?? [];
  arr.push(entry);
  if (arr.length > PENDING_CAP) arr.splice(0, arr.length - PENDING_CAP);
  pending.set(sessionId, arr);
}

export function registerLogSink(sessionId: string, sink: LogSink): void {
  if (!sessionId) return;
  sinks.set(sessionId, sink);
  // Flush anything captured before the sink attached, then drop ALL pending
  // buffers — a freshly-registered session means any older buffered sessions
  // (abandoned early-return paths) are stale and safe to discard.
  const buffered = pending.get(sessionId);
  pending.clear();
  if (buffered) {
    for (const entry of buffered) {
      try {
        sink(entry);
      } catch {
        // never let a flush failure break registration
      }
    }
  }
}

export function unregisterLogSink(sessionId: string): void {
  if (!sessionId) return;
  sinks.delete(sessionId);
  pending.delete(sessionId);
}

export function getLogSink(sessionId: string): LogSink | undefined {
  if (!sessionId) return undefined;
  return sinks.get(sessionId);
}
