import fs from "fs/promises";
import path from "path";

/**
 * Resource requirements — third-party credentials / API keys / OAuth secrets
 * derived from the PRD that the user must provide before coding so the
 * generated app can actually run.
 *
 * Layout on disk:
 *   .blueprint/resource-requirements.json
 *
 * Lifecycle:
 *   1. Kickoff phase: detector agent reads the PRD, emits a
 *      ResourceRequirement[] (envKey + label + description + category, value="").
 *   2. UI shows a form; user fills `value` for each item.
 *   3. Coding phase: writeBackendEnvFromResources merges the values into
 *      `<outputRoot>/backend/.env` (preserving existing keys, never overwriting
 *      DATABASE_URL / JWT_SECRET that we manage separately).
 *   4. Worker prompts get a list of available env keys via the Project
 *      Convention Card so they know what's wired up.
 */

export type ResourceCategory =
  | "auth"
  | "payment"
  | "email"
  | "storage"
  | "ai"
  | "analytics"
  | "messaging"
  | "maps"
  | "queue"
  | "logging"
  | "other";

/** Centralised list — kept in sync with ResourceCategory so detector parsing
 *  and any UI dropdowns can iterate without duplicating the literal union. */
export const RESOURCE_CATEGORIES: readonly ResourceCategory[] = [
  "auth",
  "payment",
  "email",
  "storage",
  "ai",
  "analytics",
  "messaging",
  "maps",
  "queue",
  "logging",
  "other",
] as const;

export interface ResourceRequirement {
  /** Canonical UPPER_SNAKE_CASE env var name, e.g. STRIPE_SECRET_KEY. */
  envKey: string;
  /** Human-friendly label shown in UI, e.g. "Stripe Secret Key". */
  label: string;
  /** One-sentence why-this-is-needed description from the PRD context. */
  description: string;
  category: ResourceCategory;
  /** When true, app cannot run without it; when false, it's optional. */
  required: boolean;
  /** Format hint shown as input placeholder, e.g. "sk_test_...". */
  example?: string;
  /** Documentation URL where the user can obtain this credential. */
  docsUrl?: string;
  /**
   * Non-secret toggle / configuration.
   *
   * Default = `false` (treated as a credential — value lives in `.env`,
   * never logged, never injected back into LLM context). Set `true` for
   * declarations whose value is a NAME / SWITCH (e.g. `LLM_PROVIDER` =
   * `"openai" | "gemini"`, `USE_REDIS_QUEUE` = `"1"`, `LOG_LEVEL` =
   * `"info"`). Non-secret declarations may surface their `value` in
   * downstream agent prompts so the worker writes provider-aware code
   * without guessing.
   */
  isConfig?: boolean;
  /**
   * User-provided value, persisted locally. Empty until the user fills it.
   * NEVER commit this file — covered by .blueprint/ pattern in .gitignore.
   */
  value: string;
}

const REQUIREMENTS_FILE_REL = path.join(
  ".blueprint",
  "resource-requirements.json",
);

export function resourceRequirementsFileAbs(projectRoot: string): string {
  return path.join(projectRoot, REQUIREMENTS_FILE_REL);
}

async function ensureBlueprintDir(projectRoot: string): Promise<void> {
  await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
}

/** Read the saved requirements list; returns [] when no file exists. */
export async function readResourceRequirements(
  projectRoot: string,
): Promise<ResourceRequirement[]> {
  try {
    const raw = await fs.readFile(
      resourceRequirementsFileAbs(projectRoot),
      "utf-8",
    );
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isResourceRequirement);
  } catch {
    return [];
  }
}

/**
 * Format the subset of declared-but-unfilled env keys as a Markdown block
 * for injection into the E2E test generator's prompt. The intent is to
 * have the generator wrap any test exercising a missing-key feature in
 * `test.skip(!process.env.X, "feature X requires env Y")` so the test
 * suite stays green for features whose external dependencies aren't
 * configured yet — and the gaps surface as visible "skipped" warnings
 * rather than silently-failing flaky tests.
 *
 * Returns an empty string when every required key is filled.
 *
 * Only `required` keys are included; optional keys (`SSO_*`, etc.) are
 * assumed acceptable to lack and shouldn't gate tests.
 */
export function formatUnfilledKeysForE2EPrompt(
  items: ResourceRequirement[],
): string {
  const unfilled = items.filter(
    (r) => r.required && !(r.value ?? "").trim(),
  );
  if (unfilled.length === 0) return "";

  const lines: string[] = [];
  lines.push("## Env keys NOT configured (skip dependent tests)");
  lines.push("");
  lines.push(
    "The following env vars are declared in the project but have no value. " +
      "Any test that exercises a feature depending on one of these MUST be " +
      "wrapped in `test.skip(!process.env.<KEY>, '<feature> requires <KEY>')` " +
      "so the suite stays green and the gap shows up as a visible 'skipped' " +
      "warning rather than a hard failure.",
  );
  lines.push("");
  for (const r of unfilled) {
    lines.push(
      `- \`${r.envKey}\` (${r.category}): ${r.description}`,
    );
  }
  lines.push("");
  lines.push(
    "Example pattern:",
    "```ts",
    "test('sends magic link email', async ({ page }) => {",
    "  test.skip(!process.env.SMTP_HOST, 'magic-link email requires SMTP_HOST');",
    "  // ... rest of test",
    "});",
    "```",
    "",
    "Group the skip-guard at the START of each `test()` (before any `page.goto`). " +
      "If an entire `test.describe` block depends on one key, use a single " +
      "`test.beforeAll(({}) => { test.skip(!process.env.X, '...'); })`.",
  );
  return lines.join("\n");
}

/** Overwrite the entire list (e.g. after detection or user save). */
export async function writeResourceRequirements(
  projectRoot: string,
  items: ResourceRequirement[],
): Promise<void> {
  await ensureBlueprintDir(projectRoot);
  const cleaned = items.filter(isResourceRequirement).map(normalize);
  await fs.writeFile(
    resourceRequirementsFileAbs(projectRoot),
    JSON.stringify(cleaned, null, 2) + "\n",
    "utf-8",
  );
}

/**
 * Merge a freshly-detected list with the existing one, preserving any
 * user-provided `value`s when the envKey matches.
 */
export function mergeDetectedRequirements(
  existing: ResourceRequirement[],
  detected: ResourceRequirement[],
): ResourceRequirement[] {
  const valueByKey = new Map(existing.map((e) => [e.envKey, e.value]));
  return detected.map((d) => ({
    ...d,
    value: valueByKey.get(d.envKey) ?? d.value ?? "",
  }));
}

/**
 * Format the user-provided values as `.env` lines. Skips empty values and
 * any key the caller wants to reserve (DATABASE_URL / JWT_SECRET are managed
 * separately and should be passed in via `reservedKeys` to avoid double-write).
 */
export function formatResourceEnvBlock(
  items: ResourceRequirement[],
  reservedKeys: ReadonlySet<string> = new Set(["DATABASE_URL", "JWT_SECRET", "JWT_EXPIRES_IN"]),
): string {
  const lines: string[] = [];
  for (const item of items) {
    if (!item.value || !item.value.trim()) continue;
    if (reservedKeys.has(item.envKey)) continue;
    lines.push(`${item.envKey}=${JSON.stringify(item.value)}`);
  }
  return lines.join("\n");
}

/**
 * Upsert all user-provided resource values into an existing .env payload.
 * - Keeps existing values for any key not yet provided by the user.
 * - Replaces existing values for keys the user filled in.
 * - Skips reserved keys (DATABASE_URL / JWT_SECRET) so we don't fight other writers.
 */
export function upsertResourceEnvVars(
  envContent: string,
  items: ResourceRequirement[],
  reservedKeys: ReadonlySet<string> = new Set(["DATABASE_URL", "JWT_SECRET", "JWT_EXPIRES_IN"]),
): string {
  let result = envContent.endsWith("\n") || envContent === "" ? envContent : `${envContent}\n`;

  for (const item of items) {
    if (!item.value || !item.value.trim()) continue;
    if (reservedKeys.has(item.envKey)) continue;
    const serialized = `${item.envKey}=${JSON.stringify(item.value)}`;
    const re = new RegExp(`^\\s*${escapeRe(item.envKey)}\\s*=.*$`, "m");
    if (re.test(result)) {
      result = result.replace(re, serialized);
    } else {
      result = `${result}${serialized}\n`;
    }
  }
  return result;
}

function isResourceRequirement(x: unknown): x is ResourceRequirement {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.envKey === "string" &&
    typeof o.label === "string" &&
    typeof o.description === "string" &&
    typeof o.category === "string"
  );
}

function normalize(item: ResourceRequirement): ResourceRequirement {
  return {
    envKey: item.envKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
    label: item.label.trim(),
    description: item.description.trim(),
    category: item.category,
    required: !!item.required,
    example: item.example?.trim() || undefined,
    docsUrl: item.docsUrl?.trim() || undefined,
    isConfig: item.isConfig === true ? true : undefined,
    value: item.value ?? "",
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
