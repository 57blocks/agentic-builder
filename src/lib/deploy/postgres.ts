import { randomBytes } from "crypto";
import {
  createDokployPostgres,
  deployDokployPostgres,
  getDokployPostgres,
  removeDokployPostgres,
  saveDokployPostgresExternalPort,
  type DokployBase,
} from "./dokploy";

/**
 * Per-app Postgres provisioning via Dokploy Postgres Service API.
 * Mirrors deploy/redis.ts. Lives inside whichever Dokploy project the caller
 * passes (typically the per-app project created at kickoff).
 */

export function sanitizePostgresName(name: string): string {
  let s = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40);
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (!s || /^-/.test(s)) s = `app-${s}`.slice(0, 40);
  return s;
}

export function sanitizePostgresDatabaseName(name: string): string {
  let s = name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 63);
  s = s.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (!s || /^[0-9]/.test(s)) s = `app_${s}`.slice(0, 63);
  return s;
}

function hashOffset(appName: string, span: number): number {
  let h = 5381;
  for (const c of appName) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h % span;
}

export function allocatePostgresPort(
  appName: string,
  base = 5600,
  span = 200,
  attempt = 0,
): number {
  return base + ((hashOffset(appName, span) + attempt) % span);
}

export function generatePostgresPassword(): string {
  return randomBytes(24).toString("base64url");
}

export interface ProvisionAppPostgresParams {
  baseUrl: string;
  token: string;
  appName: string;
  projectId: string;
  environmentId: string;
  publicHost: string;
  portBase?: number;
}

export interface ProvisionAppPostgresResult {
  postgresId: string;
  appName: string;
  databaseName: string;
  databaseUser: string;
  publicUrl: string;
  internalUrl: string;
  password: string;
  externalPort: number;
}

const PORT_RETRY_MAX = 10;

export async function provisionAppPostgres(
  params: ProvisionAppPostgresParams,
): Promise<ProvisionAppPostgresResult> {
  const name = sanitizePostgresName(params.appName);
  const dbName = sanitizePostgresDatabaseName(params.appName);
  const dbUser = "app";
  const portBase = params.portBase ?? 5600;
  const password = generatePostgresPassword();

  const base: DokployBase = { baseUrl: params.baseUrl, token: params.token };

  const created = await createDokployPostgres({
    ...base,
    name,
    appName: name,
    projectId: params.projectId,
    environmentId: params.environmentId,
    databaseName: dbName,
    databaseUser: dbUser,
    databasePassword: password,
  });

  // Dokploy ignores externalPort in create body — set via dedicated
  // saveExternalPort call BEFORE deploy. On collision, shift port and retry.
  let externalPort = allocatePostgresPort(name, portBase);
  let lastError: unknown;
  for (let attempt = 0; attempt < PORT_RETRY_MAX; attempt++) {
    externalPort = allocatePostgresPort(name, portBase, 200, attempt);
    try {
      await saveDokployPostgresExternalPort({
        ...base,
        postgresId: created.postgresId,
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
      `Could not allocate Postgres external port after ${PORT_RETRY_MAX} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  await deployDokployPostgres({ ...base, postgresId: created.postgresId });

  const detail = await getDokployPostgres({
    ...base,
    postgresId: created.postgresId,
  });
  const finalPort = detail.externalPort ?? externalPort;
  const finalAppName = detail.appName ?? created.appName;
  const finalDbName = detail.databaseName ?? dbName;
  const finalDbUser = detail.databaseUser ?? dbUser;
  const finalPassword = detail.databasePassword ?? password;
  const enc = encodeURIComponent(finalPassword);

  const publicUrl = `postgresql://${finalDbUser}:${enc}@${params.publicHost}:${finalPort}/${finalDbName}`;
  const internalUrl = `postgresql://${finalDbUser}:${enc}@${finalAppName}:5432/${finalDbName}`;

  return {
    postgresId: created.postgresId,
    appName: finalAppName,
    databaseName: finalDbName,
    databaseUser: finalDbUser,
    publicUrl,
    internalUrl,
    password: finalPassword,
    externalPort: finalPort,
  };
}

export async function deprovisionAppPostgres(
  params: DokployBase & { postgresId: string },
): Promise<void> {
  await removeDokployPostgres(params);
}
