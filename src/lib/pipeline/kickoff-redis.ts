import fs from "fs/promises";
import path from "path";
import { createRedisForApp } from "@/lib/deploy/redis";

const RELATIVE_KICKOFF_REDIS_FILE = path.join(".blueprint", "kickoff-redis.json");

export interface KickoffRedisFile {
  /** Public URL (developer's local `pnpm dev` uses this). */
  redisUrl: string;
  /** Internal URL (Dokploy compose services use this). */
  internalUrl: string;
  appName: string;
  redisId: string;
  externalPort: number;
  savedAt: string;
}

export function kickoffRedisJsonPath(projectRoot: string): string {
  return path.join(projectRoot, RELATIVE_KICKOFF_REDIS_FILE);
}

export async function saveKickoffRedisMetadata(
  projectRoot: string,
  data: Omit<KickoffRedisFile, "savedAt">,
): Promise<void> {
  const dir = path.join(projectRoot, ".blueprint");
  await fs.mkdir(dir, { recursive: true });
  const payload: KickoffRedisFile = { ...data, savedAt: new Date().toISOString() };
  await fs.writeFile(
    kickoffRedisJsonPath(projectRoot),
    JSON.stringify(payload, null, 2),
    "utf-8",
  );
}

export async function readKickoffRedisMetadata(
  projectRoot: string,
): Promise<KickoffRedisFile | null> {
  try {
    const raw = await fs.readFile(kickoffRedisJsonPath(projectRoot), "utf-8");
    return JSON.parse(raw) as KickoffRedisFile;
  } catch {
    return null;
  }
}

export interface KickoffRedisResult {
  ok: boolean;
  redisUrl?: string;
  appName?: string;
  redisId?: string;
  externalPort?: number;
  error?: string;
}

export interface CreateKickoffRedisParams {
  projectRoot: string;
  appName: string;
}

export async function createKickoffRedis(
  params: CreateKickoffRedisParams,
): Promise<KickoffRedisResult> {
  try {
    const result = await createRedisForApp({
      projectRoot: params.projectRoot,
      appName: params.appName,
    });
    // We need externalPort for the metadata file. Re-parse from the public URL.
    const externalPort = Number(new URL(result.url).port) || 6379;
    await saveKickoffRedisMetadata(params.projectRoot, {
      redisUrl: result.url,
      internalUrl: result.internalUrl,
      appName: result.appName,
      redisId: result.redisId,
      externalPort,
    });
    return {
      ok: true,
      redisUrl: result.url,
      appName: result.appName,
      redisId: result.redisId,
      externalPort,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
