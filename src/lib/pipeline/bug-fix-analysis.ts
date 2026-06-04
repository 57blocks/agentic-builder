import { chatCompletionWithFallback } from "@/lib/openrouter";
import type { BugReport } from "./bug-fix-session";

export interface BugAnalysisResult {
  /** Relative file paths most likely involved in the bug. Max 5. */
  likelyFiles: string[];
  role: "frontend" | "backend";
  /** Estimated minutes to fix this bug. */
  estimatedMinutes: number;
  /** Estimated LLM cost in USD to fix this bug. */
  estimatedCostUsd: number;
}

const ANALYSIS_MODEL_CHAIN = [
  "deepseek/deepseek-v4-flash",
  "openai/gpt-5.4-mini",
];

export async function analyzeBugReport(
  bug: BugReport,
  fileList: string[],
): Promise<BugAnalysisResult> {
  const fileTree = fileList.slice(0, 300).join("\n");

  const prompt = `You are a software engineer triaging a bug report. Given the bug description and the project file tree, identify:
1. Up to 5 files most likely involved in this bug (relative paths, exact match from the tree)
2. Whether this is a frontend or backend bug
3. Estimated minutes to fix (consider scope of change: simple typo/config = 2, single function fix = 4, multi-file logic = 8, complex state/flow = 15)
4. Estimated LLM cost in USD (simple = 0.04, medium = 0.10, complex = 0.20)

Respond with ONLY valid JSON, no markdown:
{"likelyFiles": ["path/to/file.ts"], "role": "frontend", "estimatedMinutes": 4, "estimatedCostUsd": 0.10}

Bug Title: ${bug.title}

${bug.description}

Project files:
${fileTree}`;

  const response = await chatCompletionWithFallback(
    [{ role: "user", content: prompt }],
    ANALYSIS_MODEL_CHAIN,
    { temperature: 0, max_tokens: 256 },
  );

  const raw = response.choices[0]?.message?.content ?? "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]) as {
      likelyFiles?: unknown;
      role?: unknown;
      estimatedMinutes?: unknown;
      estimatedCostUsd?: unknown;
    };
    const likelyFiles = Array.isArray(parsed.likelyFiles)
      ? (parsed.likelyFiles as unknown[])
          .filter((f): f is string => typeof f === "string")
          .slice(0, 5)
      : [];
    const role =
      parsed.role === "frontend" || parsed.role === "backend"
        ? parsed.role
        : "backend";
    const estimatedMinutes = typeof parsed.estimatedMinutes === "number" && parsed.estimatedMinutes > 0
      ? parsed.estimatedMinutes : 4;
    const estimatedCostUsd = typeof parsed.estimatedCostUsd === "number" && parsed.estimatedCostUsd > 0
      ? parsed.estimatedCostUsd : 0.10;
    return { likelyFiles, role, estimatedMinutes, estimatedCostUsd };
  } catch {
    return { likelyFiles: [], role: "backend", estimatedMinutes: 4, estimatedCostUsd: 0.10 };
  }
}
