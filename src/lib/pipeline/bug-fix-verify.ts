import fs from "fs/promises";
import path from "path";
import { chatCompletionWithFallback } from "@/lib/openrouter";
import type { BugReport } from "./bug-fix-session";

export interface BugVerificationResult {
  verdict: "fixed" | "partial" | "not_fixed" | "uncertain";
  confidence: number;
  reasoning: string;
}

const VERIFY_MODEL_CHAIN = [
  "deepseek/deepseek-v4-flash",
  "openai/gpt-5.4-mini",
];

const MAX_LINES_PER_FILE = 150;

async function readFileSafe(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    if (lines.length <= MAX_LINES_PER_FILE) return content;
    return lines.slice(0, MAX_LINES_PER_FILE).join("\n") + `\n... (truncated, ${lines.length - MAX_LINES_PER_FILE} more lines)`;
  } catch {
    return "(file not readable)";
  }
}

export async function verifyBugFix(
  bug: BugReport,
  modifiedFiles: string[],
  outputDir: string,
): Promise<BugVerificationResult> {
  const fileSnippets = await Promise.all(
    modifiedFiles.slice(0, 5).map(async (f) => {
      const absPath = path.isAbsolute(f) ? f : path.join(outputDir, f);
      const content = await readFileSafe(absPath);
      return `### ${f}\n\`\`\`\n${content}\n\`\`\``;
    }),
  );

  const filesBlock = fileSnippets.length > 0
    ? fileSnippets.join("\n\n")
    : "(no files were written)";

  const prompt = `You are a senior software engineer doing a code review to verify whether a bug has been fixed.

Bug Title: ${bug.title}

Bug Description:
${bug.description}

Modified Files (after the fix):
${filesBlock}

Based on the bug description and the modified file contents, determine:
- "fixed": The code change clearly addresses the root cause described in the bug
- "partial": Some aspects are addressed but the fix appears incomplete or may miss edge cases
- "not_fixed": The changes do not appear to address the bug at all
- "uncertain": Cannot determine without running the code or seeing more context

Respond with ONLY valid JSON, no markdown:
{"verdict": "fixed", "confidence": 0.85, "reasoning": "One or two sentences explaining the verdict."}`;

  try {
    const response = await chatCompletionWithFallback(
      [{ role: "user", content: prompt }],
      VERIFY_MODEL_CHAIN,
      { temperature: 0, max_tokens: 256 },
    );

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]) as {
      verdict?: unknown;
      confidence?: unknown;
      reasoning?: unknown;
    };

    const VALID_VERDICTS = ["fixed", "partial", "not_fixed", "uncertain"] as const;
    const verdict = VALID_VERDICTS.includes(parsed.verdict as typeof VALID_VERDICTS[number])
      ? (parsed.verdict as BugVerificationResult["verdict"])
      : "uncertain";
    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;
    const reasoning = typeof parsed.reasoning === "string" && parsed.reasoning.trim()
      ? parsed.reasoning.trim()
      : "Could not determine fix status.";

    return { verdict, confidence, reasoning };
  } catch {
    return { verdict: "uncertain", confidence: 0, reasoning: "Verification call failed." };
  }
}
