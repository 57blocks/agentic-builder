import { Client } from "pg";

export function sanitizeDbName(name: string): string {
  let sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 63);
  if (/^[0-9]/.test(sanitized)) sanitized = `app_${sanitized}`.slice(0, 63);
  return sanitized;
}

export async function createAppDatabase(params: {
  connectionString: string;
  appName: string;
}): Promise<string> {
  const dbName = sanitizeDbName(params.appName);
  const isLocal = /localhost|127\.0\.0\.1/.test(params.connectionString);
  const client = new Client({
    connectionString: params.connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code !== "42P04") throw err; // 42P04 = duplicate_database, safe to ignore
  } finally {
    await client.end();
  }

  const url = new URL(params.connectionString);
  url.pathname = `/${dbName}`;
  return url.toString();
}
