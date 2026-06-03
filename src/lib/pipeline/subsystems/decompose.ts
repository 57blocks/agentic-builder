/**
 * Phase-0 decomposer: PRD → subsystem manifest (business-domain decomposition).
 *
 * Pipeline:
 *   1. extractPrdInventory(prd) — the partition set (routes / endpoints / collections).
 *   2. LLM groups the inventory into business domains + a dependency DAG.
 *   3. validateSubsystemManifest(..., coverage=inventory) — hard checks.
 *   4. On failure, feed the exact errors + unassigned items back for a bounded
 *      repair round (mirrors the self-heal pattern).
 *
 * The prompt/parse/repair helpers are pure and unit-tested; the LLM call itself
 * is validated by a real run (like the runtime data gate).
 */

import {
  chatCompletion,
  resolveModel,
  estimateCost,
  type ChatMessage,
} from "@/lib/openrouter";
import { MODEL_CONFIG } from "@/lib/model-config";

import { extractPrdInventory, type PrdInventory } from "./inventory";
import {
  validateSubsystemManifest,
  type ManifestValidationResult,
} from "./validate";
import type { Subsystem, SubsystemManifest } from "./types";
import { SUBSYSTEM_MANIFEST_VERSION } from "./types";

export interface DecomposeOptions {
  model?: string;
  tier?: "S" | "M" | "L";
  /** Max LLM repair rounds after the first attempt (default 2). */
  maxRepairAttempts?: number;
}

export interface DecomposeResult {
  manifest: SubsystemManifest;
  validation: ManifestValidationResult;
  attempts: number;
  costUsd: number;
  /** True when the LLM never produced a valid (ok) manifest. */
  didFallback: boolean;
}

// ─── Prompt building (pure) ─────────────────────────────────────────────────

export function buildDecomposerSystemPrompt(): string {
  return [
    "You decompose a large product (PRD) into BUSINESS-DOMAIN subsystems that teams can build separately on a shared, globally-built data layer.",
    "",
    "## Rules",
    "1. Group by business DOMAIN (a noun: auth, catalog, enrollment, billing, scheduling, approvals, messaging, admin-ops, …). Do NOT group by role/URL prefix — `/admin/*` and `/teacher/*` are ROLES that span many domains.",
    "2. EXCLUSIVE ownership: every route and every API endpoint in the provided inventory belongs to EXACTLY ONE subsystem. No item may be omitted or owned twice.",
    "3. `dependsOn` lists other subsystem ids that must be built first (build/contract dependencies). The graph MUST be acyclic.",
    "4. Cross-domain data is read through the frozen API contract, never by owning another domain's collections. An aggregation/overview page (e.g. an admin report) is owned by the CONSUMER domain; the data it shows comes via contract.",
    "5. Each `ownedModules` entry is an inferred code path: backend `backend/src/api/modules/<resource>` from the endpoint resource, and/or frontend page dirs.",
    "6. Keep domains cohesive: a domain may span multiple roles (e.g. `enrollment` owns both the family enrollment pages and the admin enrollment-management page).",
    "7. CROSS-CUTTING WORKFLOWS get their OWN domain — do NOT fold them into a catch-all admin domain. In particular: an approvals/review workflow (approve/reject/lock of refunds, leave, work-hours, waitlist) is its own `approvals` domain; a notifications/messaging system is its own `messaging` domain. They dependOn the domains whose requests they process.",
    "8. RIGHT-SIZE — aim for the FEWEST domains that satisfy these rules. For a large PRD that is typically 8–12 domains. Two-sided guardrail:",
    "   - UPPER: no domain owns more than ~25 endpoints. Split an oversized catch-all (e.g. admin-ops) by sub-resource (settings, reports, finance, …).",
    "   - LOWER: do NOT create a domain with fewer than ~3 endpoints unless it is a genuinely independent cross-cutting workflow (rule 7). Merge small sibling resources into their natural parent — e.g. rooms→scheduling, policy-agreements→auth, a single dashboard→its learning/family domain.",
    "",
    "## Output — STRICT JSON only, no prose",
    "{",
    '  "subsystems": [',
    "    {",
    '      "id": "kebab-case",',
    '      "name": "短名",',
    '      "description": "one line",',
    '      "ownedRoutes": ["/path", ...],',
    '      "ownedApiEndpoints": ["METHOD /api/v1/...", ...],',
    '      "ownedCollections": ["collectionName", ...],',
    '      "ownedModules": ["backend/src/api/modules/x", ...],',
    '      "dependsOn": ["other-subsystem-id", ...],',
    '      "prdSections": ["§10.4", ...]',
    "    }",
    "  ]",
    "}",
    "",
    "Assign EVERY inventory route and endpoint. Output ONLY the JSON object.",
  ].join("\n");
}

/** Compact H2/H3 outline so the model sees structure without the full PRD. */
export function extractOutline(prd: string, max = 200): string {
  const lines = prd.split("\n").filter((l) => /^#{2,3}\s+\S/.test(l));
  return lines.slice(0, max).join("\n");
}

export function buildDecomposerUserMessage(
  prd: string,
  inventory: PrdInventory,
): string {
  return [
    "## PRD outline (H2/H3)",
    extractOutline(prd),
    "",
    "## Inventory to partition (assign each to exactly one subsystem)",
    `### Routes (${inventory.routes.length})`,
    inventory.routes.join("\n"),
    "",
    `### API endpoints (${inventory.apiEndpoints.length})`,
    inventory.apiEndpoints.join("\n"),
    "",
    `### Data collections (${inventory.collections.length}) — owned by the writer domain`,
    inventory.collections.join(", "),
  ].join("\n");
}

/** Parse the LLM JSON into a manifest. Returns null when unparseable / shapeless. */
export function parseSubsystemManifestFromLlm(
  raw: string,
  opts?: { tier?: "S" | "M" | "L"; generatedAt?: string },
): SubsystemManifest | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
  const obj = parsed as { subsystems?: unknown };
  if (!obj || !Array.isArray(obj.subsystems)) return null;
  const subsystems: Subsystem[] = obj.subsystems
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      id: String(s.id ?? "").trim(),
      name: String(s.name ?? s.id ?? "").trim(),
      description: typeof s.description === "string" ? s.description : undefined,
      requirementIds: asStringArray(s.requirementIds),
      ownedRoutes: asStringArray(s.ownedRoutes) ?? [],
      ownedApiEndpoints: asStringArray(s.ownedApiEndpoints) ?? [],
      ownedCollections: asStringArray(s.ownedCollections) ?? [],
      ownedModules: asStringArray(s.ownedModules) ?? [],
      dependsOn: asStringArray(s.dependsOn) ?? [],
      prdSections: asStringArray(s.prdSections) ?? [],
    }))
    .filter((s) => s.id.length > 0);
  if (subsystems.length === 0) return null;
  return {
    version: SUBSYSTEM_MANIFEST_VERSION,
    tier: opts?.tier,
    generatedAt: opts?.generatedAt,
    subsystems,
  };
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string");
}

/** Repair feedback: tell the LLM exactly what to fix. Caps lists to stay terse. */
export function buildRepairMessage(
  validation: ManifestValidationResult,
  inventory: PrdInventory,
  manifest: SubsystemManifest | null,
): string {
  const lines = ["Your decomposition failed validation. Fix ALL of these and return the corrected JSON:"];
  for (const e of validation.errors.slice(0, 30)) lines.push(`- ${e}`);

  // Surface unassigned inventory items explicitly (the most common failure).
  if (manifest) {
    const ownedRoutes = new Set(manifest.subsystems.flatMap((s) => s.ownedRoutes));
    const ownedEps = new Set(manifest.subsystems.flatMap((s) => s.ownedApiEndpoints));
    const missingRoutes = inventory.routes.filter((r) => !ownedRoutes.has(r));
    const missingEps = inventory.apiEndpoints.filter((e) => !ownedEps.has(e));
    if (missingRoutes.length) lines.push(`UNASSIGNED routes (${missingRoutes.length}): ${missingRoutes.slice(0, 40).join(", ")}`);
    if (missingEps.length) lines.push(`UNASSIGNED endpoints (${missingEps.length}): ${missingEps.slice(0, 40).join(", ")}`);
  }
  return lines.join("\n");
}

// ─── Orchestration (LLM) ────────────────────────────────────────────────────

export async function decomposePrdIntoSubsystems(
  prd: string,
  opts?: DecomposeOptions,
): Promise<DecomposeResult> {
  const model = opts?.model ?? resolveModel(MODEL_CONFIG.prdSpecExtract);
  const maxRepair = opts?.maxRepairAttempts ?? 2;
  const inventory = extractPrdInventory(prd);

  const messages: ChatMessage[] = [
    { role: "system", content: buildDecomposerSystemPrompt() },
    { role: "user", content: buildDecomposerUserMessage(prd, inventory) },
  ];

  const coverage = {
    routes: inventory.routes,
    apiEndpoints: inventory.apiEndpoints,
    collections: inventory.collections,
  };

  let costUsd = 0;
  let lastManifest: SubsystemManifest | null = null;
  let lastValidation: ManifestValidationResult = {
    ok: false,
    errors: ["decomposer did not run"],
    warnings: [],
    buildLayers: [],
  };

  for (let attempt = 0; attempt <= maxRepair; attempt++) {
    let raw: string;
    try {
      const resp = await chatCompletion(messages, {
        model,
        temperature: 0.1,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      });
      raw = resp.choices[0]?.message?.content ?? "";
      costUsd += estimateCost(resp.model, resp.usage);
    } catch (err) {
      lastValidation = {
        ok: false,
        errors: [`LLM call failed: ${err instanceof Error ? err.message : String(err)}`],
        warnings: [],
        buildLayers: [],
      };
      break;
    }

    const manifest = parseSubsystemManifestFromLlm(raw, { tier: opts?.tier });
    if (!manifest) {
      lastValidation = { ok: false, errors: ["LLM output was not a parseable manifest."], warnings: [], buildLayers: [] };
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: "That was not valid manifest JSON. Return ONLY the JSON object described." });
      continue;
    }

    lastManifest = manifest;
    lastValidation = validateSubsystemManifest(manifest, coverage);
    if (lastValidation.ok) {
      return { manifest, validation: lastValidation, attempts: attempt + 1, costUsd, didFallback: false };
    }

    if (attempt < maxRepair) {
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: buildRepairMessage(lastValidation, inventory, manifest) });
    }
  }

  return {
    manifest: lastManifest ?? { version: SUBSYSTEM_MANIFEST_VERSION, tier: opts?.tier, subsystems: [] },
    validation: lastValidation,
    attempts: maxRepair + 1,
    costUsd,
    didFallback: true,
  };
}
