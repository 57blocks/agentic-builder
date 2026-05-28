import type {
  AppService,
  InfraSpec,
  ManagedService,
  ServiceSpec,
} from "./types";

export interface RenderedInfra {
  /** Map of relative path (from output root) → file content. */
  files: Record<string, string>;
}

const RUNTIME_BASE_IMAGE: Record<string, string> = {
  "node20-alpine": "node:20-alpine",
  "node22-alpine": "node:22-alpine",
  node20: "node:20",
  node22: "node:22",
};

const REDIS_DEFAULT_COMMAND = [
  "redis-server",
  "--maxmemory",
  "128mb",
  "--maxmemory-policy",
  "allkeys-lru",
  "--save",
  "",
];

function isApp(s: ServiceSpec): s is AppService {
  return s.kind === "app";
}
function isManaged(s: ServiceSpec): s is ManagedService {
  return s.kind === "managed";
}

function dockerfileFor(svc: AppService): string {
  const base = RUNTIME_BASE_IMAGE[svc.runtime];
  const lines: string[] = [];
  // Static-serving frontends use a two-stage build with nginx.
  if (svc.servesStatic) {
    lines.push(
      `FROM ${base} AS builder`,
      `WORKDIR ${svc.workdir}`,
      `RUN npm install -g pnpm`,
      `COPY pnpm-lock.yaml package.json ./`,
      `RUN ${svc.install}`,
      `COPY . .`,
      svc.build ? `RUN ${svc.build}` : `RUN pnpm run build`,
      ``,
      `FROM nginx:alpine`,
      `COPY --from=builder ${svc.workdir}/dist /usr/share/nginx/html`,
      `COPY nginx.conf /etc/nginx/conf.d/default.conf`,
      `EXPOSE 80`,
    );
    return lines.join("\n") + "\n";
  }
  lines.push(
    `FROM ${base}`,
    `WORKDIR ${svc.workdir}`,
    `RUN npm install -g pnpm`,
    `COPY pnpm-lock.yaml package.json ./`,
    `RUN ${svc.install}`,
    `COPY . .`,
  );
  if (svc.build) lines.push(`RUN ${svc.build}`);
  if (svc.port != null) lines.push(`EXPOSE ${svc.port}`);
  // CMD as JSON exec form to avoid shell wrapping.
  const tokens = svc.start.split(/\s+/).filter(Boolean);
  lines.push(`CMD ${JSON.stringify(tokens)}`);
  return lines.join("\n") + "\n";
}

function yamlIndent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

function composeServiceBlock(
  svc: ServiceSpec,
  allServices: ServiceSpec[],
): string {
  const lines: string[] = [`${svc.name}:`];
  if (isManaged(svc)) {
    const cmd =
      svc.command ??
      (svc.image === "redis:7-alpine" ? REDIS_DEFAULT_COMMAND : undefined);
    lines.push(`  image: ${svc.image}`);
    if (cmd) lines.push(`  command: ${JSON.stringify(cmd)}`);
    if (svc.envs.length) {
      lines.push(`  environment:`);
      for (const k of svc.envs) lines.push(`    ${k}: \${${k}}`);
    }
    if (svc.volumes && Object.keys(svc.volumes).length) {
      lines.push(`  volumes:`);
      for (const [vol, mount] of Object.entries(svc.volumes)) {
        lines.push(`    - ${vol}:${mount}`);
      }
    }
    if (svc.image === "redis:7-alpine") {
      lines.push(`  deploy:`);
      lines.push(`    resources:`);
      lines.push(`      limits:`);
      lines.push(`        memory: 160M`);
      lines.push(`  healthcheck:`);
      lines.push(`    test: ["CMD", "redis-cli", "ping"]`);
      lines.push(`    interval: 5s`);
      lines.push(`    timeout: 3s`);
      lines.push(`    retries: 10`);
    } else if (svc.image === "postgres:16-alpine") {
      lines.push(`  healthcheck:`);
      lines.push(
        `    test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]`,
      );
      lines.push(`    interval: 5s`);
      lines.push(`    timeout: 3s`);
      lines.push(`    retries: 10`);
    }
    lines.push(`  networks:`);
    lines.push(`    - dokploy-network`);
    lines.push(`  restart: unless-stopped`);
    return lines.join("\n");
  }
  // App service
  const ctx = svc.context === "." ? "." : `./${svc.context.replace(/^\.\//, "")}`;
  lines.push(`  build:`);
  lines.push(`    context: ${ctx}`);
  lines.push(`    dockerfile: Dockerfile`);
  if (svc.envs.length) {
    lines.push(`  environment:`);
    for (const k of svc.envs) lines.push(`    ${k}: \${${k}}`);
  }
  if (svc.port != null) {
    lines.push(`  expose:`);
    lines.push(`    - "${svc.port}"`);
  }
  if (svc.depends.length) {
    // Use service_healthy when the dependency is a managed service with healthcheck.
    const healthcheckedNames = new Set(
      allServices
        .filter(
          (s) =>
            isManaged(s) &&
            (s.image === "redis:7-alpine" || s.image === "postgres:16-alpine"),
        )
        .map((s) => s.name),
    );
    lines.push(`  depends_on:`);
    for (const d of svc.depends) {
      if (healthcheckedNames.has(d)) {
        lines.push(`    ${d}:`);
        lines.push(`      condition: service_healthy`);
      } else {
        lines.push(`    ${d}:`);
        lines.push(`      condition: service_started`);
      }
    }
  }
  lines.push(`  networks:`);
  lines.push(`    - dokploy-network`);
  lines.push(`  restart: unless-stopped`);
  return lines.join("\n");
}

function renderCompose(spec: InfraSpec): string {
  const header = `# Auto-generated by infra-agent. Do not edit by hand — re-run kickoff.\nservices:`;
  const blocks = spec.services.map((s) =>
    yamlIndent(composeServiceBlock(s, spec.services), 2),
  );
  const networks = `networks:\n  dokploy-network:\n    external: true`;
  return [header, blocks.join("\n"), networks, ""].join("\n");
}

function renderEnvExample(spec: InfraSpec): string {
  const seen = new Set<string>();
  const lines: string[] = [
    "# Auto-generated by infra-agent. Copy to .env and fill values.",
    "",
  ];
  for (const svc of spec.services) {
    const envs = svc.envs;
    if (!envs.length) continue;
    lines.push(`# ${svc.name}`);
    for (const k of envs) {
      if (seen.has(k)) continue;
      seen.add(k);
      lines.push(`${k}=`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Pure renderer: InfraSpec → file map (no fs side effects).
 *
 * Layout:
 *   S-tier  → single app at root: ./Dockerfile + ./docker-compose.yml
 *   M/L-tier → one Dockerfile per app service at ./<context>/Dockerfile
 *
 * Managed services contribute only to docker-compose.yml (no Dockerfile).
 */
export function renderInfra(spec: InfraSpec): RenderedInfra {
  const files: Record<string, string> = {};
  const apps = spec.services.filter(isApp);
  if (spec.tier === "S") {
    if (apps.length !== 1) {
      throw new Error(
        `S-tier expects exactly 1 app service, got ${apps.length}`,
      );
    }
    files["Dockerfile"] = dockerfileFor(apps[0]);
  } else {
    for (const app of apps) {
      const dir =
        app.context === "." ? "" : app.context.replace(/^\.\//, "") + "/";
      files[`${dir}Dockerfile`] = dockerfileFor(app);
    }
  }
  files["docker-compose.yml"] = renderCompose(spec);
  const envExample = renderEnvExample(spec);
  if (envExample.trim().length > 0) {
    files[".env.example"] = envExample;
  }
  return { files };
}
