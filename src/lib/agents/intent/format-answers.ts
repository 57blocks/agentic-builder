import { collectQuestions } from "./types";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
  IntentResult,
} from "./types";

/**
 * Render the user's answers to clarification questions as a self-contained
 * Markdown block to be prepended to the downstream agent's additionalContext.
 *
 * The block is phrased as "user-confirmed requirements" so the writing agent
 * treats it as binding, not as a suggestion.
 */
export function formatClarificationContext(
  result: IntentResult | undefined,
  answers: ClarificationAnswer[] | undefined,
  opts: { stage?: "prd" | "trd" } = {},
): string {
  if (!answers || answers.length === 0) return "";

  const stageLabel = opts.stage === "trd" ? "technical" : "product";
  const allQuestions: ClarificationQuestion[] = result
    ? collectQuestions(result)
    : [];
  const byId = new Map(allQuestions.map((q) => [q.id, q]));

  const lines: string[] = [
    `## User-confirmed ${stageLabel} clarifications`,
    "",
    `The user answered the following clarifying questions before generation.`,
    `Treat each answer as a FIXED requirement — do not contradict, soften, or omit them.`,
    "",
  ];

  for (const ans of answers) {
    const q = byId.get(ans.questionId);
    if (!q) {
      lines.push(`- \`${ans.questionId}\` → ${stringifyValue(ans.value)}`);
      continue;
    }
    const category = q.category ? `[${q.category}] ` : "";
    const valueLine = renderAnswer(q, ans);
    lines.push(`- ${category}**${q.question}**`);
    lines.push(`  → ${valueLine}`);
    if (ans.followUp && ans.followUp.trim()) {
      lines.push(`  → Detail: ${ans.followUp.trim()}`);
    }
  }

  return lines.join("\n");
}

function renderAnswer(
  q: ClarificationQuestion,
  ans: ClarificationAnswer,
): string {
  const lookup = new Map((q.options ?? []).map((o) => [o.value, o.label]));
  if (Array.isArray(ans.value)) {
    if (ans.value.length === 0) return "_(empty)_";
    return ans.value.map((v) => lookup.get(v) ?? v).join(", ");
  }
  const raw = String(ans.value ?? "").trim();
  if (!raw) return "_(empty)_";
  return lookup.get(raw) ?? raw;
}

function stringifyValue(v: ClarificationAnswer["value"]): string {
  if (Array.isArray(v)) return v.join(", ");
  return String(v ?? "");
}
