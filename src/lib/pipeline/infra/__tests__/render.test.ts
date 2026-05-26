import { describe, it, expect } from "vitest";
import { renderInfra } from "../render";
import type { InfraSpec } from "../types";

describe("renderInfra", () => {
  it("S-tier: single Dockerfile at root + compose", () => {
    const spec: InfraSpec = {
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
          staticEnvs: {},
          depends: [],
        },
      ],
      domains: [],
    };
    const { files } = renderInfra(spec);
    expect(Object.keys(files)).toContain("Dockerfile");
    expect(Object.keys(files)).toContain(".dockerignore");
    expect(Object.keys(files)).toContain("docker-compose.yml");
    expect(files["Dockerfile"]).toMatch(/FROM node:20-alpine AS builder/);
    expect(files["Dockerfile"]).toMatch(/FROM nginx:alpine/);
    expect(files["docker-compose.yml"]).toMatch(/dokploy-network/);
    expect(files[".dockerignore"]).toMatch(/^\.env$/m);
  });

  it("M-tier: per-app Dockerfiles under context dirs", () => {
    const spec: InfraSpec = {
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
          staticEnvs: {},
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
          staticEnvs: {},
          depends: [],
          servesStatic: false,
        },
      ],
      domains: [],
    };
    const { files } = renderInfra(spec);
    expect(files["frontend/Dockerfile"]).toBeDefined();
    expect(files["backend/Dockerfile"]).toBeDefined();
    expect(files["backend/Dockerfile"]).toMatch(/EXPOSE 3001/);
    expect(files["backend/Dockerfile"]).toMatch(
      /CMD \["node","dist\/server\.js"\]/,
    );
    expect(files["docker-compose.yml"]).toMatch(/context: \.\/backend/);
    expect(files["docker-compose.yml"]).toMatch(/context: \.\/frontend/);
    expect(files[".env.example"]).toMatch(/DATABASE_URL=/);
    expect(files["frontend/.dockerignore"]).toMatch(/^\.env$/m);
    expect(files["backend/.dockerignore"]).toMatch(/^\.env$/m);
  });

  it("L-tier with Redis: per-project, capped memory, no persistence", () => {
    const spec: InfraSpec = {
      tier: "L",
      services: [
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
          envs: ["REDIS_URL"],
          staticEnvs: {},
          depends: ["redis"],
          servesStatic: false,
        },
        {
          name: "redis",
          kind: "managed",
          image: "redis:7-alpine",
          envs: [],
        },
      ],
      domains: [],
    };
    const { files } = renderInfra(spec);
    const compose = files["docker-compose.yml"];
    expect(compose).toMatch(/redis:7-alpine/);
    // Redis runs with allkeys-lru + 128mb + no persistence by default
    expect(compose).toMatch(/--maxmemory/);
    expect(compose).toMatch(/128mb/);
    expect(compose).toMatch(/allkeys-lru/);
    expect(compose).toMatch(/"--save",""/);
    expect(compose).toMatch(/memory: 160M/);
    // Backend should depend on redis with healthcheck condition
    expect(compose).toMatch(/condition: service_healthy/);
  });

  it("L-tier without Redis: no redis block appears", () => {
    const spec: InfraSpec = {
      tier: "L",
      services: [
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
          envs: ["DATABASE_URL"],
          staticEnvs: {},
          depends: [],
          servesStatic: false,
        },
      ],
      domains: [],
    };
    const { files } = renderInfra(spec);
    expect(files["docker-compose.yml"]).not.toMatch(/redis/);
  });

  describe("provisioned services", () => {
    const baseLSpec: InfraSpec = {
      tier: "L",
      services: [
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
          envs: ["DATABASE_URL", "REDIS_URL"],
          staticEnvs: {},
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
    };

    it("drops provisioned managed services from compose and depends_on", () => {
      const { files } = renderInfra(baseLSpec, {
        postgres: { internalUrl: "postgresql://app:pw@pg-internal:5432/app" },
        redis: { internalUrl: "redis://default:pw@redis-internal:6379" },
      });
      const compose = files["docker-compose.yml"];
      // managed services are gone
      expect(compose).not.toMatch(/postgres:16-alpine/);
      expect(compose).not.toMatch(/redis:7-alpine/);
      // backend has no depends_on (all deps were managed + provisioned)
      expect(compose).not.toMatch(/depends_on/);
      // backend still appears
      expect(compose).toMatch(/backend:/);
      expect(compose).toMatch(/context: \.\/backend/);
    });

    it("injects internalUrl into .env.example", () => {
      const { files } = renderInfra(baseLSpec, {
        postgres: { internalUrl: "postgresql://app:pw@pg-internal:5432/app" },
        redis: { internalUrl: "redis://default:pw@redis-internal:6379" },
      });
      const env = files[".env.example"];
      expect(env).toMatch(
        /DATABASE_URL=postgresql:\/\/app:pw@pg-internal:5432\/app/,
      );
      expect(env).toMatch(/REDIS_URL=redis:\/\/default:pw@redis-internal:6379/);
    });

    it("partial provisioning: only postgres provisioned, redis stays self-started", () => {
      const { files } = renderInfra(baseLSpec, {
        postgres: { internalUrl: "postgresql://app:pw@pg-internal:5432/app" },
      });
      const compose = files["docker-compose.yml"];
      expect(compose).not.toMatch(/postgres:16-alpine/);
      expect(compose).toMatch(/redis:7-alpine/);
      // redis still in depends_on, postgres removed
      expect(compose).toMatch(/redis:\n\s+condition: service_healthy/);
      expect(compose).not.toMatch(/postgres:\n\s+condition: service_healthy/);
    });

    it("staticEnvs render as literal values; secrets stay as ${VAR}", () => {
      const spec: InfraSpec = {
        tier: "M",
        services: [
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
            staticEnvs: {
              NODE_ENV: "production",
              PORT: "3001",
              USE_REDIS_QUEUE: "1",
            },
            depends: [],
            servesStatic: false,
          },
        ],
        domains: [],
      };
      const { files } = renderInfra(spec);
      const compose = files["docker-compose.yml"];
      expect(compose).toMatch(/DATABASE_URL: \$\{DATABASE_URL\}/);
      expect(compose).toMatch(/NODE_ENV: "production"/);
      expect(compose).toMatch(/PORT: "3001"/);
      expect(compose).toMatch(/USE_REDIS_QUEUE: "1"/);
      // .env.example only has secrets, never static values
      expect(files[".env.example"]).toMatch(/^DATABASE_URL=/m);
      expect(files[".env.example"]).not.toMatch(/NODE_ENV/);
      expect(files[".env.example"]).not.toMatch(/USE_REDIS_QUEUE/);
    });

    it("no provisioned arg: behavior matches pre-existing tests", () => {
      const { files } = renderInfra(baseLSpec);
      expect(files["docker-compose.yml"]).toMatch(/postgres:16-alpine/);
      expect(files["docker-compose.yml"]).toMatch(/redis:7-alpine/);
    });
  });

  it("throws when S-tier has !=1 app service", () => {
    const spec: InfraSpec = {
      tier: "S",
      services: [
        {
          name: "a",
          kind: "app",
          role: "frontend",
          runtime: "node20-alpine",
          context: ".",
          workdir: "/app",
          install: "pnpm install --frozen-lockfile",
          start: "node x",
          servesStatic: true,
          envs: [],
          staticEnvs: {},
          depends: [],
        },
        {
          name: "b",
          kind: "app",
          role: "backend",
          runtime: "node20-alpine",
          context: ".",
          workdir: "/app",
          install: "pnpm install --frozen-lockfile",
          start: "node y",
          servesStatic: false,
          envs: [],
          staticEnvs: {},
          depends: [],
        },
      ],
      domains: [],
    };
    expect(() => renderInfra(spec)).toThrow(/S-tier expects/);
  });
});
