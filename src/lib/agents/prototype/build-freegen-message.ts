// src/lib/agents/prototype/build-freegen-message.ts
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";

export interface FreegenMessageInput {
  componentName: string;
  hint: PrdPageHint;
  prdContent: string;
  designContext: string;
  /**
   * shadcn/ui component modules actually installed in the scaffold (kebab names).
   * Injected so the model imports ONLY these; importing an uninstalled
   * `@/components/ui/<name>` breaks the dev server.
   */
  availableComponents?: string[];
}

/**
 * Slice the PRD down to the heading section for one page (heading line through
 * just before the next heading of the same-or-higher level). Bounds per-page
 * token cost on large PRDs. Falls back to the bare page name when no heading
 * mentions the page name or route.
 */
export function extractPageSection(prdContent: string, hint: PrdPageHint): string {
  const lines = prdContent.split("\n");
  const needle = hint.name.toLowerCase();
  const route = hint.route?.toLowerCase();
  let start = -1;
  let startLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)/);
    if (!m) continue;
    const text = m[2].toLowerCase();
    if (text.includes(needle) || (route && text.includes(route))) {
      start = i;
      startLevel = m[1].length;
      break;
    }
  }
  if (start < 0) return `${hint.name}${hint.route ? ` (${hint.route})` : ""}`;
  const out: string[] = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= startLevel) break;
    out.push(lines[i]);
  }
  return out.join("\n").trim();
}

/**
 * Free-generate a static page from the DesignSpec design system + the PRD page
 * section (used when no captured demo HTML exists for the page). PRD is the
 * authority; logic is stubbed with `// TODO(logic): …` seams.
 */
export function buildFreegenMessage(input: FreegenMessageInput): string {
  const section = extractPageSection(input.prdContent, input.hint);
  const route = input.hint.route ?? "";
  return [
    `# Task: free-generate ONE static page into the scaffold frontend`,
    ``,
    `There is **no captured demo HTML** for this page — generate it from the`,
    `design system + the PRD page spec below.`,
    ``,
    `Page name: **${input.hint.name}**`,
    `Mount route: \`${route}\``,
    `Component file: \`src/views/${input.componentName}.tsx\``,
    ``,
    `## Output contract (STRICT)`,
    `- Output ONLY one fenced tsx code block — the full file, no prose.`,
    `- Export the component as a NAMED export: \`export function ${input.componentName}() { … }\`.`,
    `- Import shadcn primitives from \`@/components/ui\`; use \`@/\` path aliases.`,
    `- This page has NO captured demo CSS. Style it ONLY with the scaffold design`,
    `  system: scaffold semantic Tailwind classes (e.g. \`bg-primary\`, \`text-muted\`,`,
    `  \`border-border\`, \`rounded-md\`, spacing/typography utilities).`,
    `- DO NOT use \`var(--…)\` custom-property utilities and DO NOT invent token names —`,
    `  only the scaffold's own semantic tokens/utilities exist here.`,
    ...(input.availableComponents && input.availableComponents.length > 0
      ? [
          `- The ONLY shadcn components installed are: ${input.availableComponents.join(", ")}.`,
          `  Import these from \`@/components/ui\`. Do NOT import any \`@/components/ui/<name>\``,
          `  not in this list — use a plain HTML element instead. Never invent a component path.`,
        ]
      : []),
    ``,
    `## Logic is STUBBED (v1 per-page, static)`,
    `- Static markup + placeholder data + INERT handlers.`,
    `- Mark every place real logic belongs with an explicit \`// TODO(logic): …\` seam.`,
    `- Duplicate shared chrome (nav/layout) inline — do NOT extract shared components.`,
    ``,
    `## PRD page spec (authoritative)`,
    section,
    ``,
    `## Design system context (tokens + component rules — build from these)`,
    input.designContext,
  ].join("\n");
}
