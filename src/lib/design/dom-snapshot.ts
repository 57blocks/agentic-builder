/**
 * Pure, DOM-free assembler that turns the raw HTML ingredients captured by
 * Electron's `render-reference-url` into one self-contained HTML document:
 *   1. strips <script> blocks (the snapshot is a design spec, never runtime code)
 *   2. absolutises relative src/href so assets resolve when opened standalone
 *   3. inlines all captured stylesheet cssText into a single <style>
 *
 * Kept free of any Electron / DOM dependency so it is unit-testable in Node.
 */
export interface RawHtmlCapture {
  /** document.documentElement.outerHTML from the rendered page. */
  outerHTML: string;
  /** cssText of same-origin stylesheets, in document order. */
  stylesheets: string[];
  /** location.href of the captured page, used to absolutise relative URLs. */
  baseUrl: string;
}

function absolutiseUrls(html: string, baseUrl: string): string {
  // Resolve exactly as the browser would against the captured document URL, so
  // a snapshot opened standalone points at where each asset really lives on the
  // demo origin. `new URL(value, baseUrl)` matches browser semantics: the last
  // path segment of baseUrl is treated as the "file", so e.g. "../x" relative to
  // ".../family/dashboard" resolves to ".../x" (up from /family/), not /family/x.
  return html.replace(
    /\b(src|href)=("|')(.*?)\2/gi,
    (match, attr: string, quote: string, value: string) => {
      if (!value || /^(https?:|data:|mailto:|tel:|#|javascript:)/i.test(value)) {
        return match;
      }
      try {
        const abs = new URL(value, baseUrl).href;
        return `${attr}=${quote}${abs}${quote}`;
      } catch {
        return match;
      }
    },
  );
}

export function buildSelfContainedHtml(capture: RawHtmlCapture): string {
  const { outerHTML, stylesheets, baseUrl } = capture;

  let html = outerHTML
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "");

  html = absolutiseUrls(html, baseUrl);

  const css = stylesheets.filter((s) => s && s.trim().length > 0).join("\n");
  if (css) {
    const styleBlock = `<style data-reference-inlined>\n${css}\n</style>`;
    html = /<\/head>/i.test(html)
      ? html.replace(/<\/head>/i, `${styleBlock}\n</head>`)
      : `${styleBlock}\n${html}`;
  }

  return html;
}
