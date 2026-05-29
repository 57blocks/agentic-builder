import fs from "fs/promises";
import path from "path";
import { renderInfra, type ProvisionedServices } from "./render";
import type { InfraSpec } from "./types";

export interface ApplyInfraResult {
  outputDir: string;
  writtenFiles: string[];
  specPath: string;
  /** Path to the scaffold compose backup, if one was moved aside. */
  preservedComposePath?: string;
}

export interface ApplyInfraOptions {
  /** Externally provisioned services (Dokploy-managed pg/redis, etc.). */
  provisioned?: ProvisionedServices;
  /**
   * When true (default), if a `docker-compose.yml` already exists at the
   * output root it is renamed to `docker-compose.local.yml` before the
   * deployment-ready compose is written. Preserves the scaffold's local-dev
   * convenience.
   */
  preserveLocalCompose?: boolean;
}

/**
 * Write rendered Dockerfile / docker-compose.yml / .env.example into the output
 * directory, overwriting whatever the scaffold-copy step shipped. Also persists
 * the spec to `.blueprint/infra-spec.json` so the run is reproducible / debuggable.
 *
 * Caller is responsible for validating the spec before calling this.
 */
export async function applyInfra(
  outputDir: string,
  spec: InfraSpec,
  blueprintDir: string,
  options: ApplyInfraOptions = {},
): Promise<ApplyInfraResult> {
  const preserveLocalCompose = options.preserveLocalCompose ?? true;
  const { files } = renderInfra(spec, options.provisioned);
  let preservedComposePath: string | undefined;
  if (preserveLocalCompose && files["docker-compose.yml"]) {
    const existingCompose = path.join(outputDir, "docker-compose.yml");
    try {
      await fs.access(existingCompose);
      const localCopy = path.join(outputDir, "docker-compose.local.yml");
      // Only move if we haven't already preserved one.
      try {
        await fs.access(localCopy);
      } catch {
        await fs.rename(existingCompose, localCopy);
        preservedComposePath = localCopy;
      }
    } catch {
      /* no existing compose — nothing to preserve */
    }
  }
  const written: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(outputDir, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
    written.push(rel);
  }
  await fs.mkdir(blueprintDir, { recursive: true });
  const specPath = path.join(blueprintDir, "infra-spec.json");
  await fs.writeFile(specPath, JSON.stringify(spec, null, 2), "utf8");
  return { outputDir, writtenFiles: written, specPath, preservedComposePath };
}
