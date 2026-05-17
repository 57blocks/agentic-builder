/**
 * Compose / parse the body of a `design-knowledge` memory record produced
 * from a single reference image.
 *
 * Body layout (Markdown), persisted at `.memory/records/design-knowledge/<id>.md`:
 *
 *     <!-- style-spec:json
 *     { ...full StyleSpec JSON, machine-readable… }
 *     -->
 *
 *     # Style Spec — <imageName>
 *
 *     ## Style Spec (Markdown)
 *     …compact markdown produced by render-markdown.ts…
 *
 *     ## Style Spec (HTML)
 *     ```html
 *     …full HTML document produced by render-html.ts…
 *     ```
 *
 * Why this layout:
 *  - The leading HTML comment with embedded JSON lets us round-trip the
 *    structured spec (UI preview, regeneration) without re-parsing markdown.
 *  - The two visible Markdown sections double as the LLM-injection payload
 *    during recall — DesignAgent gets both the compact tokens and the
 *    full HTML visualisation as concrete reference material.
 */

import type { StyleSpec } from "./types";
import { renderStyleSpecMarkdown } from "./render-markdown";
import { renderStyleSpecHtml } from "./render-html";

const JSON_OPEN = "<!-- style-spec:json";
const JSON_CLOSE = "-->";

export function composeStyleSpecRecordBody(spec: StyleSpec): string {
  const md = renderStyleSpecMarkdown(spec);
  const html = renderStyleSpecHtml(spec);
  const json = JSON.stringify(spec, null, 2);

  return [
    `${JSON_OPEN}`,
    json,
    `${JSON_CLOSE}`,
    "",
    `# Style Spec — ${spec.imageName}`,
    "",
    "## Style Spec (Markdown)",
    "",
    md,
    "",
    "## Style Spec (HTML)",
    "",
    "```html",
    html,
    "```",
    "",
  ].join("\n");
}

/**
 * Extract the structured StyleSpec JSON from a stored record body, or null
 * when the body does not embed a spec (e.g. legacy 57b guideline records).
 */
export function extractStyleSpec(body: string): StyleSpec | null {
  const openIdx = body.indexOf(JSON_OPEN);
  if (openIdx < 0) return null;
  const startIdx = openIdx + JSON_OPEN.length;
  const closeIdx = body.indexOf(JSON_CLOSE, startIdx);
  if (closeIdx < 0) return null;
  const raw = body.slice(startIdx, closeIdx).trim();
  try {
    return JSON.parse(raw) as StyleSpec;
  } catch {
    return null;
  }
}

/**
 * Extract the first ```html fenced code block from a record body — used by
 * the UI to drive an iframe preview without re-rendering from JSON.
 *
 * This works for both `design-knowledge` Style Spec records and Daily Trend
 * Refresh records (both embed a self-contained HTML document inside a
 * `## ... (HTML)` section).
 */
export function extractStyleSpecHtml(body: string): string | null {
  const fenceMatch = body.match(/```html\r?\n([\s\S]*?)\r?\n```/);
  return fenceMatch ? fenceMatch[1] : null;
}

/**
 * Build a token-efficient body suitable for LLM injection.
 *
 * The persisted body of a Style Spec record can be 15-25 KB (the full HTML
 * visualisation document alone is sizable). When injected into a DesignAgent
 * prompt, that easily blows past the per-block token budget and starves
 * other records of room.
 *
 * This helper:
 *   - keeps the Markdown summary (compact design tokens)
 *   - extracts the `:root { … }` block from the HTML document — the CSS
 *     variables there are the densest visual signal for the LLM
 *   - omits the rest of the HTML document (visual decoration only useful for
 *     human preview, not for LLM consumption)
 */
export function condenseStyleSpecForRecall(body: string): string {
  const json = extractStyleSpec(body);
  const html = extractStyleSpecHtml(body) ?? "";

  // Pull the markdown section out — accept both the Style Spec layout and
  // the Trend Refresh layout so this helper can dedupe-trim either kind.
  const mdMatch =
    body.match(/## Style Spec \(Markdown\)\s*([\s\S]*?)\n## Style Spec \(HTML\)/) ??
    body.match(/## Trend Report \(Markdown\)\s*([\s\S]*?)\n## Trend Report \(HTML\)/);
  const md = (mdMatch?.[1] ?? "").trim();

  // Pull the `:root { … }` block — concrete design tokens as CSS variables.
  const rootMatch = html.match(/:root\s*\{([\s\S]*?)\}/);
  const cssVars = rootMatch ? rootMatch[0] : "";

  const lines: string[] = [];
  if (json) {
    lines.push(`# Style Spec — ${json.imageName}`);
    lines.push(
      `Industry: ${json.industry} | Reference: ${json.imagePath}`,
    );
    lines.push("");
  }
  if (md) {
    lines.push(md);
    lines.push("");
  }
  if (cssVars) {
    lines.push("## CSS Variables (extracted from HTML preview)");
    lines.push("```css");
    lines.push(cssVars);
    lines.push("```");
  }
  return lines.join("\n").trim();
}

/**
 * Compact id derived from the image basename — stable so re-analysing the
 * same image overwrites the previous record instead of duplicating it.
 */
export function styleSpecRecordId(imageName: string): string {
  const safe = imageName
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .slice(0, 48);
  return `DK-img-${safe}`;
}
