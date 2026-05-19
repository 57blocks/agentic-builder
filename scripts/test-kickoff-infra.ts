/**
 * Standalone test of the kickoff-infra provisioning step. Skips the whole
 * pipeline (intent / PRD / TRD / codegen / etc.) and exercises ONLY:
 *   1. detectRequiredServices (LLM + regex fallback)
 *   2. createDokployProject
 *   3. provisionAppPostgres / provisionAppRedis (in parallel, as detected)
 *   4. Writes .blueprint/kickoff-infra.json
 *
 * Usage:
 *   DOKPLOY_URL=https://... DOKPLOY_TOKEN=... \
 *     npx tsx scripts/test-kickoff-infra.ts
 *
 *   # custom app name + custom docs:
 *   npx tsx scripts/test-kickoff-infra.ts --name=my-test \
 *     --docs='Use PostgreSQL with Drizzle. Sessions stored in Redis.'
 *
 *   # force regex detection (skip LLM):
 *   INFRA_DETECT_REGEX_ONLY=1 npx tsx scripts/test-kickoff-infra.ts
 *
 *   # cleanup after test:
 *   npx tsx scripts/test-kickoff-infra.ts --cleanup
 */
import fs from "fs/promises";
import path from "path";
import {
  provisionInfra,
  readKickoffInfraMetadata,
} from "../src/lib/pipeline/kickoff-infra";
import { deprovisionAppRedis } from "../src/lib/deploy/redis";
import { deprovisionAppPostgres } from "../src/lib/deploy/postgres";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const DEFAULT_DOCS = `# TRD

The backend uses PostgreSQL via Drizzle ORM for relational data.
Background jobs run on BullMQ-backed Redis. Cache layer is also Redis.

# System Design

- Postgres 16 holds users, orders, sessions.
- Redis stores BullMQ queues and a 5-minute response cache.
`;

async function cleanup() {
  const meta = await readKickoffInfraMetadata(process.cwd());
  if (!meta) {
    console.log("[cleanup] no kickoff-infra.json — nothing to clean.");
    return;
  }
  const baseUrl = process.env.DOKPLOY_URL!;
  const token = process.env.DOKPLOY_TOKEN!;
  for (const svc of meta.services) {
    console.log(`[cleanup] removing ${svc.kind} ${svc.id} ...`);
    try {
      if (svc.kind === "redis") {
        await deprovisionAppRedis({ baseUrl, token, redisId: svc.id });
      } else if (svc.kind === "postgres") {
        await deprovisionAppPostgres({ baseUrl, token, postgresId: svc.id });
      }
      console.log(`  ✅ removed ${svc.kind}`);
    } catch (e) {
      console.error(`  ❌ failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  await fs
    .rm(path.join(process.cwd(), ".blueprint", "kickoff-infra.json"))
    .catch(() => {});
  console.log("[cleanup] done");
}

async function main() {
  if (!process.env.DOKPLOY_URL || !process.env.DOKPLOY_TOKEN) {
    console.error("Set DOKPLOY_URL and DOKPLOY_TOKEN first.");
    process.exit(1);
  }
  if (flag("cleanup")) {
    await cleanup();
    return;
  }

  const appName = arg("name") ?? `test-infra-${Date.now().toString().slice(-6)}`;
  const designDocs = arg("docs") ?? DEFAULT_DOCS;

  console.log("[test] appName =", appName);
  console.log("[test] designDocs (first 200 chars):", designDocs.slice(0, 200));
  console.log("[test] kicking off provisionInfra ...\n");

  const result = await provisionInfra({
    projectRoot: process.cwd(),
    appName,
    designDocs,
  });

  console.log("\n=== markdown report ===");
  console.log(result.markdownLines.join("\n"));

  console.log("\n=== result ===");
  console.log(JSON.stringify(
    {
      ok: result.ok,
      skipped: result.skipped,
      skipReason: result.skipReason,
      error: result.error,
      metadata: result.metadata,
    },
    null,
    2,
  ));

  if (result.metadata) {
    console.log("\n=== developer-facing connection URLs ===");
    for (const svc of result.metadata.services) {
      console.log(`${svc.kind.padEnd(8)} → ${svc.publicUrl}`);
    }
    console.log(
      "\n💡 To tear down: npx tsx scripts/test-kickoff-infra.ts --cleanup",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
