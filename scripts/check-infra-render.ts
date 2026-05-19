import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { renderInfra } from "../src/lib/pipeline/infra/render";
import type { InfraSpec } from "../src/lib/pipeline/infra/types";

const exec = promisify(execFile);

const SPECS: Record<string, InfraSpec> = {
  "s-tier": {
    tier: "S",
    services: [
      {
        name: "app",
        kind: "app",
        role: "frontend",
        runtime: "node20-alpine",
        context: ".",
        workdir: "/app",
        install: "pnpm install --frozen-lockfile",
        build: "pnpm run build",
        start: "node dist/server.js",
        servesStatic: true,
        envs: [],
        depends: [],
      },
    ],
    domains: [],
  },
  "m-tier": {
    tier: "M",
    services: [
      {
        name: "frontend",
        kind: "app",
        role: "frontend",
        runtime: "node20-alpine",
        context: "frontend",
        workdir: "/app",
        install: "pnpm install --frozen-lockfile",
        build: "pnpm run build",
        start: "node dist/server.js",
        servesStatic: true,
        envs: [],
        depends: ["backend"],
      },
      {
        name: "backend",
        kind: "app",
        role: "backend",
        runtime: "node20-alpine",
        context: "backend",
        workdir: "/app",
        install: "pnpm install --frozen-lockfile",
        build: "pnpm run build",
        start: "node dist/server.js",
        port: 3001,
        envs: ["DATABASE_URL"],
        depends: ["postgres"],
        servesStatic: false,
      },
      {
        name: "postgres",
        kind: "managed",
        image: "postgres:16-alpine",
        envs: ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"],
      },
    ],
    domains: [],
  },
  "l-tier-with-redis": {
    tier: "L",
    services: [
      {
        name: "frontend",
        kind: "app",
        role: "frontend",
        runtime: "node20-alpine",
        context: "frontend",
        workdir: "/app",
        install: "pnpm install --frozen-lockfile",
        build: "pnpm run build",
        start: "node dist/server.js",
        servesStatic: true,
        envs: [],
        depends: ["backend"],
      },
      {
        name: "backend",
        kind: "app",
        role: "backend",
        runtime: "node20-alpine",
        context: "backend",
        workdir: "/app",
        install: "pnpm install --frozen-lockfile",
        build: "pnpm run build",
        start: "node dist/server.js",
        port: 4000,
        envs: ["DATABASE_URL", "REDIS_URL"],
        depends: ["postgres", "redis"],
        servesStatic: false,
      },
      {
        name: "postgres",
        kind: "managed",
        image: "postgres:16-alpine",
        envs: ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"],
      },
      {
        name: "redis",
        kind: "managed",
        image: "redis:7-alpine",
        envs: [],
      },
    ],
    domains: [],
  },
};

async function main() {
  // Ensure dokploy-network exists for validation
  await exec("docker", ["network", "create", "dokploy-network"]).catch(() => {
    /* already exists */
  });

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "infra-check-"));
  let failed = 0;
  for (const [name, spec] of Object.entries(SPECS)) {
    const dir = path.join(root, name);
    await fs.mkdir(dir, { recursive: true });
    const { files } = renderInfra(spec);
    for (const [rel, content] of Object.entries(files)) {
      const target = path.join(dir, rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
    }
    console.log(`\n=== ${name} ===`);
    console.log(`output dir: ${dir}`);
    console.log("files:", Object.keys(files).join(", "));
    console.log("\n--- docker-compose.yml ---");
    console.log(files["docker-compose.yml"]);
    if (files["Dockerfile"]) {
      console.log("\n--- Dockerfile ---");
      console.log(files["Dockerfile"]);
    }
    // Validate compose with `docker compose config`
    try {
      const { stdout } = await exec(
        "docker",
        ["compose", "-f", path.join(dir, "docker-compose.yml"), "config", "--quiet"],
        { cwd: dir },
      );
      console.log(`✅ compose syntax OK (${name})`);
      if (stdout.trim()) console.log(stdout);
    } catch (e: unknown) {
      const err = e as { stderr?: string; message?: string };
      console.error(`❌ compose syntax FAILED (${name}):`);
      console.error(err.stderr || err.message);
      failed++;
    }
  }
  console.log(`\n${failed === 0 ? "ALL PASS" : `${failed} FAILED`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
