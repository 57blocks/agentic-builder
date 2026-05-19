"use client";

import { useEffect, useRef, useState } from "react";
import type { BrowserConsoleEntry, CallerLocation, ConsoleLevel } from "./types";

const MAX_ENTRIES = 500;

type Part =
  | { kind: "primitive"; value: string }
  | { kind: "json"; value: string }
  | { kind: "error"; name: string; message: string; stack?: string };

interface BridgeMessage {
  source: "agentic-preview";
  type: "console" | "error" | "unhandledrejection" | "bridge_ready";
  level?: ConsoleLevel;
  ts?: number;
  parts?: Part[];
  url?: string;
  caller?: CallerLocation;
}

// Number of characters of a JSON part to embed in the single-line preview.
// Anything longer (or multi-line) is still shown in full inside `detail`, so
// the operator can hit "expand" and see the entire pretty-printed payload —
// that's the bit the user noticed as "missing" file/object contents.
const TEXT_PREVIEW_BUDGET = 280;

function previewJson(value: string): string {
  // First non-empty line, trimmed; we keep the original (with newlines)
  // separately as the expandable detail so nothing is actually lost.
  const firstLine = value.split(/\r?\n/).find((l) => l.trim().length > 0) ?? value;
  const compact = firstLine.replace(/\s+/g, " ").trim();
  return compact.length > TEXT_PREVIEW_BUDGET
    ? compact.slice(0, TEXT_PREVIEW_BUDGET) + "…"
    : compact;
}

function formatParts(
  type: BridgeMessage["type"],
  parts: Part[] | undefined,
  url?: string,
): { text: string; detail?: string } {
  if (!parts || parts.length === 0) {
    return {
      text:
        type === "bridge_ready"
          ? `console bridge ready${url ? ` @ ${url}` : ""}`
          : "(empty)",
    };
  }
  const segments: string[] = [];
  const details: string[] = [];
  for (const p of parts) {
    if (p.kind === "primitive") {
      segments.push(p.value);
    } else if (p.kind === "json") {
      segments.push(previewJson(p.value));
      // Always retain the full payload — even if the one-line preview would
      // fit, the multi-line pretty print is what makes nested objects
      // readable. Without this the operator only sees the first ~280 chars.
      details.push(p.value);
    } else if (p.kind === "error") {
      segments.push(`${p.name}: ${p.message}`);
      if (p.stack) details.push(p.stack);
    } else if (typeof p === "object" && p && "message" in p) {
      // Legacy / pre-bridge-upgrade payloads — keep working so old previews
      // mid-upgrade still render something usable.
      const obj = p as {
        message?: string;
        stack?: string;
        filename?: string;
        lineno?: number;
        colno?: number;
      };
      const where = obj.filename
        ? ` @ ${obj.filename}:${obj.lineno ?? "?"}${obj.colno != null ? `:${obj.colno}` : ""}`
        : "";
      segments.push(`${obj.message ?? "(unknown error)"}${where}`);
      if (obj.stack) details.push(obj.stack);
    }
  }
  return {
    text: segments.join(" "),
    detail: details.length ? details.join("\n\n") : undefined,
  };
}

let nextId = 0;
function makeId() {
  nextId = (nextId + 1) % Number.MAX_SAFE_INTEGER;
  return `c${Date.now().toString(36)}_${nextId}`;
}

export function useIframeConsole(): {
  entries: BrowserConsoleEntry[];
  clear: () => void;
} {
  const [entries, setEntries] = useState<BrowserConsoleEntry[]>([]);
  const bufferRef = useRef<BrowserConsoleEntry[]>([]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const data = ev.data as BridgeMessage | undefined;
      if (!data || data.source !== "agentic-preview") return;
      const level: ConsoleLevel =
        data.level ?? (data.type === "error" || data.type === "unhandledrejection" ? "error" : "log");
      const { text, detail } = formatParts(data.type, data.parts, data.url);
      const entry: BrowserConsoleEntry = {
        id: makeId(),
        ts: data.ts ?? Date.now(),
        type: data.type,
        level,
        text,
        detail,
        url: data.url,
        caller: data.caller,
      };
      bufferRef.current = [...bufferRef.current, entry].slice(-MAX_ENTRIES);
      setEntries(bufferRef.current);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return {
    entries,
    clear: () => {
      bufferRef.current = [];
      setEntries([]);
    },
  };
}
