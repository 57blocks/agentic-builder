import fs from "fs/promises";
import path from "path";
import type { DokployBase } from "@/lib/deploy/dokploy";
import {
  createAppDokployProject,
  derivePublicHost,
} from "./dokploy-project";
import { detectRequiredServices } from "./detect";
import { provisionDatabase } from "./database";
import { provisionRedis } from "./redis";
import { provisionAppS3, readSharedS3Config } from "./s3";
import type {
  InfraServiceInfo,
  KickoffInfraFile,
  ProvisionInfraInput,
  ProvisionInfraResult,
} from "./types";

const RELATIVE_KICKOFF_INFRA_FILE = path.join(".blueprint", "kickoff-infra.json");

export function kickoffInfraJsonPath(projectRoot: string): string {
  return path.join(projectRoot, RELATIVE_KICKOFF_INFRA_FILE);
}

export async function readKickoffInfraMetadata(
  projectRoot: string,
): Promise<KickoffInfraFile | null> {
  try {
    const raw = await fs.readFile(kickoffInfraJsonPath(projectRoot), "utf-8");
    return JSON.parse(raw) as KickoffInfraFile;
  } catch {
    return null;
  }
}

async function saveKickoffInfraMetadata(
  projectRoot: string,
  data: Omit<KickoffInfraFile, "savedAt">,
): Promise<KickoffInfraFile> {
  await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
  const payload: KickoffInfraFile = {
    ...data,
    savedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    kickoffInfraJsonPath(projectRoot),
    JSON.stringify(payload, null, 2),
    "utf-8",
  );
  return payload;
}

function urlForKind(
  services: InfraServiceInfo[],
  kind: InfraServiceInfo["kind"],
): InfraServiceInfo | undefined {
  return services.find((s) => s.kind === kind);
}

/**
 * One-shot kickoff infra provisioner:
 *   1. Detect needed services from TRD/SysDesign.
 *   2. Create one Dokploy project for this app.
 *   3. Provision PG + Redis in parallel (only the ones detected).
 *   4. Persist metadata for downstream `coding/` and `deploy/` to consume.
 *
 * Skips entirely if DOKPLOY_URL/DOKPLOY_TOKEN are missing.
 */
export async function provisionInfra(
  input: ProvisionInfraInput,
): Promise<ProvisionInfraResult> {
  const baseUrl = process.env.DOKPLOY_URL?.trim();
  const token = process.env.DOKPLOY_TOKEN?.trim();
  const dokployConfigured = !!baseUrl && !!token;

  const detection = await detectRequiredServices(input.designDocs);
  const required = detection.services;
  const detectionTag =
    detection.source === "llm"
      ? `LLM${detection.costUsd ? ` $${detection.costUsd.toFixed(4)}` : ""}`
      : `regex${detection.fallbackReason ? ` (LLM fallback: ${detection.fallbackReason})` : ""}`;

  if (!required.needsPostgres && !required.needsRedis && !required.needsS3) {
    return {
      ok: true,
      skipped: true,
      skipReason: "no infra detected from TRD/SysDesign",
      metadata: null,
      markdownLines: [
        "### Infra",
        `_No managed services detected (${detectionTag}) — skipped provisioning._`,
        "",
      ],
    };
  }

  // Postgres/Redis live in a per-app Dokploy project; S3 is a shared bucket and
  // needs no Dokploy at all. When only S3 is needed (or Dokploy isn't
  // configured) we still provision S3 and skip the Dokploy services.
  const needsDokploy = required.needsPostgres || required.needsRedis;
  const detectedLabel = [
    required.needsPostgres && "postgres",
    required.needsRedis && "redis",
    required.needsS3 && "s3",
  ]
    .filter(Boolean)
    .join(" + ");
  const lines: string[] = [
    "### Infra (managed services)",
    `- Service detection: ${detectionTag} → ${detectedLabel}`,
  ];

  const services: InfraServiceInfo[] = [];
  const errors: string[] = [];

  // ── S3 (shared bucket, per-app folder) — Dokploy-independent ──────────────
  if (required.needsS3) {
    try {
      if (!readSharedS3Config()) {
        lines.push(
          "- ⚠️ S3 detected but skipped — set `BLUEPRINT_S3_BUCKET` (+ credentials) to enable shared-bucket provisioning.",
        );
      } else {
        const s3 = provisionAppS3({ appName: input.appName });
        services.push(s3);
        lines.push(`- Provisioned s3 folder \`${s3.publicUrl}\``);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // ── Postgres / Redis (per-app Dokploy containers) ─────────────────────────
  let project: Awaited<ReturnType<typeof createAppDokployProject>> | null = null;
  if (needsDokploy) {
    if (!dokployConfigured) {
      lines.push(
        "- ⚠️ Postgres/Redis detected but skipped — set `DOKPLOY_URL` + `DOKPLOY_TOKEN` to provision them.",
      );
    } else {
      const base: DokployBase = { baseUrl, token };
      const portBase = Number(process.env.DOKPLOY_PORT_BASE ?? "");
      const portBaseResolved =
        Number.isFinite(portBase) && portBase > 0 ? portBase : undefined;
      const publicHost = derivePublicHost(baseUrl);

      try {
        project = await createAppDokployProject({ base, appName: input.appName });
        lines.push(
          `- Created Dokploy project \`${project.projectName}\` (id: \`${project.projectId}\`)`,
        );

        const tasks: Promise<InfraServiceInfo>[] = [];
        if (required.needsPostgres) {
          tasks.push(
            provisionDatabase({
              base,
              project,
              appName: input.appName,
              publicHost,
              portBase: portBaseResolved,
            }),
          );
        }
        if (required.needsRedis) {
          tasks.push(
            provisionRedis({
              base,
              project,
              appName: input.appName,
              publicHost,
              portBase: portBaseResolved,
            }),
          );
        }

        const settled = await Promise.allSettled(tasks);
        for (const r of settled) {
          if (r.status === "fulfilled") {
            services.push(r.value);
            lines.push(
              `- Provisioned ${r.value.kind} \`${r.value.appName}\` on port ${r.value.externalPort}`,
            );
          } else {
            errors.push(
              r.reason instanceof Error ? r.reason.message : String(r.reason),
            );
          }
        }
      } catch (e) {
        errors.push(
          `Failed to create Dokploy project: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  for (const err of errors) {
    lines.push(`- ❌ Provision failure: ${err}`);
  }
  lines.push("");

  if (services.length === 0) {
    return {
      ok: false,
      error: errors[0] ?? "no services provisioned",
      metadata: null,
      markdownLines: lines,
    };
  }

  const metadata = await saveKickoffInfraMetadata(input.projectRoot, {
    // S3-only runs have no Dokploy project; empty strings make the deploy
    // pipeline create a fresh project on first deploy (it treats falsy as
    // "none yet"), which is exactly the desired behaviour.
    dokployProjectId: project?.projectId ?? "",
    dokployEnvironmentId: project?.environmentId ?? "",
    appName: project?.projectName ?? input.appName,
    services,
  });
  return {
    ok: errors.length === 0,
    metadata,
    error: errors.length ? errors.join("; ") : undefined,
    markdownLines: lines,
  };
}

export function databaseUrlFrom(meta: KickoffInfraFile | null): string | null {
  if (!meta) return null;
  return urlForKind(meta.services, "postgres")?.publicUrl ?? null;
}

export function redisUrlFrom(meta: KickoffInfraFile | null): string | null {
  if (!meta) return null;
  return urlForKind(meta.services, "redis")?.publicUrl ?? null;
}

export function internalDatabaseUrlFrom(
  meta: KickoffInfraFile | null,
): string | null {
  if (!meta) return null;
  return urlForKind(meta.services, "postgres")?.internalUrl ?? null;
}

export function internalRedisUrlFrom(
  meta: KickoffInfraFile | null,
): string | null {
  if (!meta) return null;
  return urlForKind(meta.services, "redis")?.internalUrl ?? null;
}

/**
 * The S3 credential bundle (bucket, region, keys, per-app prefix) the generated
 * app needs in its `.env`. Returns null when no S3 service was provisioned.
 * S3 access is identical from local dev and inside the deployed container, so
 * there's no public/internal split like Postgres/Redis have.
 */
export function s3EnvFrom(
  meta: KickoffInfraFile | null,
): Record<string, string> | null {
  if (!meta) return null;
  return urlForKind(meta.services, "s3")?.env ?? null;
}

/**
 * Read-modify-write the `compose` field on `kickoff-infra.json`. Used by the
 * deploy pipeline after a fresh compose stack is created so subsequent
 * deploys can find it and reuse instead of leaking new composes per click.
 * Throws if the file is missing — first deploy must run with a real infra
 * provision in place, otherwise nothing to attach the compose to.
 */
export async function persistComposeOnInfra(
  projectRoot: string,
  compose: Omit<import("./types").ComposeInfo, "savedAt">,
): Promise<KickoffInfraFile> {
  const current = await readKickoffInfraMetadata(projectRoot);
  if (!current) {
    throw new Error(
      "kickoff-infra.json not found — cannot persist compose info. Run kickoff first.",
    );
  }
  const next: KickoffInfraFile = {
    ...current,
    compose: { ...compose, savedAt: new Date().toISOString() },
  };
  await fs.writeFile(
    kickoffInfraJsonPath(projectRoot),
    JSON.stringify(next, null, 2),
    "utf-8",
  );
  return next;
}

export * from "./types";
