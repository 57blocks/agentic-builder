/**
 * Read / write the subsystem manifest at `.blueprint/subsystems.json`.
 * Mirrors the kickoff-snapshot IO pattern: best-effort, never throws on write,
 * returns null on a missing/corrupt file.
 */

import fs from "fs/promises";
import path from "path";

import type { SubsystemManifest } from "./types";

const MANIFEST_FILE = path.join(".blueprint", "subsystems.json");

function manifestPath(projectRoot: string): string {
  return path.join(projectRoot, MANIFEST_FILE);
}

export async function writeSubsystemManifest(
  projectRoot: string,
  manifest: SubsystemManifest,
): Promise<void> {
  try {
    await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
    await fs.writeFile(
      manifestPath(projectRoot),
      JSON.stringify(manifest, null, 2) + "\n",
      "utf-8",
    );
    console.log(
      `[Subsystems] Saved manifest: ${manifest.subsystems.length} subsystem(s).`,
    );
  } catch (err) {
    console.warn(
      `[Subsystems] Failed to write manifest (ignored):`,
      err instanceof Error ? err.message : err,
    );
  }
}

export async function readSubsystemManifest(
  projectRoot: string,
): Promise<SubsystemManifest | null> {
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath(projectRoot), "utf-8");
  } catch {
    return null; // no manifest → whole-system (legacy) mode
  }
  try {
    const parsed = JSON.parse(raw) as SubsystemManifest;
    if (!parsed || !Array.isArray(parsed.subsystems)) return null;
    return parsed;
  } catch (err) {
    console.warn(
      `[Subsystems] Corrupt manifest at ${MANIFEST_FILE} (ignored):`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
