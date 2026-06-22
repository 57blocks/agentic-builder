import { describe, it, expect, vi } from "vitest";
import {
  registerLogSink,
  unregisterLogSink,
  getLogSink,
  bufferLog,
  type ServerLogEntry,
} from "../server-log-bridge";

const entry = (message: string): ServerLogEntry => ({
  level: "log",
  message,
  timestamp: "2026-06-22T00:00:00.000Z",
});

describe("server-log-bridge", () => {
  it("registers, retrieves and removes a sink by sessionId", () => {
    const sink = vi.fn();
    expect(getLogSink("s1")).toBeUndefined();
    registerLogSink("s1", sink);
    expect(getLogSink("s1")).toBe(sink);
    unregisterLogSink("s1");
    expect(getLogSink("s1")).toBeUndefined();
  });

  it("ignores empty sessionId", () => {
    const sink = vi.fn();
    registerLogSink("", sink);
    expect(getLogSink("")).toBeUndefined();
  });

  it("flushes pre-registration buffered logs in order when the sink attaches", () => {
    bufferLog("buf1", entry("prep A"));
    bufferLog("buf1", entry("prep B"));
    const received: string[] = [];
    registerLogSink("buf1", (e) => received.push(e.message));
    expect(received).toEqual(["prep A", "prep B"]);
    unregisterLogSink("buf1");
  });

  it("drops stale buffered sessions when a new sink registers", () => {
    bufferLog("stale", entry("orphan"));
    const staleSink = vi.fn();
    // Registering a DIFFERENT session clears all pending buffers, so the stale
    // session's buffer is discarded rather than replayed if it later attaches.
    registerLogSink("fresh", vi.fn());
    registerLogSink("stale", staleSink);
    expect(staleSink).not.toHaveBeenCalled();
    unregisterLogSink("fresh");
    unregisterLogSink("stale");
  });
});
