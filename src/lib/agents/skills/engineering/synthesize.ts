import type { CodingAgentRole } from "@/lib/pipeline/types";
import type { EngineeringFrontmatter } from "./parse-source";

const MAX_BODY_CHARS = 6000;

/** Bare tokens too generic to be useful regex prefilters on their own. */
const STOPWORDS = new Set([
  "setup", "build", "add", "create", "use", "using", "the", "and", "for",
  "with", "app", "application", "project", "new", "page", "pages", "data",
  "set", "up", "skill",
]);

/** Bare scalars that YAML would coerce to a non-string (reserved words / pure numbers). */
const YAML_NONSTRING = /^(true|false|null|-?\d+(\.\d+)?)$/i;

/** Escape a literal phrase for safe embedding inside a regex `any_of` entry. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build the regex prefilter alternatives for a skill: the spaced name, each
 * significant (non-stopword, len>=3) name token, and each `when_to_use` phrase
 * verbatim (lowercased). Deduped. All entries are regex-escaped literals.
 */
export function synthesizeAnyOf(fm: {
  name: string;
  description?: string; // accepted for caller convenience (full frontmatter); not yet mined
  whenToUse: string[];
}): string[] {
  const out = new Set<string>();
  const spaced = fm.name.replace(/[-_]+/g, " ").toLowerCase();
  out.add(escapeRegex(spaced));
  for (const tok of spaced.split(/\s+/)) {
    if (tok.length >= 3 && !STOPWORDS.has(tok)) out.add(escapeRegex(tok));
  }
  for (const phrase of fm.whenToUse) {
    const cleaned = phrase.trim().replace(/[.;:]+$/, "").toLowerCase();
    if (cleaned.length >= 4) out.add(escapeRegex(cleaned));
  }
  return [...out];
}

/** Strip a leading H1 and truncate to MAX_BODY_CHARS at a paragraph break. */
export function trimBody(body: string): string {
  const stripped = body.replace(/^#\s+[^\n]+\n?/, "").trim();
  if (stripped.length <= MAX_BODY_CHARS) return stripped;
  const slice = stripped.slice(0, MAX_BODY_CHARS);
  const lastBreak = slice.lastIndexOf("\n\n");
  const cut = lastBreak > MAX_BODY_CHARS * 0.5 ? slice.slice(0, lastBreak) : slice;
  return `${cut.trim()}\n\n_…(truncated for prompt budget — full reference lives in the Engineering source)_`;
}

/**
 * Convert one parsed Engineering skill into a loader-format `.md` string.
 * The returned `id` is the skill name; the file must be written as
 * `.blueprint/skills/<role>/<id>.md` so `parseSkillFile`'s basename/agent
 * invariants hold.
 */
export function convertEngineeringSkill(
  fm: EngineeringFrontmatter,
  role: CodingAgentRole,
): { id: string; content: string } {
  const id = fm.name;
  const anyOf = synthesizeAnyOf(fm);
  const desc = fm.description ?? `${id} guidance`;
  const confirmPrompt =
    `Decide whether this project needs the "${id}" engineering skill. ` +
    `That skill applies when: ${desc} ` +
    `Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line.`;

  const yamlList = (items: string[]) =>
    items.map((p) => `      - ${YAML_NONSTRING.test(p) ? `"${p}"` : p}`).join("\n");

  const content = `---
id: ${id}
agent: ${role}
version: v1
description: ${JSON.stringify(desc)}
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
${yamlList(anyOf)}
  confirm:
    type: llm
    match: both
    prompt: ${JSON.stringify(confirmPrompt)}
---

${trimBody(fm.body)}
`;
  return { id, content };
}
