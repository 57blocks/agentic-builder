import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres@localhost/agentic_builder?host=/tmp";

const useSsl = databaseUrl.includes("rds.amazonaws.com");

function buildCreds() {
  if (useSsl) {
    const u = new URL(databaseUrl);
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      ssl: { rejectUnauthorized: false },
    } as const;
  }
  return { url: databaseUrl } as const;
}

export default defineConfig({
  schema:    "./src/lib/db/schema.ts",
  out:       "./src/lib/db/drizzle",
  dialect:   "postgresql",
  dbCredentials: buildCreds(),
  verbose: true,
  strict:  true,
});
