import fs from "fs/promises";
import path from "path";
import { renderInfra } from "./render";
import type { InfraSpec } from "./types";

export interface ApplyInfraResult {
  outputDir: string;
  writtenFiles: string[];
  specPath: string;
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
): Promise<ApplyInfraResult> {
  const { files } = renderInfra(spec);
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
  return { outputDir, writtenFiles: written, specPath };
}
