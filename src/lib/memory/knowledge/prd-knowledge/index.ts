import type { MemoryRecord } from "@/lib/memory/types";
import type { PrdKnowledgeRecord } from "./types";

export * from "./types";
export { extractPrdKnowledge } from "./extract";

export function parsePrdKnowledgeBody(record: MemoryRecord): PrdKnowledgeRecord | null {
  try {
    const parsed = JSON.parse(record.body) as PrdKnowledgeRecord;
    if (parsed.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Condense a full PrdKnowledgeRecord into the slim inject body that goes into
 * the PRD generation prompt. Drops `fullPrd` and any sections not whitelisted.
 */
export function renderInjectBody(
  rec: PrdKnowledgeRecord,
  opts: { sections?: Array<keyof PrdKnowledgeRecord["sections"]> } = {},
): string {
  const sections = opts.sections ?? ["userStories", "metrics"];
  const lines: string[] = [
    `<case industry="${rec.industry}" product-type="${rec.productType}" tier="${rec.tier}">`,
    `  <title>${escapeXml(rec.title)}</title>`,
    `  <summary>${escapeXml(rec.summary)}</summary>`,
    `  <key-sections>`,
  ];
  for (const key of sections) {
    const value = rec.sections[key];
    if (!value) continue;
    const tag = camelToKebab(key);
    if (Array.isArray(value)) {
      lines.push(`    <${tag}>`);
      for (const item of value) lines.push(`      - ${escapeXml(item)}`);
      lines.push(`    </${tag}>`);
    } else {
      lines.push(`    <${tag}>${escapeXml(value)}</${tag}>`);
    }
  }
  lines.push(`  </key-sections>`, `</case>`);
  return lines.join("\n");
}

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
