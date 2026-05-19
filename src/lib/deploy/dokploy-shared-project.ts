import fs from "fs/promises";
import path from "path";
import {
  createDokployProject,
  getDokployProject,
  listDokployProjects,
  type DokployBase,
} from "./dokploy";

/**
 * One Dokploy project to hold all per-app Redis (and future infra) services
 * provisioned by Agentic Builder. We cache the resolved project/environment
 * IDs to disk so we don't hit Dokploy for every kickoff.
 */
const SHARED_PROJECT_NAME =
  process.env.DOKPLOY_SHARED_PROJECT_NAME?.trim() ||
  "agentic-builder-shared-infra";

const CACHE_FILE = path.join(".blueprint", "dokploy-shared.json");

export interface SharedProjectIds {
  projectId: string;
  environmentId: string;
  resolvedAt: string;
}

async function readCache(projectRoot: string): Promise<SharedProjectIds | null> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, CACHE_FILE), "utf-8");
    const parsed = JSON.parse(raw) as SharedProjectIds;
    if (parsed.projectId && parsed.environmentId) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writeCache(
  projectRoot: string,
  ids: Omit<SharedProjectIds, "resolvedAt">,
): Promise<void> {
  await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, CACHE_FILE),
    JSON.stringify(
      { ...ids, resolvedAt: new Date().toISOString() } satisfies SharedProjectIds,
      null,
      2,
    ),
    "utf-8",
  );
}

/**
 * Resolve the (projectId, environmentId) for our shared infra project,
 * creating the project if it doesn't exist yet. Cached on disk between calls.
 */
export async function resolveSharedDokployProject(params: {
  base: DokployBase;
  projectRoot: string;
  autoCreate?: boolean;
}): Promise<{ projectId: string; environmentId: string }> {
  const cached = await readCache(params.projectRoot);
  if (cached) {
    return {
      projectId: cached.projectId,
      environmentId: cached.environmentId,
    };
  }

  const projects = await listDokployProjects(params.base);
  let project = projects.find((p) => p.name === SHARED_PROJECT_NAME);
  if (!project) {
    if (params.autoCreate === false) {
      throw new Error(
        `Dokploy project "${SHARED_PROJECT_NAME}" not found. Create it manually in Dokploy UI, or set DOKPLOY_SHARED_PROJECT_NAME to point to an existing project.`,
      );
    }
    const created = await createDokployProject({
      ...params.base,
      name: SHARED_PROJECT_NAME,
    });
    await writeCache(params.projectRoot, {
      projectId: created.projectId,
      environmentId: created.environmentId,
    });
    return created;
  }

  // Project found via listing — environments may be absent on the summary,
  // so fetch the full record to grab the first environmentId.
  const full = project.environments?.length
    ? project
    : await getDokployProject({ ...params.base, projectId: project.projectId });
  const env = full.environments?.[0];
  if (!env?.environmentId) {
    throw new Error(
      `Dokploy project "${SHARED_PROJECT_NAME}" has no environments. Open it in Dokploy UI and create one.`,
    );
  }
  await writeCache(params.projectRoot, {
    projectId: full.projectId,
    environmentId: env.environmentId,
  });
  return { projectId: full.projectId, environmentId: env.environmentId };
}

/** Default Redis host = Dokploy base URL hostname, unless explicitly overridden. */
export function deriveRedisHost(baseUrl: string): string {
  const override = process.env.DOKPLOY_REDIS_HOST?.trim();
  if (override) return override;
  return new URL(baseUrl).hostname;
}
