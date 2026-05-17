/**
 * Static catalog of known environment variables that AgenticBuilder-generated
 * projects commonly require. Used by the Setup Wizard to render a sensible
 * per-key form (with signup URLs, feature descriptions, and "what happens if
 * you skip" copy) AND to generate SETUP.md.
 *
 * When a new TRD introduces a key not in this catalog, the Wizard renders it
 * as a generic "vendor" entry — but the experience is much better when an
 * explicit catalog entry exists. Add new entries here as you observe new
 * keys in TRDs.
 */

export type EnvKeyCategory =
  | "infrastructure" // DB / cache / queue — usually covered by docker-compose
  | "auto"           // app-generated random secrets (JWT_SECRET, cookie keys)
  | "vendor"         // third-party API key required for feature
  | "auth"           // mail / SSO — required for login flow
  | "deploy";        // CI/CD / SSH / image registry — only needed at deploy time

export interface EnvKeyMeta {
  /** Exact env var name, e.g. "COINGECKO_API_KEY". */
  key: string;
  /** Human-readable label shown in the Wizard. */
  displayName: string;
  category: EnvKeyCategory;
  /** Markdown-formatted one-liner shown beneath the input field. */
  feature: string;
  /** External signup / docs URL. */
  signupUrl?: string;
  /** True when the vendor offers a free tier sufficient for v1 testing. */
  freeTierOk?: boolean;
  /** What happens when this key is missing at runtime. Shown when user toggles "Skip". */
  skipBehavior: string;
  /** If present, the Wizard auto-fills this value and the field is read-only. */
  autoGenerate?: () => string;
  /** Input type — for masking secrets vs. showing URLs. */
  inputType: "password" | "text" | "url" | "email";
  /** Default value (used as placeholder; not pre-filled into .env unless `autoGenerate`). */
  defaultValue?: string;
}

/** Crypto-random hex for auto-generated secrets. Node + browser compatible. */
function randomHex(bytes: number): string {
  if (typeof globalThis.crypto !== "undefined" && "getRandomValues" in globalThis.crypto) {
    const arr = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Last-resort fallback — should never run client-side modernly.
  let out = "";
  for (let i = 0; i < bytes; i++) out += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  return out;
}

export const ENV_KEY_CATALOG: EnvKeyMeta[] = [
  // ── Infrastructure (docker-compose default covers these) ────────────────
  {
    key: "DATABASE_URL",
    displayName: "PostgreSQL connection",
    category: "infrastructure",
    feature: "Primary database — required for all persistence",
    skipBehavior: "App will not start.",
    inputType: "url",
    defaultValue: "postgresql://app:app@localhost:5432/app",
  },
  {
    key: "REDIS_URL",
    displayName: "Redis connection",
    category: "infrastructure",
    feature: "Cache + BullMQ job queue",
    skipBehavior: "Background jobs disabled; in-process setInterval fallback used.",
    inputType: "url",
    defaultValue: "redis://localhost:6379",
  },

  // ── Auto-generated secrets ──────────────────────────────────────────────
  {
    key: "AUTH_JWT_SECRET",
    displayName: "JWT signing secret",
    category: "auto",
    feature: "Signs session JWTs",
    skipBehavior: "Cannot skip — auto-generated.",
    autoGenerate: () => randomHex(32),
    inputType: "password",
  },

  // ── Vendor API keys ─────────────────────────────────────────────────────
  {
    key: "COINGECKO_API_KEY",
    displayName: "CoinGecko API",
    category: "vendor",
    feature: "Market cap & volume data (MC-1, MC-5, MC-8)",
    signupUrl: "https://www.coingecko.com/en/api/pricing",
    freeTierOk: true,
    skipBehavior: "MC-1/MC-5/MC-8 data feeds marked stale; composite score excludes them.",
    inputType: "password",
  },
  {
    key: "QUOTIENT_API_KEY",
    displayName: "Quotient on-chain analytics",
    category: "vendor",
    feature: "Holder concentration data (OC-7)",
    signupUrl: "https://www.quotientapi.com",
    freeTierOk: false,
    skipBehavior: "OC-7 data feed marked stale; composite score excludes it.",
    inputType: "password",
  },
  {
    key: "X_BEARER_TOKEN",
    displayName: "X (Twitter) API v2 bearer",
    category: "vendor",
    feature: "Social sentiment volume (SE-2)",
    signupUrl: "https://developer.x.com/en/products/x-api",
    freeTierOk: true,
    skipBehavior: "SE-2 data feed marked stale; composite score excludes it.",
    inputType: "password",
  },
  {
    key: "JINA_API_KEY",
    displayName: "Jina Reader",
    category: "vendor",
    feature: "HTML→text extraction for news (SE-4) + reserve attestations (RQ-1/3/4)",
    signupUrl: "https://jina.ai/reader",
    freeTierOk: true,
    skipBehavior: "SE-4 and RQ-1/3/4 attestation pipelines fail; affected feeds marked stale.",
    inputType: "password",
  },
  {
    key: "ANTHROPIC_API_KEY",
    displayName: "Anthropic Claude",
    category: "vendor",
    feature: "LLM for sentiment classification (SE-4) and reserve extraction (RQ-1/3/4)",
    signupUrl: "https://console.anthropic.com",
    freeTierOk: false,
    skipBehavior: "Sentiment classification + reserve extraction unavailable; affected feeds marked stale. (OPENAI_API_KEY is a viable alternative.)",
    inputType: "password",
  },
  {
    key: "OPENAI_API_KEY",
    displayName: "OpenAI",
    category: "vendor",
    feature: "Alternative LLM provider for SE-4 + RQ-1/3/4. Required if ANTHROPIC_API_KEY is not set.",
    signupUrl: "https://platform.openai.com/api-keys",
    freeTierOk: false,
    skipBehavior: "If ANTHROPIC_API_KEY is also missing, sentiment + reserve extraction unavailable.",
    inputType: "password",
  },

  // ── SMTP for magic-link login ───────────────────────────────────────────
  {
    key: "SMTP_HOST",
    displayName: "SMTP server",
    category: "auth",
    feature: "Sends magic-link login emails + admin notifications",
    skipBehavior: "Magic-link login won't deliver emails. Use Mailtrap dev sandbox or a real SMTP server.",
    inputType: "text",
    defaultValue: "sandbox.smtp.mailtrap.io",
  },
  {
    key: "SMTP_PORT",
    displayName: "SMTP port",
    category: "auth",
    feature: "Usually 587 (TLS) or 465 (SSL) or 2525 (Mailtrap dev)",
    skipBehavior: "Defaults to 587 in code.",
    inputType: "text",
    defaultValue: "587",
  },
  {
    key: "SMTP_USER",
    displayName: "SMTP username",
    category: "auth",
    feature: "Usually the email address or vendor-issued account",
    skipBehavior: "Magic-link emails unauthenticated → most providers refuse.",
    inputType: "text",
  },
  {
    key: "SMTP_PASSWORD",
    displayName: "SMTP password",
    category: "auth",
    feature: "Vendor-issued app password or SMTP credential",
    skipBehavior: "Same as missing SMTP_USER.",
    inputType: "password",
  },
  {
    key: "SMTP_FROM",
    displayName: "From email address",
    category: "auth",
    feature: "What recipients see as the sender",
    skipBehavior: "Defaults to noreply@localhost in code (may be rejected by spam filters).",
    inputType: "email",
    defaultValue: "noreply@example.com",
  },

  // ── Deploy (optional, fill later) ───────────────────────────────────────
  {
    key: "DOCKERHUB_USERNAME",
    displayName: "DockerHub username",
    category: "deploy",
    feature: "Image registry for `deploy.sh` push step",
    signupUrl: "https://hub.docker.com",
    freeTierOk: true,
    skipBehavior: "`deploy.sh` fails at the push step. Local dev unaffected.",
    inputType: "text",
  },
  {
    key: "DOCKERHUB_TOKEN",
    displayName: "DockerHub access token",
    category: "deploy",
    feature: "Auth for DockerHub push",
    skipBehavior: "`deploy.sh` cannot authenticate.",
    inputType: "password",
  },
  {
    key: "IMAGE_TAG",
    displayName: "Image tag",
    category: "deploy",
    feature: "Tag applied to pushed image",
    skipBehavior: "Defaults to `latest`.",
    inputType: "text",
    defaultValue: "latest",
  },
  {
    key: "SERVER_HOST",
    displayName: "Deploy target host",
    category: "deploy",
    feature: "Remote SSH host for `deploy.sh`",
    skipBehavior: "`deploy.sh` cannot SSH; manual deploy required.",
    inputType: "text",
  },
  {
    key: "SERVER_USER",
    displayName: "Deploy target user",
    category: "deploy",
    feature: "Remote SSH user",
    skipBehavior: "Defaults to `root`.",
    inputType: "text",
    defaultValue: "ubuntu",
  },
  {
    key: "SSH_KEY_PATH",
    displayName: "SSH private key path",
    category: "deploy",
    feature: "Local path to the SSH key used by `deploy.sh`",
    skipBehavior: "`deploy.sh` cannot SSH.",
    inputType: "text",
    defaultValue: "~/.ssh/id_ed25519",
  },
];

/** Look up catalog metadata for a given env key. Returns a generic fallback
 *  entry when the key is unknown, so the Wizard can still render it. */
export function getEnvKeyMeta(key: string): EnvKeyMeta {
  const hit = ENV_KEY_CATALOG.find((e) => e.key === key);
  if (hit) return hit;
  return {
    key,
    displayName: key,
    category: "vendor",
    feature: "(no catalog entry — treat as optional vendor credential)",
    skipBehavior: "App may degrade silently. Inspect TRD §12 for usage context.",
    inputType: "password",
  };
}
