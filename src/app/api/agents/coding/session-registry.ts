/**
 * Module-level registry of active coding sessions.
 * Keyed by the normalized absolute outputRoot path.
 *
 * Using a module-level Map works because all coding API route handlers run
 * in the same Node.js process (local dev / self-hosted). Serverless cold-starts
 * would reset the map, but for that scenario the worst case is the old session
 * runs to the next LangGraph chunk boundary before stopping.
 */
export const activeCodingSessions = new Map<string, AbortController>();
