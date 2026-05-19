export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

/**
 * Resolved call site of a console.* invocation or window error event.
 * Captured inside the iframe by walking `new Error().stack` and matching
 * the first module-shaped frame. Without this each row would lose the
 * original `App.tsx:42:8` reference that the native devtools shows.
 */
export interface CallerLocation {
  file: string;
  line: number;
  col: number;
}

export interface BrowserConsoleEntry {
  id: string;
  ts: number;
  type: "console" | "error" | "unhandledrejection" | "bridge_ready";
  level: ConsoleLevel;
  /** Pre-formatted single-line message for the row. */
  text: string;
  /** Optional full payload (e.g. stack) shown on expand. */
  detail?: string;
  url?: string;
  caller?: CallerLocation;
}
