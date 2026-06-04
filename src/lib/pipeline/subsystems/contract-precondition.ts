/**
 * P3.1 — Frozen-contract precondition.
 *
 * Before any business-domain build starts, the Phase-1 foundation MUST have
 * produced a complete, frozen API contract: every endpoint the manifest assigns
 * to a domain (`ownedApiEndpoints`) must already be declared in
 * `API_CONTRACTS.json`. Otherwise domain B cannot compile/integrate against
 * domain A's endpoints (cross-domain reads go through the frozen contract), and
 * the whole subsystem build collapses late instead of failing fast.
 *
 * Pure-ish: one file read + set comparison. Tolerates both contract shapes:
 *   - OpenAPI 3 (`{ paths: { "/p": { get: {...} } } }`)
 *   - flat array (`[{ method, endpoint }]`)
 */

import fs from "fs/promises";
import path from "path";
import type { SubsystemManifest } from "./types";
import { endpointMatchKey } from "./active-scope";

export interface ContractPreconditionResult {
  ok: boolean;
  /** Distinct endpoints declared by the contract. */
  contractEndpoints: number;
  /** Manifest endpoints ("METHOD /path") NOT covered by the contract. */
  missing: string[];
  /** Whether an API_CONTRACTS.json was found at all. */
  contractFound: boolean;
  reason?: string;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"];

/** Extract declared endpoints from either OpenAPI `paths` or a flat array. */
export function extractContractEndpoints(
  parsed: unknown,
): Array<{ method: string; endpoint: string }> {
  const out: Array<{ method: string; endpoint: string }> = [];
  if (Array.isArray(parsed)) {
    for (const e of parsed) {
      if (e && typeof e === "object" && (e as Record<string, unknown>).endpoint) {
        const o = e as Record<string, unknown>;
        out.push({ method: String(o.method ?? "GET").toUpperCase(), endpoint: String(o.endpoint) });
      }
    }
    return out;
  }
  if (parsed && typeof parsed === "object") {
    const paths = (parsed as Record<string, unknown>).paths;
    if (paths && typeof paths === "object") {
      for (const [p, ops] of Object.entries(paths as Record<string, unknown>)) {
        if (!ops || typeof ops !== "object") continue;
        for (const m of Object.keys(ops as Record<string, unknown>)) {
          if (HTTP_METHODS.includes(m.toLowerCase())) {
            out.push({ method: m.toUpperCase(), endpoint: p });
          }
        }
      }
    }
  }
  return out;
}

/** "METHOD /api/v1/..." → { method, endpoint }; null if unparseable. */
function parseManifestEndpoint(s: string): { method: string; endpoint: string } | null {
  const m = s.trim().match(/^([A-Za-z]+)\s+(\/\S*)$/);
  return m ? { method: m[1].toUpperCase(), endpoint: m[2] } : null;
}

async function readContractRaw(outputDir: string): Promise<string | null> {
  for (const rel of [path.join(".blueprint", "API_CONTRACTS.json"), "API_CONTRACTS.json"]) {
    try {
      return await fs.readFile(path.join(outputDir, rel), "utf8");
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Assert the contract covers every manifest-owned endpoint. `ok` is false when
 * the contract is missing/empty/unparseable or any owned endpoint is undeclared.
 */
export async function assertContractCoversManifest(
  outputDir: string,
  manifest: SubsystemManifest,
): Promise<ContractPreconditionResult> {
  const raw = await readContractRaw(outputDir);
  if (raw == null) {
    return { ok: false, contractEndpoints: 0, missing: [], contractFound: false, reason: "API_CONTRACTS.json not found" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, contractEndpoints: 0, missing: [], contractFound: true, reason: "API_CONTRACTS.json is not valid JSON" };
  }

  const declared = new Set(
    extractContractEndpoints(parsed).map((e) => endpointMatchKey(e.method, e.endpoint)),
  );

  const missing: string[] = [];
  const seen = new Set<string>();
  for (const sub of manifest.subsystems) {
    for (const owned of sub.ownedApiEndpoints) {
      const pe = parseManifestEndpoint(owned);
      if (!pe) continue;
      const key = endpointMatchKey(pe.method, pe.endpoint);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!declared.has(key)) missing.push(`${pe.method} ${pe.endpoint}`);
    }
  }

  if (declared.size === 0) {
    return { ok: false, contractEndpoints: 0, missing, contractFound: true, reason: "contract declares no endpoints" };
  }
  return {
    ok: missing.length === 0,
    contractEndpoints: declared.size,
    missing,
    contractFound: true,
    reason: missing.length ? `${missing.length} domain endpoint(s) not in the frozen contract` : undefined,
  };
}
