/**
 * Raw-HTTP-in-views audit (frontend contract enforcement — the deterministic
 * teeth behind the "use the typed API client" prompt rule).
 *
 * A generated typed client (`frontend/src/api/endpoints.ts`, derived from the
 * shared schema's ENDPOINTS registry) gives COMPILE-time safety — but only for
 * calls that actually go through it. Whether a view uses `api.<service>.<method>`
 * vs a hand-written `fetch("/api/v1/…")` is otherwise governed only by a
 * role-prompt HARD RULE, which is probabilistic. This audit makes it
 * deterministic: it scans each frontend task's view/component files (.tsx/.jsx)
 * for raw HTTP — `fetch(` / `axios` / `XMLHttpRequest`, a direct low-level
 * `apiClient` reference, or a hand-assembled `/api/…` URL string — and turns
 * each offender into a repair finding.
 *
 * CRUCIALLY, findings are `partial` verdicts (like wiring-audit /
 * model-schema-audit): they DRIVE a bounded repair through the existing
 * audit-repair dispatch but NEVER enter hardUncovered, so they never flip the
 * audit's `passed` and never block or halt the coding run. A false positive
 * costs at most one scoped repair pass. Disable with RAW_HTTP_AUDIT_ENABLED=0.
 *
 * The .ts api layer (client.ts / endpoints.ts / per-domain api modules) is NOT
 * scanned — the `.tsx/.jsx` filter excludes it, so the legitimate `apiClient`
 * usage inside the client layer is never flagged.
 */

import fs from "fs/promises";
import path from "path";

import type { CodingTask } from "@/lib/pipeline/types";
import type { AuditEntry, AuditTaskSummary } from "./feature-checklist-audit";
import type { RepairEmitter } from "./events";

const VIEW_SOURCE_RE = /\.(tsx|jsx)$/;
const FRONTEND_ID_RE = /^(PAGE|CMP|IC)-/i;

function enabled(): boolean {
  return process.env.RAW_HTTP_AUDIT_ENABLED !== "0";
}

export interface RawHttpHit {
  kind: string;
  line: number;
  snippet: string;
}

/** Conservative line detectors. Each is a raw way to reach the backend that
 *  bypasses the typed `api` surface. */
const DETECTORS: { kind: string; re: RegExp }[] = [
  // `fetch(` but not `refetch(` / `prefetch(` / `x.fetch(` (negative lookbehind
  // on an identifier char or dot).
  { kind: "raw fetch()", re: /(?<![A-Za-z0-9_.$])fetch\s*\(/ },
  { kind: "axios", re: /\baxios\b/ },
  { kind: "XMLHttpRequest", re: /\bXMLHttpRequest\b/ },
  // Direct use of the low-level client in a view — must go through `api.*`.
  { kind: "direct apiClient", re: /\bapiClient\b/ },
  // Hand-assembled API URL string, e.g. "/api/v1/cart" or `/api/users`.
  { kind: "hand-written /api/ URL", re: /["'`]\/api\/(?:v\d+\/)?[a-z]/i },
];

/** Pure: line-level raw-HTTP hits in a source file. Skips comment lines. */
export function detectRawHttp(source: string): RawHttpHit[] {
  const hits: RawHttpHit[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }
    for (const d of DETECTORS) {
      if (d.re.test(lines[i]!)) {
        hits.push({ kind: d.kind, line: i + 1, snippet: trimmed.slice(0, 120) });
        break; // one hit per line is enough to flag it
      }
    }
  }
  return hits;
}

export interface RawHttpAuditInput {
  tasks: CodingTask[];
  taskResults: AuditTaskSummary[];
  outputDir: string;
  emitter?: RepairEmitter;
}

/** The frontend requirement id to key a finding on (so the dispatcher routes it
 *  to a scoped FRONTEND repair). Falls back to a synthetic CMP- id — still
 *  frontend-prefixed — when the task declares no PAGE/CMP/IC id. */
function frontendIdFor(task: CodingTask): string {
  const covered = (task.coversRequirementIds ?? []).filter((id) =>
    FRONTEND_ID_RE.test(id),
  );
  return covered[0] ?? `CMP-rawhttp-${task.id}`;
}

/**
 * Returns `partial` AuditEntry findings — one per offending frontend id — for
 * views that reach the backend without the typed client. Empty when disabled or
 * nothing raw is found.
 */
export async function auditRawHttpUsage(
  input: RawHttpAuditInput,
): Promise<AuditEntry[]> {
  if (!enabled()) return [];

  const resultsById = new Map(input.taskResults.map((r) => [r.id, r]));
  const out: AuditEntry[] = [];
  const seen = new Set<string>();

  for (const task of input.tasks) {
    const tr = resultsById.get(task.id);
    const files = (tr?.generatedFiles ?? []).filter((f) => VIEW_SOURCE_RE.test(f));
    if (files.length === 0) continue;

    const offenders: { file: string; hit: RawHttpHit }[] = [];
    for (const rel of files) {
      let src: string;
      try {
        src = await fs.readFile(path.join(input.outputDir, rel), "utf-8");
      } catch {
        continue; // file not on disk — skip
      }
      for (const hit of detectRawHttp(src)) offenders.push({ file: rel, hit });
    }
    if (offenders.length === 0) continue;

    const id = frontendIdFor(task);
    if (seen.has(id)) continue;
    seen.add(id);

    const first = offenders[0]!;
    const kinds = [...new Set(offenders.map((o) => o.hit.kind))].join(", ");
    out.push({
      id,
      verdict: "partial",
      layer: "l2",
      reason:
        `View code reaches the backend without the typed client (${kinds}). ` +
        `The frontend MUST call the backend ONLY through the generated client: ` +
        `\`import { api } from "@/api/endpoints"\` then \`api.<service>.<method>(...)\` ` +
        `(each method's \`/** METHOD /path */\` doc names its endpoint). Replace every ` +
        `raw \`fetch\`/\`axios\`/\`apiClient\`/\`/api/\` URL in these files with the matching ` +
        `\`api.*\` call — a wrong endpoint or field then fails at compile time. ` +
        `First offender: ${first.file}:${first.hit.line} — \`${first.hit.snippet}\``,
      coveringTaskIds: [task.id],
      evidence: offenders
        .slice(0, 12)
        .map((o) => `${o.file}:${o.hit.line} (${o.hit.kind})`),
      category: "wiring",
    });
  }

  if (out.length > 0) {
    input.emitter?.({
      stage: "post-gen-audit",
      event: "raw_http_audit_findings",
      missingIds: out.map((e) => e.id),
      details: { count: out.length },
    });
  }

  return out;
}
