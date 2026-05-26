import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { buildInfraSpecFromKickoff } from "../from-kickoff";
import { renderInfra } from "../render";
import type { KickoffInfraFile } from "@/lib/pipeline/kickoff-infra/types";

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "infra-from-kickoff-"));
}

const PG_URL = "postgresql://app:secret@pg-host:5432/app_db";
const REDIS_URL = "redis://default:secret@redis-host:6379";

const fullMeta: KickoffInfraFile = {
  dokployProjectId: "p1",
  dokployEnvironmentId: "e1",
  appName: "demo",
  savedAt: "2026-01-01T00:00:00.000Z",
  services: [
    {
      kind: "postgres",
      id: "pg1",
      appName: "demo-pg",
      publicUrl: "postgresql://app:secret@public:5432/app_db",
      internalUrl: PG_URL,
      externalPort: 5432,
    },
    {
      kind: "redis",
      id: "r1",
      appName: "demo-redis",
      publicUrl: "redis://default:secret@public:6379",
      internalUrl: REDIS_URL,
      externalPort: 6379,
    },
  ],
};

describe("buildInfraSpecFromKickoff", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkTmp();
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("S-tier: single static app, no managed services in rendered compose", async () => {
    const { spec, provisioned } = await buildInfraSpecFromKickoff(
      tmp,
      "S",
      null,
    );
    expect(spec.tier).toBe("S");
    expect(spec.services).toHaveLength(1);
    expect(spec.services[0].name).toBe("app");
    expect(provisioned).toEqual({});
    const { files } = renderInfra(spec, provisioned);
    expect(files["Dockerfile"]).toMatch(/FROM nginx:alpine/);
  });

  it("M-tier: builds frontend+backend+postgres; provisioned pg drops managed", async () => {
    await fs.mkdir(path.join(tmp, "frontend"), { recursive: true });
    await fs.mkdir(path.join(tmp, "backend"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "backend", "Dockerfile"),
      "FROM node:20-alpine\nEXPOSE 3001\n",
    );
    const { spec, provisioned } = await buildInfraSpecFromKickoff(
      tmp,
      "M",
      fullMeta,
    );
    expect(spec.services.map((s) => s.name).sort()).toEqual([
      "backend",
      "frontend",
      "postgres",
    ]);
    expect(provisioned.postgres?.internalUrl).toBe(PG_URL);
    // backend depends should be empty (only managed dep was postgres, which is provisioned away by renderer)
    const backend = spec.services.find((s) => s.name === "backend");
    expect(backend && backend.kind === "app" && backend.depends).toEqual([]);
    const { files } = renderInfra(spec, provisioned);
    expect(files["docker-compose.yml"]).not.toMatch(/postgres:16-alpine/);
    expect(files[".env.example"]).toMatch(
      /DATABASE_URL=postgresql:\/\/app:secret@pg-host:5432\/app_db/,
    );
  });

  it("L-tier: backend gets REDIS_URL env; pg+redis provisioned → no managed in compose", async () => {
    await fs.mkdir(path.join(tmp, "frontend"), { recursive: true });
    await fs.mkdir(path.join(tmp, "backend"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "backend", "Dockerfile"),
      "FROM node:20-alpine\nEXPOSE 4000\n",
    );
    const { spec, provisioned } = await buildInfraSpecFromKickoff(
      tmp,
      "L",
      fullMeta,
    );
    const backend = spec.services.find((s) => s.name === "backend");
    expect(backend && backend.kind === "app" && backend.port).toBe(4000);
    expect(backend && backend.kind === "app" && backend.envs).toContain(
      "REDIS_URL",
    );
    // Static envs deployed inline
    expect(
      backend && backend.kind === "app" && backend.staticEnvs,
    ).toEqual({
      NODE_ENV: "production",
      PORT: "4000",
      USE_REDIS_QUEUE: "1",
    });
    const { files } = renderInfra(spec, provisioned);
    const compose = files["docker-compose.yml"];
    expect(compose).not.toMatch(/postgres:16-alpine/);
    expect(compose).not.toMatch(/redis:7-alpine/);
    expect(compose).toMatch(/dokploy-network/);
    expect(compose).toMatch(/NODE_ENV: "production"/);
    expect(compose).toMatch(/USE_REDIS_QUEUE: "1"/);
    expect(files[".env.example"]).toMatch(/REDIS_URL=redis:\/\/default/);
    // Static envs MUST NOT leak into .env.example
    expect(files[".env.example"]).not.toMatch(/NODE_ENV/);
    expect(files[".env.example"]).not.toMatch(/USE_REDIS_QUEUE/);
  });

  it("L-tier without kickoff metadata: keeps self-started pg+redis", async () => {
    await fs.mkdir(path.join(tmp, "frontend"), { recursive: true });
    await fs.mkdir(path.join(tmp, "backend"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "backend", "Dockerfile"),
      "FROM node:20-alpine\nEXPOSE 3001\n",
    );
    const { spec, provisioned } = await buildInfraSpecFromKickoff(
      tmp,
      "L",
      null,
    );
    expect(provisioned).toEqual({});
    const { files } = renderInfra(spec, provisioned);
    expect(files["docker-compose.yml"]).toMatch(/postgres:16-alpine/);
    expect(files["docker-compose.yml"]).toMatch(/redis:7-alpine/);
  });

  it("throws for M-tier when frontend/ or backend/ missing", async () => {
    await expect(
      buildInfraSpecFromKickoff(tmp, "M", null),
    ).rejects.toThrow(/expects frontend\/ and backend\//);
  });
});
