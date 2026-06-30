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
}

/**
 * Reduce a captured self-contained HTML snapshot to the portable structural
 * markup: strip inlined `<style>` (target reuses the same Tailwind v4 + tokens,
 * so the demo's classes map directly) and return the `<body>` inner markup.
 */
export function extractPortableMarkup(html: string): string {
  const noStyle = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  const body = noStyle.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (body ? body[1] : noStyle).trim();
}

/**
 * Assemble the user message for the port. The PRD wins on any conflict; the demo
 * informs visual/structural fidelity only. Logic is stubbed with explicit
 * `// TODO(logic): …` seams so sub-project 3's modify tasks have insertion points.
 */
export function buildPortMessage(input: PortMessageInput): string {
  const markup = extractPortableMarkup(input.capturedHtml);
  return [
    `# Task: port ONE page into the scaffold frontend`,
    ``,
    `Page name: **${input.pageName}**`,
    `Mount route: \`${input.route}\``,
    `Component file: \`src/views/${input.componentName}.tsx\``,
    ``,
    `## Output contract (STRICT)`,
    `- Output ONLY one fenced \`\`\`tsx code block — the full file, no prose.`,
    `- Export the component as a NAMED export: \`export function ${input.componentName}() { … }\`.`,
    `- Import shadcn primitives from \`@/components/ui\` and use \`@/\` path aliases.`,
    `- Use the design-system tokens / Tailwind v4 classes below; reuse the demo's`,
    `  Tailwind classes where they map. Do not add a new design system.`,
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
