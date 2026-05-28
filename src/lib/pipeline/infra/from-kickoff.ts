import fs from "fs/promises";
import path from "path";
import type { KickoffInfraFile } from "@/lib/pipeline/kickoff-infra/types";
import type { ProvisionedServices } from "./render";
import type { InfraSpec, ServiceSpec } from "./types";

export type ProjectTier = "S" | "M" | "L";

export interface BuildInfraSpecResult {
  spec: InfraSpec;
  provisioned: ProvisionedServices;
}

const NODE_RUNTIME = "node20-alpine" as const;

function provisionedFrom(meta: KickoffInfraFile | null): ProvisionedServices {
  const out: ProvisionedServices = {};
  if (!meta) return out;
  const pg = meta.services.find((s) => s.kind === "postgres");
  if (pg) out.postgres = { internalUrl: pg.internalUrl };
  const redis = meta.services.find((s) => s.kind === "redis");
  if (redis) out.redis = { internalUrl: redis.internalUrl };
  return out;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Derive an InfraSpec from the project layout sitting at `outputRoot` plus the
 * Dokploy-provisioned services in `kickoff-infra.json`. Deliberately *not*
 * driven by an LLM — we read what the scaffold actually produced (frontend/ +
 * backend/ presence, port from EXPOSE in the Dockerfile, etc.) and combine
 * with the runtime topology that was actually provisioned.
 *
 * - S-tier  → single static-served app at root.
 * - M-tier  → frontend (static, nginx) + backend (node).
 * - L-tier  → same as M + REDIS_URL/USE_REDIS_QUEUE env on backend.
 *
 * Managed services that match a provisioned counterpart are omitted from the
 * returned spec — the renderer will skip them and the app picks up the URL
 * from `.env.example`.
 */
export async function buildInfraSpecFromKickoff(
  outputRoot: string,
  tier: ProjectTier,
  kickoffMeta: KickoffInfraFile | null,
): Promise<BuildInfraSpecResult> {
  const provisioned = provisionedFrom(kickoffMeta);

  if (tier === "S") {
    const spec: InfraSpec = {
      tier: "S",
      services: [
        {
          name: "app",
          kind: "app",
          role: "frontend",
          runtime: NODE_RUNTIME,
          context: ".",
          workdir: "/app",
          install: "pnpm install --frozen-lockfile",
          build: "pnpm run build",
          start: "node dist/server.js",
          envs: [],
          staticEnvs: {},
          depends: [],
          servesStatic: true,
        },
      ],
      domains: [],
    };
    return { spec, provisioned };
  }

  // M / L
  const hasFrontend = await exists(path.join(outputRoot, "frontend"));
  const hasBackend = await exists(path.join(outputRoot, "backend"));
  if (!hasFrontend || !hasBackend) {
    throw new Error(
      `buildInfraSpecFromKickoff: tier=${tier} expects frontend/ and backend/ under ${outputRoot}`,
    );
  }

  const backendPort = await readBackendPort(
    path.join(outputRoot, "backend", "Dockerfile"),
    3001,
  );

  // Secret env keys — only those that can't be inlined safely. They appear
  // as `${KEY}` in compose and are sourced from Dokploy-stored env (deploy
  // pipeline pushes them via compose.update) or a project-root `.env` for
  // local runs. DATABASE_URL is always secret; REDIS_URL only when we
  // actually have a Redis (provisioned OR self-started managed service).
  const backendSecretEnvs = ["DATABASE_URL"];
  const hasRedis = tier === "L"; // L-tier always includes Redis (provisioned or managed)
  if (hasRedis) backendSecretEnvs.push("REDIS_URL");

  // Static config — baked into compose so the user doesn't have to set them.
  const backendStaticEnvs: Record<string, string> = {
    NODE_ENV: "production",
    PORT: String(backendPort),
  };
  if (tier === "L") {
    // Always route through Redis in deployment when L-tier ships with Redis.
    backendStaticEnvs.USE_REDIS_QUEUE = "1";
  }

  const backendDepends: string[] = [];
  // depends on managed services only when they exist in the rendered spec.
  // We add them all here; `applyProvisioned` in the renderer drops the ones
  // that are externally provisioned.
  if (!provisioned.postgres) backendDepends.push("postgres");
  if (tier === "L" && !provisioned.redis) backendDepends.push("redis");

  const services: ServiceSpec[] = [
    {
      name: "frontend",
      kind: "app",
      role: "frontend",
      runtime: NODE_RUNTIME,
      context: "frontend",
      workdir: "/app",
      install: "pnpm install --frozen-lockfile",
      build: "pnpm run build",
      start: "node dist/server.js",
      envs: [],
      staticEnvs: {},
      depends: ["backend"],
      servesStatic: true,
    },
    {
      name: "backend",
      kind: "app",
      role: "backend",
      runtime: NODE_RUNTIME,
      context: "backend",
      workdir: "/app",
      install: "pnpm install --frozen-lockfile",
      build: "pnpm run build",
      start: "node dist/server.js",
      port: backendPort,
      envs: backendSecretEnvs,
      staticEnvs: backendStaticEnvs,
      depends: backendDepends,
      servesStatic: false,
    },
  ];

  // Always include managed services in the spec; the renderer's
  // `applyProvisioned` will strip the ones we have provisioned URLs for.
  // This keeps the spec self-describing (and useful for debugging via
  // `.blueprint/infra-spec.json`).
  services.push({
    name: "postgres",
    kind: "managed",
    image: "postgres:16-alpine",
    envs: ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"],
    volumes: { "postgres-data": "/var/lib/postgresql/data" },
  });
  if (tier === "L") {
    services.push({
      name: "redis",
      kind: "managed",
      image: "redis:7-alpine",
      envs: [],
    });
  }

  const spec: InfraSpec = { tier, services, domains: [] };
  return { spec, provisioned };
}

async function readBackendPort(
  dockerfilePath: string,
  fallback: number,
): Promise<number> {
  try {
    const content = await fs.readFile(dockerfilePath, "utf-8");
    const m = content.match(/^EXPOSE\s+(\d+)/m);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0 && n < 65536) return n;
    }
  } catch {
    /* fall through */
  }
  return fallback;
}
