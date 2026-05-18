import path from "path";
import fs from "fs/promises";

/**
 * Scans frontend/src/components/**\/*.tsx for exported component Props types and
 * returns a compact "Component Interface Reference" block injected into the
 * integration prompt. This lets the integration agent know the EXACT prop names
 * each component expects, preventing TS2322 "Property X does not exist" regressions.
 *
 * Uses regex — good enough for the standard `type XxxProps = { ... }` /
 * `interface XxxProps { ... }` patterns produced by the scaffold. Falls back to
 * an empty string if the frontend directory doesn't exist.
 */
export async function buildComponentInterfaceReference(
  outputDir: string,
): Promise<string> {
  const componentsDir = path.join(outputDir, "frontend", "src", "components");
  let tsxFiles: string[] = [];
  try {
    tsxFiles = await collectTsxFiles(componentsDir);
  } catch {
    return "";
  }
  if (tsxFiles.length === 0) return "";

  const entries: string[] = [];

  for (const filePath of tsxFiles) {
    const raw = await fs.readFile(filePath, "utf-8").catch(() => "");
    if (!raw) continue;

    // Match both `type XxxProps = { ... }` and `interface XxxProps { ... }` (multiline)
    const blockRe =
      /(?:export\s+)?(?:type|interface)\s+(\w+Props)\s*(?:=\s*)?\{([\s\S]*?)\}/g;
    let match: RegExpExecArray | null;

    while ((match = blockRe.exec(raw)) !== null) {
      const propsName = match[1];
      const body = match[2];

      // Extract field names (required and optional)
      const fieldRe = /^\s*(?:readonly\s+)?(\w+)(\?)?:/gm;
      const fields: string[] = [];
      let fieldMatch: RegExpExecArray | null;
      while ((fieldMatch = fieldRe.exec(body)) !== null) {
        const name = fieldMatch[1];
        const optional = fieldMatch[2] === "?";
        if (name !== "children") {
          fields.push(optional ? `${name}?` : name);
        }
      }

      if (fields.length === 0) continue;

      // Derive component name from Props name (strip trailing "Props")
      const componentName = propsName.replace(/Props$/, "");
      const relPath = path.relative(path.join(outputDir, "frontend"), filePath);
      entries.push(
        `- **${componentName}** (\`${relPath}\`): ${fields.join(", ")}`,
      );
    }
  }

  if (entries.length === 0) return "";

  return [
    "## Component Interface Reference (use EXACT prop names — TS2322 mismatches are P0 HARD FAIL)",
    "Each line lists a component and its accepted prop names (? = optional).",
    "Pass ONLY these names. Unknown props cause TypeScript errors that BLOCK report_done(pass).",
    ...entries,
  ].join("\n");
}

export async function collectTsxFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectTsxFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}
