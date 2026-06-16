import fs from "fs/promises";
import path from "path";

/**
 * Contract↔schema reconciliation (CODEGEN_HARDENING — P0③).
 *
 * After P1②, `API_CONTRACTS.json` references shared‑schema type NAMES
 * (`requestType` / `responseType`) instead of re‑authoring shapes. This check
 * confirms every referenced type actually EXISTS in `shared/schema.ts` — i.e.
 * the contract and the schema agree on the type vocabulary. A referenced type
 * that's absent means either drift or the LLM's `MISSING_FROM_SCHEMA` flag (a
 * type the schema still needs). Read‑only; never throws.
 *
 * Forward-compatible: entries that only carry the legacy inline
 * `requestSchema`/`responseSchema` (no `*Type` name) are skipped, so this is a
 * no-op on pre-P1② contracts.
 */
export interface ContractReconcileResult {
  /** False when inputs are missing (no contract or no schema) — treated as ok. */
  checked: boolean;
  ok: boolean;
  /** Contract type references not found among the schema's exported names. */
  missing: Array<{
    endpoint: string;
    method: string;
    type: string;
    kind: "request" | "response";
  }>;
}

/** Type strings that don't need a schema export. */
const NON_SCHEMA_TYPES = new Set([
  "none",
  "null",
  "void",
  "unknown",
  "any",
  "string",
  "number",
  "boolean",
  "object",
  "date",
]);

/** Names exported from a schema.ts source (interface/type/enum/const). */
export function exportedTypeNames(schemaSrc: string): Set<string> {
  const names = new Set<string>();
  const re = /export\s+(?:interface|type|enum|const)\s+([A-Za-z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(schemaSrc)) !== null) names.add(m[1]!);
  return names;
}

/** Reduce a type reference (e.g. `Course[]`, `Promise<Course>`) to its leading identifier. */
export function baseTypeName(t: string): string {
  const trimmed = t.trim();
  const idMatch = trimmed.match(/[A-Za-z_$][\w$]*/);
  return idMatch ? idMatch[0] : trimmed;
}

async function readFirstExisting(
  outputDir: string,
  rels: string[],
): Promise<string | null> {
  for (const rel of rels) {
    try {
      const src = await fs.readFile(path.join(outputDir, rel), "utf8");
      if (src.trim()) return src;
    } catch {
      // try next
    }
  }
  return null;
}

interface ContractEntry {
  endpoint?: string;
  method?: string;
  requestType?: string;
  responseType?: string;
}

export async function reconcileContractWithSchema(
  outputDir: string,
): Promise<ContractReconcileResult> {
  let contractsRaw: string;
  try {
    contractsRaw = await fs.readFile(
      path.join(outputDir, "API_CONTRACTS.json"),
      "utf8",
    );
  } catch {
    return { checked: false, ok: true, missing: [] };
  }

  const schemaSrc = await readFirstExisting(outputDir, [
    "backend/src/shared/schema.ts",
    "frontend/src/shared/schema.ts",
    "src/shared/schema.ts",
  ]);
  if (!schemaSrc) return { checked: false, ok: true, missing: [] };

  let entries: unknown;
  try {
    entries = JSON.parse(contractsRaw);
  } catch {
    return { checked: false, ok: true, missing: [] };
  }
  if (!Array.isArray(entries)) return { checked: false, ok: true, missing: [] };

  const exported = exportedTypeNames(schemaSrc);
  const missing: ContractReconcileResult["missing"] = [];

  for (const raw of entries as ContractEntry[]) {
    for (const kind of ["request", "response"] as const) {
      const typeRef = kind === "request" ? raw.requestType : raw.responseType;
      if (typeof typeRef !== "string" || !typeRef.trim()) continue;
      if (NON_SCHEMA_TYPES.has(typeRef.trim().toLowerCase())) continue;
      const base = baseTypeName(typeRef);
      if (!base || NON_SCHEMA_TYPES.has(base.toLowerCase())) continue;
      if (!exported.has(base)) {
        missing.push({
          endpoint: raw.endpoint ?? "(unknown)",
          method: raw.method ?? "(unknown)",
          type: typeRef,
          kind,
        });
      }
    }
  }

  return { checked: true, ok: missing.length === 0, missing };
}
