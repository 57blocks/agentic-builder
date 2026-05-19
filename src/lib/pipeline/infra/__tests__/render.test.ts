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
          depends: [],
        },
      ],
      domains: [],
    };
    const { files } = renderInfra(spec);
    expect(Object.keys(files)).toContain("Dockerfile");
    expect(Object.keys(files)).toContain("docker-compose.yml");
    expect(files["Dockerfile"]).toMatch(/FROM node:20-alpine AS builder/);
    expect(files["Dockerfile"]).toMatch(/FROM nginx:alpine/);
    expect(files["docker-compose.yml"]).toMatch(/dokploy-network/);
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
          depends: [],
          servesStatic: false,
        },
      ],
      domains: [],
    };
    const { files } = renderInfra(spec);
    expect(files["docker-compose.yml"]).not.toMatch(/redis/);
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
          depends: [],
        },
      ],
      domains: [],
    };
    expect(() => renderInfra(spec)).toThrow(/S-tier expects/);
  });
});
