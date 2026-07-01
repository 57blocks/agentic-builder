// src/lib/pipeline/prototype-demo-css.ts
import path from "path";

/** Where the extracted demo design tokens are written, relative to the frontend dir. */
export const PROTOTYPE_DEMO_CSS_REL = path.join("src", "styles", "prototype-demo.css");

/** The `@import` line index.css needs so the injected demo tokens load. */
export const DEMO_CSS_IMPORT = `@import "./styles/prototype-demo.css";`;

/**
 * Idempotently add the `prototype-demo.css` import to an `index.css`, placed
 * after the existing leading `@import` statements (CSS requires `@import` before
 * other rules). Returns the content unchanged when the import is already present.
 */
export function ensureDemoCssImport(indexCss: string): string {
  if (indexCss.includes("prototype-demo.css")) return indexCss;
  const lines = indexCss.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*@import\b/.test(lines[i])) {
      insertAt = i + 1;
    } else if (lines[i].trim() === "") {
      continue;
    } else {
      break;
    }
  }
  lines.splice(insertAt, 0, DEMO_CSS_IMPORT);
  return lines.join("\n");
}
