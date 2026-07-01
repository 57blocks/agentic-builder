// src/lib/agents/prototype/validate-ui-imports.ts

/**
 * Return the `@/components/ui/<name>` subpath imports in a generated view whose
 * `<name>` is NOT among the installed scaffold components. These are the imports
 * that break the Vite dev server (e.g. `@/components/ui/radio-group` when it isn't
 * installed). Barrel imports (`@/components/ui`) are not checked here — only the
 * concrete, verifiable subpath form. Returns unique offending names (sorted).
 */
export function validateUiImports(tsx: string, availableComponents: string[]): string[] {
  const allowed = new Set(availableComponents);
  const bad = new Set<string>();
  const re = /from\s+["']@\/components\/ui\/([^"'/]+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tsx)) !== null) {
    const name = m[1];
    if (!allowed.has(name)) bad.add(name);
  }
  return [...bad].sort();
}

/**
 * Build a targeted single-shot repair message: the generated file imports
 * components that aren't installed; rewrite it to use only installed components
 * (or plain HTML), preserving classes/structure otherwise. PrototypeAgent runs this.
 */
export function buildImportRepairMessage(
  tsx: string,
  invalidNames: string[],
  availableComponents: string[],
): string {
  return [
    `# Fix: this file fails to build — it imports components that are NOT installed.`,
    ``,
    `Not installed (remove these imports): ${invalidNames.join(", ")}`,
    `The ONLY installed \`@/components/ui\` components are: ${availableComponents.join(", ")}.`,
    ``,
    `## Rules`,
    `- Rewrite the file so it imports ONLY installed components from \`@/components/ui\`.`,
    `- Replace each removed component with the closest installed one, or a plain HTML`,
    `  element (\`<input type="radio">\`, \`<button>\`, \`<div>\`, …) that keeps the same`,
    `  markup role. PRESERVE all className values and the overall structure.`,
    `- Do not add new imports other than installed \`@/components/ui\` components.`,
    `- Output ONLY one fenced tsx code block — the complete corrected file, no prose.`,
    ``,
    `## File to fix`,
    "```tsx",
    tsx,
    "```",
  ].join("\n");
}
