import {
  shellExec,
  execPrismaGenerate,
  fsWrite,
  fsRead,
  listFiles,
} from "../../tools";
import {
  formatGeneratedCodeDotEnv,
  resolveBlueprintGeneratedDatabaseUrl,
} from "@/lib/pipeline/generated-code-env";

export interface DbDependencyInfo {
  hasPrisma: boolean;
  hasSequelize: boolean;
  hasMongoose: boolean;
  hasKnex: boolean;
  hasDrizzle: boolean;
  hasBetterSqlite: boolean;
  hasEnvFile: boolean;
  hasDatabaseUrl: boolean;
  hasDockerCompose: boolean;
}

export async function detectDbDependencies(
  outputDir: string,
): Promise<DbDependencyInfo> {
  const info: DbDependencyInfo = {
    hasPrisma: false,
    hasSequelize: false,
    hasMongoose: false,
    hasKnex: false,
    hasDrizzle: false,
    hasBetterSqlite: false,
    hasEnvFile: false,
    hasDatabaseUrl: false,
    hasDockerCompose: false,
  };

  // Check package.json dependencies — root and monorepo api workspace
  const pkgPaths = [
    "package.json",
    "backend/package.json",
    "apps/api/package.json",
  ];
  for (const pkgPath of pkgPaths) {
    const pkgRaw = await fsRead(pkgPath, outputDir);
    if (pkgRaw.startsWith("FILE_NOT_FOUND")) continue;
    try {
      const pkg = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      info.hasPrisma =
        info.hasPrisma || "@prisma/client" in deps || "prisma" in deps;
      info.hasSequelize = info.hasSequelize || "sequelize" in deps;
      info.hasMongoose = info.hasMongoose || "mongoose" in deps;
      info.hasKnex = info.hasKnex || "knex" in deps;
      info.hasDrizzle = info.hasDrizzle || "drizzle-orm" in deps;
      info.hasBetterSqlite = info.hasBetterSqlite || "better-sqlite3" in deps;
    } catch {
      // ignore parse errors
    }
  }

  // Check .env / .env.local
  for (const envFile of [".env", ".env.local"]) {
    const envRaw = await fsRead(envFile, outputDir);
    if (!envRaw.startsWith("FILE_NOT_FOUND")) {
      info.hasEnvFile = true;
      if (/DATABASE_URL\s*=/.test(envRaw)) info.hasDatabaseUrl = true;
      break;
    }
  }

  // Check docker-compose
  for (const f of ["docker-compose.yml", "docker-compose.yaml"]) {
    const raw = await fsRead(f, outputDir);
    if (!raw.startsWith("FILE_NOT_FOUND")) {
      info.hasDockerCompose = true;
      break;
    }
  }

  return info;
}

export function envForPrismaCliFromSchema(
  schemaContent: string,
): Record<string, string> {
  const provider = (name: string) =>
    new RegExp(`provider\\s*=\\s*["']${name}["']`, "i").test(schemaContent);

  if (provider("mysql")) {
    return {
      DATABASE_URL: "mysql://prisma:prisma@127.0.0.1:3306/prisma_phase_verify",
    };
  }
  if (provider("mongodb")) {
    return { DATABASE_URL: "mongodb://127.0.0.1:27017/prisma_phase_verify" };
  }
  if (provider("sqlserver")) {
    return {
      DATABASE_URL:
        "sqlserver://127.0.0.1:1433;database=prisma_phase_verify;user=sa;password=PrismaPhase1;encrypt=true;trustServerCertificate=true",
    };
  }
  if (provider("sqlite")) {
    if (/url\s*=\s*env\(\s*["']DATABASE_URL["']\s*\)/.test(schemaContent)) {
      return { DATABASE_URL: "file:./.prisma/prisma_phase_verify.db" };
    }
    return {};
  }
  if (provider("postgresql") || provider("cockroachdb")) {
    const url = "postgresql://prisma:prisma@127.0.0.1:5432/prisma_phase_verify";
    const out: Record<string, string> = { DATABASE_URL: url };
    if (/directUrl\s*=\s*env\(\s*["']DIRECT_URL["']\s*\)/.test(schemaContent)) {
      out.DIRECT_URL = url;
    }
    return out;
  }
  const fallback =
    "postgresql://prisma:prisma@127.0.0.1:5432/prisma_phase_verify";
  const out: Record<string, string> = { DATABASE_URL: fallback };
  if (/directUrl\s*=\s*env\(\s*["']DIRECT_URL["']\s*\)/.test(schemaContent)) {
    out.DIRECT_URL = fallback;
  }
  return out;
}

/**
 * Prisma 7+ removed the `url` / `directUrl` properties from `datasource db {}` blocks.
 * When `prisma generate` fails with P1012 "url is no longer supported", strip those
 * properties from schema.prisma and create a minimal `prisma.config.ts` so that
 * `prisma generate` can proceed without a live database connection.
 */
export async function migrateSchemaToPrisma7(
  schemaContent: string,
  outputDir: string,
): Promise<{ migrated: boolean; newSchema: string }> {
  const hasUrl = /^\s+url\s*=/m.test(schemaContent);
  const hasDirectUrl = /^\s+directUrl\s*=/m.test(schemaContent);
  if (!hasUrl && !hasDirectUrl) {
    return { migrated: false, newSchema: schemaContent };
  }

  const newSchema = schemaContent
    .replace(/^\s+url\s*=\s*env\([^)]*\)\s*\n/gm, "")
    .replace(/^\s+url\s*=\s*"[^"]*"\s*\n/gm, "")
    .replace(/^\s+directUrl\s*=\s*env\([^)]*\)\s*\n/gm, "")
    .replace(/^\s+directUrl\s*=\s*"[^"]*"\s*\n/gm, "");

  await fsWrite("prisma/schema.prisma", newSchema, outputDir);

  // Create prisma.config.ts only if not already present
  const existing = await fsRead("prisma.config.ts", outputDir);
  if (existing.startsWith("FILE_NOT_FOUND")) {
    const configTs = [
      "import { defineConfig } from 'prisma/config'",
      "",
      "export default defineConfig({",
      "  schema: './prisma/schema.prisma',",
      "})",
      "",
    ].join("\n");
    await fsWrite("prisma.config.ts", configTs, outputDir);
  }

  console.log(
    "[Supervisor] Prisma 7 migration: removed `url`/`directUrl` from datasource, wrote prisma.config.ts",
  );
  return { migrated: true, newSchema };
}

/**
 * Run Prisma-specific setup steps:
 *   1. If .env is absent, write it from `BLUEPRINT_GENERATED_DATABASE_URL` (Agentic Builder env).
 *   2. prisma generate (always safe, no DB needed).
 *   3. Attempt prisma migrate dev if a live DB is reachable:
 *        - If docker-compose.yml exists, try `docker-compose up -d` then migrate.
 *        - If DATABASE_URL is already set in .env, migrate directly.
 *      Failures are non-fatal: we warn and leave clear manual instructions.
 * Returns warning text to surface in integration errors, or "" if all good.
 */
export async function handlePrismaSetup(
  outputDir: string,
  info: DbDependencyInfo,
): Promise<string> {
  const warnings: string[] = [];

  // ── Step 1: ensure .env (scaffold may have written it; else use Blueprint env) ──
  if (!info.hasEnvFile) {
    const fromBlueprint = resolveBlueprintGeneratedDatabaseUrl();
    if (fromBlueprint) {
      await fsWrite(
        ".env",
        formatGeneratedCodeDotEnv(fromBlueprint),
        outputDir,
      );
      info.hasEnvFile = true;
      info.hasDatabaseUrl = true;
      console.log(
        "[Supervisor] DB check: wrote .env from BLUEPRINT_GENERATED_DATABASE_URL",
      );
    }
  }

  // ── Step 2: prisma generate ──────────────────────────────────────────────
  let schemaRaw = await fsRead("prisma/schema.prisma", outputDir);
  if (schemaRaw.startsWith("FILE_NOT_FOUND")) {
    warnings.push(
      "## Missing prisma/schema.prisma\n" +
        "@prisma/client is installed but prisma/schema.prisma was not generated. " +
        "Add a Prisma schema file or the app will fail at runtime.",
    );
    return warnings.join("\n\n");
  }
  if (schemaRaw.charCodeAt(0) === 0xfeff) {
    schemaRaw = schemaRaw.slice(1);
    await fsWrite("prisma/schema.prisma", schemaRaw, outputDir);
  }

  console.log("[Supervisor] DB check: running npx prisma generate...");
  let genResult = await execPrismaGenerate(
    outputDir,
    envForPrismaCliFromSchema(schemaRaw),
    { timeout: 90_000 },
  );
  if (genResult.exitCode !== 0) {
    const out = (genResult.stdout + genResult.stderr).trim();
    // Prisma 7+ removed `url` from datasource — auto-migrate and retry once.
    const isPrisma7UrlError =
      out.includes("P1012") &&
      (out.includes("no longer supported") ||
        out.includes("datasource property"));
    if (isPrisma7UrlError) {
      console.log(
        "[Supervisor] DB check: Prisma 7 `url` incompatibility — auto-migrating schema...",
      );
      const { migrated, newSchema } = await migrateSchemaToPrisma7(
        schemaRaw,
        outputDir,
      );
      if (migrated) {
        schemaRaw = newSchema;
        genResult = await execPrismaGenerate(
          outputDir,
          {},
          { timeout: 90_000 },
        );
        if (genResult.exitCode !== 0) {
          const retryOut = (genResult.stdout + genResult.stderr).trim();
          warnings.push(`## Prisma generate failed\n${retryOut.slice(0, 500)}`);
          console.warn(
            `[Supervisor] DB check: prisma generate still failed after migration: ${retryOut.slice(0, 200)}`,
          );
          return warnings.join("\n\n");
        }
        console.log(
          "[Supervisor] DB check: prisma generate OK after Prisma 7 migration.",
        );
      }
    } else {
      warnings.push(`## Prisma generate failed\n${out.slice(0, 500)}`);
      console.warn(
        `[Supervisor] DB check: prisma generate failed: ${out.slice(0, 200)}`,
      );
      return warnings.join("\n\n");
    }
  } else {
    console.log("[Supervisor] DB check: prisma generate OK.");
  }

  // ── Step 3: prisma migrate dev ───────────────────────────────────────────
  let dbReachable = info.hasDatabaseUrl;

  if (!dbReachable && info.hasDockerCompose) {
    console.log(
      "[Supervisor] DB check: starting docker-compose services for migration...",
    );
    const upResult = await shellExec(
      "docker-compose up -d 2>&1 | tail -5",
      outputDir,
      { timeout: 60_000 },
    );
    if (upResult.exitCode === 0) {
      console.log(
        "[Supervisor] DB check: docker-compose up -d OK, waiting 8s for DB to be ready...",
      );
      await new Promise((r) => setTimeout(r, 8_000));
      dbReachable = true;
    } else {
      const out = (upResult.stdout || upResult.stderr || "").trim();
      console.warn(
        `[Supervisor] DB check: docker-compose up failed: ${out.slice(0, 200)}`,
      );
    }
  }

  if (dbReachable) {
    console.log(
      "[Supervisor] DB check: running npx prisma migrate dev --name init...",
    );
    const migrateResult = await shellExec(
      "npx prisma migrate dev --name init --skip-seed 2>&1 | tail -20",
      outputDir,
      { timeout: 120_000 },
    );
    if (migrateResult.exitCode === 0) {
      console.log("[Supervisor] DB check: prisma migrate dev OK.");
    } else {
      const out = (migrateResult.stdout || migrateResult.stderr || "").trim();
      warnings.push(
        `## Prisma migrate dev failed\n${out.slice(0, 500)}\n\n` +
          "Run manually once your database is running:\n" +
          "```\ndocker-compose up -d\nnpx prisma migrate dev --name init\n```",
      );
      console.warn(
        `[Supervisor] DB check: prisma migrate dev failed: ${out.slice(0, 200)}`,
      );
    }
  } else {
    warnings.push(
      "## Prisma migrate dev skipped\n" +
        "No live database detected (no DATABASE_URL in .env and docker-compose could not start).\n\n" +
        "Run manually once your database is ready:\n" +
        "```\ndocker-compose up -d\nnpx prisma migrate dev --name init\n```",
    );
  }

  if (!info.hasDockerCompose) {
    warnings.push(
      "## Missing docker-compose.yml\n" +
        "No docker-compose.yml found. Create one to provision the database service, " +
        "then run: docker-compose up -d && npx prisma migrate dev --name init",
    );
  }

  return warnings.join("\n\n");
}

/**
 * Scan all generated .ts/.tsx files and replace wrong workspace import prefixes
 * with the correct one read from packages/shared/package.json.
 *
 * Agents sometimes hallucinate `@repo/shared` or `@shared` instead of the real
 * workspace name (e.g. `@project/shared`). This corrects them before tsc runs.
 */
export async function normalizeWorkspaceImports(
  outputDir: string,
): Promise<void> {
  const pkgRaw = await fsRead("packages/shared/package.json", outputDir);
  if (pkgRaw.startsWith("FILE_NOT_FOUND")) return;

  let sharedPkgName: string;
  try {
    sharedPkgName = (JSON.parse(pkgRaw) as { name?: string }).name ?? "";
  } catch {
    return;
  }
  if (!sharedPkgName) return;

  // Build a list of wrong prefixes to replace
  const wrongPrefixes = ["@repo/shared", "@shared", "@monorepo/shared"].filter(
    (p) => p !== sharedPkgName,
  );
  if (wrongPrefixes.length === 0) return;

  // Find all .ts/.tsx files in apps/ and packages/
  const srcDirs = ["apps", "packages"];
  let fixed = 0;

  for (const dir of srcDirs) {
    let files: string[] = [];
    try {
      files = await listFiles(dir, outputDir);
    } catch {
      continue;
    }
    for (const relPath of files) {
      if (!/\.(ts|tsx)$/.test(relPath)) continue;
      const content = await fsRead(relPath, outputDir);
      if (
        content.startsWith("FILE_NOT_FOUND") ||
        content.startsWith("REJECTED")
      )
        continue;

      let updated = content;
      for (const wrong of wrongPrefixes) {
        if (updated.includes(wrong)) {
          updated = updated.split(wrong).join(sharedPkgName);
        }
      }
      if (updated !== content) {
        await fsWrite(relPath, updated, outputDir);
        fixed++;
        console.log(
          `[Supervisor] normalizeWorkspaceImports: fixed "${relPath}" (${wrongPrefixes.find((p) => content.includes(p))} → ${sharedPkgName})`,
        );
      }
    }
  }

  if (fixed > 0) {
    console.log(
      `[Supervisor] normalizeWorkspaceImports: corrected ${fixed} file(s).`,
    );
  }
}
