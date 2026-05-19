import { randomBytes } from "crypto";
import {
  createDokployRedis,
  deployDokployRedis,
  getDokployRedis,
  removeDokployRedis,
  saveDokployRedisExternalPort,
  type DokployBase,
} from "./dokploy";
import {
  resolveSharedDokployProject,
  deriveRedisHost,
} from "./dokploy-shared-project";

/**
 * Per-project Redis provisioning via Dokploy Redis Service API.
 *
 * Required env:
 *   DOKPLOY_URL — e.g. https://dokploy.example.com
 *   DOKPLOY_TOKEN  — `x-api-key` token
 *
 * Optional env:
 *   DOKPLOY_SHARED_PROJECT_NAME — defaults to "agentic-builder-shared-infra"
 *   DOKPLOY_REDIS_HOST          — defaults to URL hostname of DOKPLOY_URL
 *   DOKPLOY_REDIS_PORT_BASE     — defaults to 16000
 */

/** Sanitize an app name for use as Dokploy Redis service `name`/`appName`. */
export function sanitizeRedisName(name: string): string {
  let s = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40);
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (!s || /^-/.test(s)) s = `app-${s}`.slice(0, 40);
  return s;
}

/** Deterministic hash offset 0..span-1 for an app name. */
function hashOffset(appName: string, span: number): number {
  let h = 5381;
  for (const c of appName) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h % span;
}

/** Public host port per app. `attempt` shifts to next port on collision retry. */
export function allocatePort(
  appName: string,
  base = 5800,
  span = 200,
  attempt = 0,
): number {
  return base + ((hashOffset(appName, span) + attempt) % span);
}

/** 24-byte url-safe random password for the Redis instance. */
export function generateRedisPassword(): string {
  return randomBytes(24).toString("base64url");
}

export interface ProvisionAppRedisParams {
  baseUrl: string;
  token: string;
  appName: string;
  projectId: string;
  environmentId: string;
  publicHost: string;
  portBase?: number;
}

export interface CreateRedisParams {
  /** Used to name the Redis service. */
  appName: string;
  /** Path of the Agentic Builder workspace, for caching shared project IDs. */
  projectRoot: string;
}

export interface CreateRedisResult {
  /** Public URL — what to write into the developer's `.env`. */
  url: string;
  /** Internal hostname URL — what compose services should use in production. */
  internalUrl: string;
  /** Dokploy redisId — keep for later deprovision. */
  redisId: string;
  appName: string;
}

/**
 * One-shot entry point: read DOKPLOY_URL / DOKPLOY_TOKEN from env,
 * resolve (or auto-create) the shared infra project, provision a Redis,
 * return the public URL. Throws if Dokploy env is missing.
 */
export async function createRedisForApp(
  params: CreateRedisParams,
): Promise<CreateRedisResult> {
  const baseUrl = process.env.DOKPLOY_URL?.trim();
  const token = process.env.DOKPLOY_TOKEN?.trim();
  if (!baseUrl || !token) {
    throw new Error(
      "DOKPLOY_URL and DOKPLOY_TOKEN are required to provision Redis.",
    );
  }
  const base: DokployBase = { baseUrl, token };
  const { projectId, environmentId } = await resolveSharedDokployProject({
    base,
    projectRoot: params.projectRoot,
  });
  const publicHost = deriveRedisHost(baseUrl);
  const portBase = Number(process.env.DOKPLOY_REDIS_PORT_BASE ?? "");

  const r = await provisionAppRedis({
    baseUrl,
    token,
    appName: params.appName,
    projectId,
    environmentId,
    publicHost,
    portBase: Number.isFinite(portBase) && portBase > 0 ? portBase : undefined,
  });
  return {
    url: r.publicUrl,
    internalUrl: r.internalUrl,
    redisId: r.redisId,
    appName: r.appName,
  };
}

export interface ProvisionAppRedisResult {
  redisId: string;
  appName: string;
  /** Public URL the developer's `pnpm dev` can connect to. */
  publicUrl: string;
  /** Internal URL Dokploy compose services should use (dokploy-network). */
  internalUrl: string;
  password: string;
  externalPort: number;
}

const PORT_RETRY_MAX = 10;

export async function provisionAppRedis(
  params: ProvisionAppRedisParams,
): Promise<ProvisionAppRedisResult> {
  const name = sanitizeRedisName(params.appName);
  const portBase = params.portBase ?? 5800;
  const password = generateRedisPassword();

  const base: DokployBase = { baseUrl: params.baseUrl, token: params.token };

  const created = await createDokployRedis({
    ...base,
    name,
    appName: name,
    projectId: params.projectId,
    environmentId: params.environmentId,
    password,
  });

  // Dokploy's create endpoint ignores externalPort — set via dedicated
  // saveExternalPort call BEFORE deploy. On collision, shift port and retry.
  let externalPort = allocatePort(name, portBase);
  let lastError: unknown;
  for (let attempt = 0; attempt < PORT_RETRY_MAX; attempt++) {
    externalPort = allocatePort(name, portBase, 200, attempt);
    try {
      await saveDokployRedisExternalPort({
        ...base,
        redisId: created.redisId,
        externalPort,
      });
      lastError = null;
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) {
    throw new Error(
      `Could not allocate Redis external port after ${PORT_RETRY_MAX} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  await deployDokployRedis({ ...base, redisId: created.redisId });

  // Re-read to capture the actually-applied port.
  const detail = await getDokployRedis({ ...base, redisId: created.redisId });
  const finalPort = detail.externalPort ?? externalPort;
  const finalAppName = detail.appName ?? created.appName;
  const finalPassword = detail.password ?? password;

  const enc = encodeURIComponent(finalPassword);
  const publicUrl = `redis://default:${enc}@${params.publicHost}:${finalPort}`;
  const internalUrl = `redis://default:${enc}@${finalAppName}:6379`;

  return {
    redisId: created.redisId,
    appName: finalAppName,
    publicUrl,
    internalUrl,
    password: finalPassword,
    externalPort: finalPort,
  };
}

/** Tear down a per-app Redis. Safe to call on missing ID (caller decides what to do with errors). */
export async function deprovisionAppRedis(
  params: DokployBase & { redisId: string },
): Promise<void> {
  await removeDokployRedis(params);
}
