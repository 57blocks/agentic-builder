// src/lib/pipeline/prototype-marker.ts
import fs from "fs/promises";
import path from "path";
import type { ScaffoldTier } from "@/lib/pipeline/scaffold-copy";

/** Source a page's static markup was generated from (also recorded per page in the marker). */
export type PrototypePageSource = "demo-html" | "url" | "design-spec";

export interface PrototypeMarkerPage {
  pageId: string;
  route: string;
  source: PrototypePageSource;
  /** Path to the generated view file, relative to the frontend dir, e.g. `src/views/Dashboard.tsx`. */
  file: string;
}

/**
 * `.blueprint/prototype.json` — the gate every downstream stage checks (sub-project 3).
 * `generatedFiles` is the preserve-list coding must not overwrite.
 */
export interface PrototypeMarker {
  generatedAt: string;
  scaffoldTier: ScaffoldTier;
  scopeTier: ScaffoldTier;
  baseScaffoldCopied: true;
  pages: PrototypeMarkerPage[];
  /** Output-root-relative paths of every file the prototype step generated. */
  generatedFiles: string[];
}

export const PROTOTYPE_MARKER_REL = path.join(".blueprint", "prototype.json");

export function prototypeMarkerPath(outputRoot: string): string {
  return path.join(outputRoot, PROTOTYPE_MARKER_REL);
}

export async function writePrototypeMarker(
  outputRoot: string,
  marker: PrototypeMarker,
): Promise<void> {
  const p = prototypeMarkerPath(outputRoot);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, `${JSON.stringify(marker, null, 2)}\n`, "utf-8");
}

export async function readPrototypeMarker(
  outputRoot: string,
): Promise<PrototypeMarker | null> {
  try {
    const raw = await fs.readFile(prototypeMarkerPath(outputRoot), "utf-8");
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as PrototypeMarker).pages)
    ) {
      return null;
    }
    return parsed as PrototypeMarker;
  } catch {
    return null;
  }
}
