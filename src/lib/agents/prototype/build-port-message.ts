// src/lib/agents/prototype/build-port-message.ts

export interface PortMessageInput {
  /** PascalCase component / named export, e.g. `Dashboard`. */
  componentName: string;
  /** Human page name from the PRD hint, e.g. `Family Dashboard`. */
  pageName: string;
  /** Route this page is mounted at, e.g. `/dashboard`. */
  route: string;
  /** Captured demo HTML (self-contained snapshot from sub-project 1). */
  capturedHtml: string;
  /** Frontend design-system context (tokens + Tailwind/shadcn rules) to reuse. */
  designContext: string;
  /** Relevant PRD text for this page (PRD is the source of truth on conflicts). */
  prdExcerpt: string;
  /**
   * Theme-scope class (e.g. `family-theme`) the captured markup uses to activate
   * its CSS custom properties. When set, the model must keep it on the page root
   * so ported `bg-[var(--…)]` utilities resolve against the injected demo tokens
   * (see `extractStyleTokens` + `prototype-demo.css`).
   */
  themeScopeClass?: string;
}

/** Concatenated text of every `<style>` block in a captured HTML snapshot. */
function collectStyleText(html: string): string {
  const blocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  return blocks.map((b) => b.replace(/<\/?style[^>]*>/gi, "")).join("\n");
}

/**
 * Extract the DESIGN-TOKEN layer from a captured page's inlined CSS: the rule
 * blocks that DEFINE app-level css custom properties (`:root{…--x:…}`,
 * `.family-theme{…}`, `@theme{…}`). Dropped: compiled Tailwind utility rules
 * (`.flex{display:flex}`), property-less hook classes, and Tailwind's own
 * internal `--tw-*` reset block (the scaffold's Tailwind already emits it) — we
 * only need the variables the ported `var(--…)` classes reference.
 *
 * Note: `extractPortableMarkup` intentionally strips `<style>` from the MARKUP we
 * send the model (the ~70KB utility bundle is noise). This function recovers just
 * the variable definitions so they can be injected into the scaffold separately.
 */
export function extractStyleTokens(html: string): string {
  const css = collectStyleText(html);
  if (!css) return "";
  // Match top-level "selector { body }" blocks whose body declares at least one
  // NON-`--tw-` custom property (a real design token). CSS var declaration bodies
  // contain no nested braces, so a brace-free body match is safe and avoids
  // pulling in @media wrappers.
  const blocks: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const selector = m[1].trim();
    const body = m[2];
    if (/(^|[\s;{])--(?!tw-)[\w-]+\s*:/.test(body)) {
      blocks.push(`${selector} {${body}}`);
    }
  }
  return blocks.join("\n");
}

/**
 * The first `*-theme` scope class on the captured markup (e.g. `family-theme`).
 * Demo pages scope their tokens under such a class; the ported page must keep it
 * for the scoped variables to apply. Returns null when absent.
 */
export function extractThemeScopeClass(html: string): string | null {
  const classAttrs = html.match(/class(?:Name)?\s*=\s*"([^"]*)"/gi) ?? [];
  for (const attr of classAttrs) {
    const value = attr.replace(/^[^"]*"/, "").replace(/"$/, "");
    for (const tok of value.split(/\s+/)) {
      if (/^[a-z][\w-]*-theme$/i.test(tok)) return tok;
    }
  }
  return null;
}

/**
 * Reduce a captured self-contained HTML snapshot to the portable structural
 * markup for the model: strip inlined `<style>` (the ~70KB compiled Tailwind
 * bundle is noise the scaffold regenerates) and return the `<body>` inner markup.
 *
 * IMPORTANT: the demo's DESIGN TOKENS (`--bg`, `--primary`, … in `:root` /
 * `.*-theme` blocks) also live in that `<style>` and MUST NOT be lost — the ported
 * markup references them via `bg-[var(--…)]`. They are recovered separately by
 * `extractStyleTokens` and injected into the scaffold as `prototype-demo.css`.
 *
 * Assumes the capture pipeline has already removed <script> tags; a literal
 * `</body>` inside a script string would otherwise truncate extraction.
 */
export function extractPortableMarkup(html: string): string {
  const noStyle = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  const body = noStyle.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (body ? body[1] : noStyle).trim();
}

/**
 * Encode any run of backticks as HTML entities so captured markup cannot escape
 * the ```html fence it is embedded in (prompt-structure injection guard). Safe
 * for reference markup — the model reads structure/classes, not literal backticks.
 */
function fenceSafe(markup: string): string {
  return markup.replace(/`/g, "&#96;");
}

/**
 * Assemble the user message for the port. The PRD wins on any conflict; the demo
 * informs visual/structural fidelity only. Logic is stubbed with explicit
 * `// TODO(logic): …` seams so sub-project 3's modify tasks have insertion points.
 */
export function buildPortMessage(input: PortMessageInput): string {
  const markup = fenceSafe(extractPortableMarkup(input.capturedHtml));
  const scopeLine = input.themeScopeClass
    ? `- KEEP the demo's theme-scope class \`${input.themeScopeClass}\` on the component's ROOT element exactly — it activates the CSS custom properties (\`--bg\`, \`--primary\`, …) that the \`bg-[var(--…)]\` utilities below depend on.`
    : null;
  return [
    `# Task: port ONE page into the scaffold frontend`,
    ``,
    `Page name: **${input.pageName}**`,
    `Mount route: \`${input.route}\``,
    `Component file: \`src/views/${input.componentName}.tsx\``,
    ``,
    `## Output contract (STRICT)`,
    `- Output ONLY one fenced tsx code block — the full file, no prose.`,
    `- Export the component as a NAMED export: \`export function ${input.componentName}() { … }\`.`,
    `- Import shadcn primitives from \`@/components/ui\` and use \`@/\` path aliases.`,
    `- PRESERVE the demo's class names verbatim, INCLUDING arbitrary-value utilities`,
    `  like \`bg-[var(--bg)]\` / \`text-[var(--primary)]\` — the demo's design tokens are`,
    `  injected into the app separately, so these resolve. Do not invent a new design system.`,
    ...(scopeLine ? [scopeLine] : []),
    ``,
    `## Logic is STUBBED (v1 per-page, static)`,
    `- Static markup + placeholder data + INERT handlers.`,
    `- Mark every place real logic belongs with an explicit \`// TODO(logic): …\` seam`,
    `  (data fetching, submit handlers, navigation targets, auth gating).`,
    `- Duplicate shared chrome (nav/layout) inline — do NOT extract shared components.`,
    ``,
    `## PRD (authoritative — wins on any conflict with the demo)`,
    input.prdExcerpt,
    ``,
    `## Design system context (tokens + component rules — reuse these)`,
    input.designContext,
    ``,
    `## Captured demo markup (visual/structural reference ONLY)`,
    "```html",
    markup,
    "```",
  ].join("\n");
}
