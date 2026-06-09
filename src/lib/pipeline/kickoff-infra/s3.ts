import type { InfraServiceInfo } from "./types";

/**
 * S3 "provisioning" for generated apps.
 *
 * Unlike Postgres/Redis (each gets its own Dokploy container), S3 is a single
 * SHARED bucket configured once on the Agentic Builder server. Every generated
 * app gets an isolated FOLDER (key prefix) inside that one bucket — perfect for
 * throwaway test projects where spinning up a bucket per app is overkill.
 *
 * Required server env (set in Agentic Builder `.env.local`):
 *   BLUEPRINT_S3_BUCKET            — the shared bucket name (presence ENABLES S3)
 *   BLUEPRINT_S3_ACCESS_KEY_ID     — IAM access key with rw on the bucket
 *   BLUEPRINT_S3_SECRET_ACCESS_KEY — matching secret
 *
 * Optional server env:
 *   BLUEPRINT_S3_REGION            — defaults to "us-east-1"
 *   BLUEPRINT_S3_ENDPOINT          — for S3-compatible stores (MinIO, R2, etc.)
 *   BLUEPRINT_S3_FORCE_PATH_STYLE  — "1"/"true" for path-style addressing
 *
 * The generated app reads the standard AWS SDK env names plus AWS_S3_BUCKET /
 * AWS_S3_PREFIX so worker code can scope every object under its own folder.
 */

const DEFAULT_REGION = "us-east-1";

export interface SharedS3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle: boolean;
}

/**
 * Read the shared S3 config from server env. Returns null when S3 is not
 * configured (no bucket) so the caller can skip provisioning gracefully.
 * Throws when a bucket is set but credentials are incomplete — a half-configured
 * S3 is a deployment mistake we should surface, not silently skip.
 */
export function readSharedS3Config(): SharedS3Config | null {
  const bucket = process.env.BLUEPRINT_S3_BUCKET?.trim();
  if (!bucket) return null;

  const accessKeyId = process.env.BLUEPRINT_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.BLUEPRINT_S3_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "BLUEPRINT_S3_BUCKET is set but BLUEPRINT_S3_ACCESS_KEY_ID / " +
        "BLUEPRINT_S3_SECRET_ACCESS_KEY are missing — cannot provision S3.",
    );
  }

  const force = (process.env.BLUEPRINT_S3_FORCE_PATH_STYLE ?? "").trim();
  return {
    bucket,
    region: process.env.BLUEPRINT_S3_REGION?.trim() || DEFAULT_REGION,
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.BLUEPRINT_S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: force === "1" || force.toLowerCase() === "true",
  };
}

/**
 * Per-app folder inside the shared bucket. Slug-style, trailing slash so it
 * reads as a folder key prefix. Mirrors the postgres/redis name sanitiser.
 */
export function deriveS3Prefix(appName: string): string {
  let s = appName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40);
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (!s) s = "app";
  return `${s}/`;
}

/**
 * Build the env-var bundle the generated app needs to talk to its folder in
 * the shared bucket. Uses canonical AWS SDK names so off-the-shelf S3 client
 * code works without a custom config layer.
 */
export function buildS3EnvVars(
  config: SharedS3Config,
  prefix: string,
): Record<string, string> {
  const env: Record<string, string> = {
    AWS_REGION: config.region,
    AWS_ACCESS_KEY_ID: config.accessKeyId,
    AWS_SECRET_ACCESS_KEY: config.secretAccessKey,
    AWS_S3_BUCKET: config.bucket,
    AWS_S3_PREFIX: prefix,
  };
  if (config.endpoint) env.AWS_S3_ENDPOINT = config.endpoint;
  if (config.forcePathStyle) env.AWS_S3_FORCE_PATH_STYLE = "true";
  return env;
}

export interface ProvisionS3Params {
  appName: string;
}

/**
 * "Provision" S3 for an app: allocate a per-app folder prefix inside the
 * shared bucket and surface the credential bundle. No remote call — the bucket
 * already exists; isolation is by key prefix. Throws if S3 isn't configured
 * (caller should only invoke this when `readSharedS3Config()` is non-null).
 */
export function provisionAppS3(params: ProvisionS3Params): InfraServiceInfo {
  const config = readSharedS3Config();
  if (!config) {
    throw new Error(
      "S3 not configured — set BLUEPRINT_S3_BUCKET (+ credentials) to enable.",
    );
  }
  const prefix = deriveS3Prefix(params.appName);
  const env = buildS3EnvVars(config, prefix);
  const display = `s3://${config.bucket}/${prefix}`;
  return {
    kind: "s3",
    id: prefix,
    appName: config.bucket,
    publicUrl: display,
    internalUrl: display,
    externalPort: 0,
    env,
  };
}
