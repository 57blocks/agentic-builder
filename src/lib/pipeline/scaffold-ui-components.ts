// src/lib/pipeline/scaffold-ui-components.ts
import fs from "fs/promises";
import path from "path";

/**
 * The shadcn/ui component modules actually shipped in a scaffolded frontend, read
 * from `<frontendDir>/src/components/ui/*.tsx` (the barrel `index` is excluded).
 * Returned as sorted kebab module names (e.g. `["badge","button","card", …]`) —
 * the names usable in a `@/components/ui/<name>` subpath import.
 *
 * The prototype prompts inject this so the model imports ONLY installed components
 * (the scaffold ships a fixed subset; importing e.g. `@/components/ui/radio-group`
 * when it isn't installed breaks the Vite dev server). Best-effort: returns [] if
 * the directory can't be read.
 */
export async function listScaffoldUiComponents(frontendDir: string): Promise<string[]> {
  const uiDir = path.join(frontendDir, "src", "components", "ui");
  try {
    const entries = await fs.readdir(uiDir);
    return entries
      .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
      .map((f) => f.replace(/\.(tsx|ts)$/, ""))
      .filter((name) => name !== "index")
      .sort();
  } catch {
    return [];
  }
}
