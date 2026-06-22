/**
 * Deterministic frontend↔backend API-prefix synchroniser.
 *
 * The frontend reaches the backend through a single composed prefix:
 *
 *     client API_BASE  +  caller business path  ==  backend mount prefix + route
 *
 * The ONLY robust single source of truth for that prefix is the backend's
 * actual `new Router({ prefix })` mount — NOT a hardcoded string, because the
 * mount is project-specific (the TRD's ENDPOINTS registry decides whether it's
 * `/api`, `/api/v1`, …). This module reads that real mount prefix and writes it
 * into the frontend client's `API_BASE` default, so callers can pass ONLY the
 * business path and never have to mentally reconcile two halves of the prefix.
 *
 * Pure core (`computeSyncedClientSource`) is a string→string transform for unit
 * tests; `syncClientApiBase` is the I/O wrapper invoked on the backend→frontend
 * edge (before any frontend worker runs).
 */
import { fsRead, fsWrite } from "@/lib/langgraph/tools";
import type { RepairEmitter } from "./events";

const CLIENT_REL = "frontend/src/api/client.ts";
const MODULES_INDEX_REL = "backend/src/api/modules/index.ts";

/** Normalise a mount prefix: leading slash, collapse `//`, strip trailing `/`. */
function normalisePrefix(p: string): string {
  let out = p.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/{2,}/g, "/");
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

/**
 * Extract the backend root apiRouter mount prefix — the literal in
 * `new Router({ prefix: "<prefix>" })`. Returns null when absent.
 */
export function extractMountPrefix(modulesIndexSrc: string): string | null {
  const m = modulesIndexSrc.match(
    /new\s+Router\s*\(\s*\{[^}]*prefix\s*:\s*["'`]([^"'`]+)["'`]/,
  );
  return m ? normalisePrefix(m[1]) : null;
}

/**
 * Extract the current `API_BASE` default literal from the client source — the
 * value in `import.meta.env.VITE_API_BASE_URL || "<base>"` (or `?? "<base>"`).
 * Returns null when the pattern is absent.
 */
export function extractClientBase(clientSrc: string): string | null {
  const m = clientSrc.match(
    /(import\.meta\.env\.VITE_API_BASE_URL\s*(?:\|\||\?\?)\s*)["'`]([^"'`]*)["'`]/,
  );
  return m ? m[2] : null;
}

export interface ClientBaseSyncResult {
  /** True when the client source was rewritten. */
  changed: boolean;
  /** New source (unchanged when `changed` is false). */
  source: string;
  /** The mount prefix the base was aligned to (null when not derivable). */
  mountPrefix: string | null;
  /** The previous base literal (null when not derivable). */
  previousBase: string | null;
}

/**
 * Pure: given the frontend client source and the backend modules/index source,
 * rewrite the client's `API_BASE` default so it equals the backend mount prefix.
 * No-op (changed=false) when the mount prefix can't be derived, the client base
 * literal is absent, or they already match. Never touches a `VITE_API_BASE_URL`
 * env override — only the fallback default literal is rewritten.
 */
export function computeSyncedClientSource(
  clientSrc: string,
  modulesIndexSrc: string,
): ClientBaseSyncResult {
  const mountPrefix = extractMountPrefix(modulesIndexSrc);
  const previousBase = extractClientBase(clientSrc);
  if (mountPrefix == null || previousBase == null) {
    return { changed: false, source: clientSrc, mountPrefix, previousBase };
  }
  if (previousBase === mountPrefix) {
    return { changed: false, source: clientSrc, mountPrefix, previousBase };
  }
  // Replace ONLY the default-literal portion, preserving the
  // `import.meta.env.VITE_API_BASE_URL ||` prefix and the quote style.
  const source = clientSrc.replace(
    /(import\.meta\.env\.VITE_API_BASE_URL\s*(?:\|\||\?\?)\s*)(["'`])[^"'`]*\2/,
    `$1$2${mountPrefix}$2`,
  );
  return {
    changed: source !== clientSrc,
    source,
    mountPrefix,
    previousBase,
  };
}

export interface SyncClientApiBaseResult {
  applied: boolean;
  reason: string;
  mountPrefix: string | null;
  previousBase: string | null;
}

/**
 * I/O wrapper. Reads the backend mount prefix + frontend client base, and when
 * they diverge, rewrites the client's `API_BASE` default to the mount prefix so
 * `base + business-path` always composes to a real backend route. Invoked on
 * the backend→frontend edge so every frontend worker sees the correct base.
 */
export async function syncClientApiBase(input: {
  outputDir: string;
  emitter?: RepairEmitter;
}): Promise<SyncClientApiBaseResult> {
  const { outputDir, emitter } = input;

  const modulesIndexSrc = await fsRead(MODULES_INDEX_REL, outputDir);
  if (
    modulesIndexSrc.startsWith("FILE_NOT_FOUND") ||
    modulesIndexSrc.startsWith("REJECTED")
  ) {
    return {
      applied: false,
      reason: "backend modules/index.ts not found",
      mountPrefix: null,
      previousBase: null,
    };
  }
  const clientSrc = await fsRead(CLIENT_REL, outputDir);
  if (
    clientSrc.startsWith("FILE_NOT_FOUND") ||
    clientSrc.startsWith("REJECTED")
  ) {
    return {
      applied: false,
      reason: "frontend client.ts not found",
      mountPrefix: null,
      previousBase: null,
    };
  }

  const result = computeSyncedClientSource(clientSrc, modulesIndexSrc);
  if (!result.changed) {
    return {
      applied: false,
      reason:
        result.mountPrefix == null
          ? "backend mount prefix not derivable"
          : result.previousBase == null
            ? "client API_BASE literal not found"
            : `client base already aligned to ${result.mountPrefix}`,
      mountPrefix: result.mountPrefix,
      previousBase: result.previousBase,
    };
  }

  const writeRes = await fsWrite(CLIENT_REL, result.source, outputDir);
  if (writeRes.startsWith("ERROR")) {
    return {
      applied: false,
      reason: `write failed: ${writeRes}`,
      mountPrefix: result.mountPrefix,
      previousBase: result.previousBase,
    };
  }

  emitter?.({
    stage: "generate_api_contracts",
    event: "client_api_base_synced",
    details: {
      mountPrefix: result.mountPrefix,
      previousBase: result.previousBase,
      file: CLIENT_REL,
    },
  });
  return {
    applied: true,
    reason: `aligned client API_BASE "${result.previousBase}" → "${result.mountPrefix}" (backend mount prefix)`,
    mountPrefix: result.mountPrefix,
    previousBase: result.previousBase,
  };
}
