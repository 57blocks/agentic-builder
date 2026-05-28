/**
 * Probe the real Dokploy Redis Service API end-to-end:
 * resolve/create shared infra project → provision Redis → print URL → delete.
 *
 * Usage:
 *   DOKPLOY_URL=https://... DOKPLOY_TOKEN=... \
 *     npx tsx scripts/probe-dokploy-redis.ts
 */
import { createRedisForApp, deprovisionAppRedis } from "../src/lib/deploy/redis";

async function main() {
  if (!process.env.DOKPLOY_URL || !process.env.DOKPLOY_TOKEN) {
    console.error("Set DOKPLOY_URL and DOKPLOY_TOKEN first.");
    process.exit(1);
  }
  const appName = `probe-${Date.now()}`;
  console.log(`[probe] provisioning ${appName} ...`);
  const result = await createRedisForApp({
    projectRoot: process.cwd(),
    appName,
  });
  console.log("[probe] redis ready:");
  console.log("  url        =", result.url);
  console.log("  internal   =", result.internalUrl);
  console.log("  redisId    =", result.redisId);
  console.log("  appName    =", result.appName);

  console.log(`[probe] tearing down redisId=${result.redisId} ...`);
  await deprovisionAppRedis({
    baseUrl: process.env.DOKPLOY_URL!,
    token: process.env.DOKPLOY_TOKEN!,
    redisId: result.redisId,
  });
  console.log("[probe] removed OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
