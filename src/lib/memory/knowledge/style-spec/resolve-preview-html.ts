/**
 * Resolve Style Spec HTML preview, with fallback re-render for legacy records.
 */
import { extractStyleSpec, extractStyleSpecHtml } from "./compose-body";
import { renderStyleSpecHtml } from "./render-html";

export function resolveStyleSpecPreviewHtml(body: string): string | null {
  const embeddedHtml = extractStyleSpecHtml(body);
  const spec = extractStyleSpec(body);
  if (!spec) return embeddedHtml;

  // Always re-render from the structured JSON when available so UI preview
  // reflects the latest template (even for legacy stored records).
  try {
    return renderStyleSpecHtml(spec);
  } catch {
    return embeddedHtml;
  }
}

