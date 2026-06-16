import fs from "fs/promises";
import path from "path";

/**
 * Schema-change protocol (CODEGEN_HARDENING — P2).
 *
 * The shared `schema.ts` is the single AUTHORED source of truth and is
 * scaffold-protected: workers are told never to rewrite it. But sometimes a
 * worker discovers, mid-implementation, that the contract is genuinely wrong
 * (a field the PRD requires is missing, a type is the wrong shape, an endpoint
 * has no type at all). The old failure mode was a worker silently editing its
 * LOCAL copy of the schema — which desyncs front/back and defeats the single
 * source of truth.
 *
 * The controlled path: a worker emits a structured **schema-change-request**
 * (append-only JSONL) instead of editing anything. A contract-owner arbiter
 * (the architect/TRD agent) later validates each request against the PRD,
 * applies accepted ones to the ONE blueprint `shared-schema.ts`, re-derives
 * `API_CONTRACTS.json`, re-distributes, and re-queues the producer/consumer
 * tasks that reference the changed type.
 *
 * This module is the deterministic core: append, read, and compute which tasks
 * are made stale by a set of accepted changes. The arbiter's PRD-validation +
 * schema-edit step is LLM-driven and wired separately.
 */

export const SCHEMA_CHANGE_REQUESTS_REL = ".ralph/schema-change-requests.jsonl";

export type SchemaChangeKind =
  | "missing-type"
  | "missing-field"
  | "wrong-type"
  | "other";

export interface SchemaChangeRequest {
  /** Task that surfaced the problem. */
  taskId: string;
  /** The schema type the request is about (the name the worker expected). */
  typeName: string;
  /** Specific field, when the issue is field-level. */
  field?: string;
  kind: SchemaChangeKind;
  /** Why the current schema can't satisfy the PRD / endpoint. */
  reason: string;
  /** Proposed fix — free text or a TS snippet the arbiter can adapt. */
  proposedChange: string;
  /** Related endpoint, when applicable (e.g. "POST /api/v1/enroll"). */
  endpoint?: string;
  /** ISO timestamp; caller-supplied so this stays deterministic/testable. */
  createdAt?: string;
}

/** Arbiter verdict appended after review (kept in a sibling file). */
export const SCHEMA_CHANGE_DECISIONS_REL =
  ".ralph/schema-change-decisions.jsonl";

export interface SchemaChangeDecision {
  request: SchemaChangeRequest;
  decision: "accepted" | "rejected";
  /** Arbiter rationale (PRD-grounded). */
  rationale: string;
  /** Type names whose definition changed when accepted (for stale-task calc). */
  changedTypes: string[];
  decidedAt?: string;
}

function parseJsonl<T>(raw: string): T[] {
  const out: T[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as T);
    } catch {
      // skip malformed line — append-only logs tolerate partial writes
    }
  }
  return out;
}

async function appendJsonl(
  outputDir: string,
  rel: string,
  record: unknown,
): Promise<void> {
  const abs = path.join(outputDir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.appendFile(abs, JSON.stringify(record) + "\n", "utf8");
}

async function readJsonl<T>(outputDir: string, rel: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(outputDir, rel), "utf8");
    return parseJsonl<T>(raw);
  } catch {
    return [];
  }
}

export async function appendSchemaChangeRequest(
  outputDir: string,
  req: SchemaChangeRequest,
): Promise<void> {
  await appendJsonl(outputDir, SCHEMA_CHANGE_REQUESTS_REL, req);
}

export async function readSchemaChangeRequests(
  outputDir: string,
): Promise<SchemaChangeRequest[]> {
  return readJsonl<SchemaChangeRequest>(outputDir, SCHEMA_CHANGE_REQUESTS_REL);
}

export async function appendSchemaChangeDecision(
  outputDir: string,
  decision: SchemaChangeDecision,
): Promise<void> {
  await appendJsonl(outputDir, SCHEMA_CHANGE_DECISIONS_REL, decision);
}

export async function readSchemaChangeDecisions(
  outputDir: string,
): Promise<SchemaChangeDecision[]> {
  return readJsonl<SchemaChangeDecision>(
    outputDir,
    SCHEMA_CHANGE_DECISIONS_REL,
  );
}

/** Requests not yet covered by a decision (matched by taskId + typeName + field). */
export function pendingRequests(
  requests: SchemaChangeRequest[],
  decisions: SchemaChangeDecision[],
): SchemaChangeRequest[] {
  const decidedKeys = new Set(
    decisions.map((d) => requestKey(d.request)),
  );
  return requests.filter((r) => !decidedKeys.has(requestKey(r)));
}

function requestKey(r: SchemaChangeRequest): string {
  return `${r.taskId}::${r.typeName}::${r.field ?? ""}`;
}

/** Minimal task shape needed to compute staleness — anything with id + searchable text. */
export interface StaleTaskCandidate {
  id: string;
  /** Concatenated task text the arbiter searches for type references. */
  text: string;
}

/**
 * Given the set of type names whose definition changed (from accepted
 * decisions), return the ids of tasks whose text references any of those types
 * — these producers/consumers must be re-verified against the new contract.
 *
 * Word-boundary match so `Course` doesn't spuriously match `CourseList`.
 */
export function staleTaskIds(
  changedTypes: string[],
  tasks: StaleTaskCandidate[],
): string[] {
  const types = changedTypes
    .map((t) => t.trim())
    .filter((t) => /^[A-Za-z_$][\w$]*$/.test(t));
  if (types.length === 0) return [];
  const stale = new Set<string>();
  for (const task of tasks) {
    for (const type of types) {
      const re = new RegExp(`\\b${type}\\b`);
      if (re.test(task.text)) {
        stale.add(task.id);
        break;
      }
    }
  }
  return [...stale];
}

/** Flatten accepted decisions into the distinct set of changed type names. */
export function acceptedChangedTypes(
  decisions: SchemaChangeDecision[],
): string[] {
  const types = new Set<string>();
  for (const d of decisions) {
    if (d.decision !== "accepted") continue;
    for (const t of d.changedTypes) {
      const trimmed = t.trim();
      if (trimmed) types.add(trimmed);
    }
  }
  return [...types];
}
