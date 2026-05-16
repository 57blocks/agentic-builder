import fs from "fs/promises";
import path from "path";
import { createAppDatabase } from "@/lib/deploy/database";

const RELATIVE_KICKOFF_DATABASE_FILE = path.join(".blueprint", "kickoff-database.json");

export interface KickoffDatabaseFile {
  databaseUrl: string;
  appName: string;
  savedAt: string;
}

export function kickoffDatabaseJsonPath(projectRoot: string): string {
  return path.join(projectRoot, RELATIVE_KICKOFF_DATABASE_FILE);
}

export async function saveKickoffDatabaseMetadata(
  projectRoot: string,
  data: { databaseUrl: string; appName: string },
): Promise<void> {
  const dir = path.join(projectRoot, ".blueprint");
  await fs.mkdir(dir, { recursive: true });
  const payload: KickoffDatabaseFile = {
    databaseUrl: data.databaseUrl,
    appName: data.appName,
    savedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    kickoffDatabaseJsonPath(projectRoot),
    JSON.stringify(payload, null, 2),
    "utf-8",
  );
}

export async function readKickoffDatabaseMetadata(
  projectRoot: string,
): Promise<KickoffDatabaseFile | null> {
  try {
    const raw = await fs.readFile(kickoffDatabaseJsonPath(projectRoot), "utf-8");
    return JSON.parse(raw) as KickoffDatabaseFile;
  } catch {
    return null;
  }
}

export interface KickoffDatabaseResult {
  ok: boolean;
  databaseUrl?: string;
  error?: string;
}

export async function createKickoffDatabase(params: {
  projectRoot: string;
  appName: string;
  connectionString: string;
}): Promise<KickoffDatabaseResult> {
  try {
    const databaseUrl = await createAppDatabase({
      connectionString: params.connectionString,
      appName: params.appName,
    });
    await saveKickoffDatabaseMetadata(params.projectRoot, {
      databaseUrl,
      appName: params.appName,
    });
    return { ok: true, databaseUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
