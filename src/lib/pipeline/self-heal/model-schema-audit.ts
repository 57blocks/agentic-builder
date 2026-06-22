/**
 * Backend model ↔ shared-schema field-alignment audit.
 *
 * The shared schema (`shared/schema.ts`) is the single source of truth for every
 * entity that crosses the API boundary. Backend ORM models must mirror the
 * matching `interface`'s fields — they must NOT invent scalar columns the schema
 * doesn't declare. Workers regularly hallucinate `status` enums and `isDeleted`
 * booleans onto models even when the schema models status-as-column and
 * soft-delete-as-`deletedAt`; this audit catches that drift.
 *
 * Conservative + heuristic by design (like wiring-audit): findings are `partial`
 * AuditEntry verdicts keyed `MODEL-<Entity>` (a non-frontend id, so the
 * audit-repair dispatcher routes them to a scoped BACKEND repair worker). They
 * never enter hardUncovered, so a false positive costs at most one bounded repair
 * pass, never a blocked run. Only EXTRA scalar columns are reported (a model
 * having more than the schema); missing fields are left to type-checking. Disable
 * with MODEL_SCHEMA_AUDIT_ENABLED=0.
 */

import fs from "fs/promises";
import path from "path";

import type { CodingTask } from "@/lib/pipeline/types";
import type { AuditEntry, AuditTaskSummary } from "./feature-checklist-audit";
import type { RepairEmitter } from "./events";

function enabled(): boolean {
  return process.env.MODEL_SCHEMA_AUDIT_ENABLED !== "0";
}

const SHARED_SCHEMA_RELS = [
  "backend/src/shared/schema.ts",
  "src/shared/schema.ts",
  "shared/schema.ts",
];

const MODEL_FILE_RE = /(?:^|\/)(?:models|entities)\/([A-Z][A-Za-z0-9]*)\.ts$/;

/**
 * Parse `export interface <Name> { ... }` blocks from shared-schema source into
 * a map of Entity → set of (lowercased) top-level field names.
 */
export function parseSchemaInterfaces(src: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const re = /export\s+interface\s+([A-Z][A-Za-z0-9]*)\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const body = m[2];
    const fields = new Set<string>();
    for (const line of body.split(/\r?\n/)) {
      // Match `fieldName?: Type;` / `fieldName: Type;` at the start of a line.
      const fm = line.match(/^\s*([a-zA-Z_$][\w$]*)\s*\??\s*:/);
      if (fm) fields.add(fm[1].toLowerCase());
    }
    if (fields.size > 0) out.set(name, fields);
  }
  return out;
}

/**
 * Extract the SCALAR column names a Sequelize/TypeORM-style model declares,
 * from `declare <name>: <type>;` lines. Conservative: we skip declarations that
 * look like ORM associations or mixin methods (their type references another
 * entity, is an array, or is a function), since those don't add scalar columns.
 *
 * Returns lowercased names. `knownEntities` lets us treat `declare project:
 * Project` as an association (skip) rather than a scalar field.
 */
export function parseModelScalarFields(
  src: string,
  knownEntities: Set<string>,
): string[] {
  const out: string[] = [];
  const re = /\bdeclare\s+([a-zA-Z_$][\w$]*)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const type = m[2].trim();
    // Mixin methods (getX/setX/createX/...) are typed as functions — skip.
    if (/=>/.test(type) || /\bFunction\b/.test(type)) continue;
    // Association: array of entities, or a bare/optional entity reference.
    if (/\[\]/.test(type)) continue;
    const baseType = type
      .replace(/CreationOptional<|NonAttribute<|InferAttributes<|>/g, "")
      .replace(/\s*\|\s*null/g, "")
      .replace(/\s*\|\s*undefined/g, "")
      .trim();
    if (knownEntities.has(baseType)) continue; // declare project: Project → assoc
    out.push(name.toLowerCase());
  }
  return out;
}

/** Map a model file path to its entity name (Task.ts → "Task"). */
export function entityNameForModelFile(rel: string): string | null {
  const m = rel.match(MODEL_FILE_RE);
  return m ? m[1] : null;
}

export interface ModelSchemaAuditInput {
  tasks: CodingTask[];
  taskResults: AuditTaskSummary[];
  outputDir: string;
  emitter?: RepairEmitter;
}

/**
 * Returns `partial` AuditEntry findings for backend models whose scalar columns
 * exceed their shared-schema interface. Empty when disabled, when the schema is
 * absent/unparseable, or when nothing drifts.
 */
export async function auditModelSchemaAlignment(
  input: ModelSchemaAuditInput,
): Promise<AuditEntry[]> {
  if (!enabled()) return [];

  // Load + parse the shared schema once.
  let schemaSrc = "";
  for (const rel of SHARED_SCHEMA_RELS) {
    try {
      schemaSrc = await fs.readFile(path.join(input.outputDir, rel), "utf-8");
      if (schemaSrc.trim()) break;
    } catch {
      /* try next */
    }
  }
  if (!schemaSrc.trim()) return [];
  const interfaces = parseSchemaInterfaces(schemaSrc);
  if (interfaces.size === 0) return [];
  const knownEntities = new Set(interfaces.keys());

  // Collect candidate model files from backend task results (deduped).
  const modelRels = new Set<string>();
  for (const tr of input.taskResults) {
    for (const f of tr.generatedFiles ?? []) {
      if (entityNameForModelFile(f)) modelRels.add(f);
    }
  }

  const out: AuditEntry[] = [];
  const seen = new Set<string>();

  for (const rel of modelRels) {
    const entity = entityNameForModelFile(rel);
    if (!entity) continue;
    const schemaFields = interfaces.get(entity);
    if (!schemaFields) continue; // no matching interface → can't judge; skip.

    let modelSrc = "";
    try {
      modelSrc = await fs.readFile(path.join(input.outputDir, rel), "utf-8");
    } catch {
      continue;
    }
    if (!modelSrc.trim()) continue;

    const modelFields = parseModelScalarFields(modelSrc, knownEntities);
    const extra = [...new Set(modelFields)].filter((f) => !schemaFields.has(f));
    if (extra.length === 0) continue;

    const id = `MODEL-${entity}`;
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      verdict: "partial",
      layer: "l2",
      reason:
        `Backend model \`${rel}\` declares field(s) not present in the shared ` +
        `schema's \`${entity}\` interface: ${extra.join(", ")}. The shared schema ` +
        `is the single source of truth — remove these columns from the model, or ` +
        `(if genuinely required by the contract) add them to \`shared/schema.ts\` ` +
        `first so frontend and backend stay in sync. Common offenders: a \`status\` ` +
        `enum that duplicates a column/foreign-key relationship, and an ` +
        `\`isDeleted\` boolean that duplicates \`deletedAt\`.`,
      coveringTaskIds: [],
      evidence: extra,
      category: "schema-drift",
    });
  }

  if (out.length > 0) {
    input.emitter?.({
      stage: "post-gen-audit",
      event: "model_schema_drift_findings",
      missingIds: out.map((e) => e.id),
      details: { count: out.length },
    });
  }

  return out;
}
