/**
 * Bug Fix E2E Verifier
 *
 * Spins up a headless Chromium via @playwright/mcp, then runs an LLM agent
 * loop that navigates localhost:3000 and tries to reproduce + verify the bug.
 *
 * Called on-demand (not automatically) from the BugFixPanel "Run E2E Test" button.
 */

import {
  chatCompletion,
  type ChatMessage,
  type OpenRouterToolDefinition,
} from "@/lib/openrouter";
import { PlaywrightMcpClient } from "@/lib/playwright-mcp";
import { checkAppHealth } from "@/lib/pipeline/app-server-manager";
import type { BugReport } from "./bug-fix-session";
import type { BugVerificationResult } from "./bug-fix-verify";

const E2E_MODEL_CHAIN = ["deepseek/deepseek-v4-pro", "deepseek/deepseek-v4-flash"];
const MAX_TURNS = Number(process.env.E2E_MAX_TURNS ?? 50);

// ─── report_verdict tool — terminates the agent loop ─────────────────────────

const REPORT_VERDICT_TOOL: OpenRouterToolDefinition = {
  type: "function",
  function: {
    name: "report_verdict",
    description:
      "Call this when you have enough information to determine whether the bug is fixed. This ends the test session.",
    parameters: {
      type: "object",
      required: ["verdict", "confidence", "reasoning"],
      properties: {
        verdict: {
          type: "string",
          enum: ["fixed", "partial", "not_fixed", "uncertain"],
          description:
            '"fixed" = bug is no longer reproducible; "partial" = partially addressed; "not_fixed" = still reproducible; "uncertain" = could not determine',
        },
        confidence: {
          type: "number",
          description: "Confidence score 0.0–1.0",
        },
        reasoning: {
          type: "string",
          description: "1–2 sentences describing what you observed in the browser.",
        },
      },
    },
  },
};

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(bug: BugReport, baseUrl: string): string {
  const username = process.env.E2E_USERNAME ?? "";
  const password = process.env.E2E_PASSWORD ?? "";
  const loginUrl = process.env.E2E_LOGIN_URL ?? `${baseUrl}/login`;

  const authSection = [
    "## Authentication",
    `If the app redirects you to a login page (URL contains /login, /signin, /auth), log in first.`,
    `Login URL hint: ${loginUrl}`,
    "",
    "**Login strategy:**",
    "1. `browser_navigate` to the login URL.",
    "2. `browser_snapshot` to understand the login UI.",
    "3. Log in using whatever method is available on the page:",
    "   - If there are quick-login / demo / role buttons → click one.",
    "   - If there is a username+password form → fill it.",
    ...(username && password
      ? [`   - Credentials to use if a form is present — username: ${username}, password: ${password}`]
      : ["   - No credentials configured; if a form requires them, report verdict `uncertain` and suggest setting E2E_USERNAME / E2E_PASSWORD."]),
    "4. After login, navigate to the target page and test the bug.",
    "",
  ];

  return [
    "You are a QA engineer verifying whether a bug fix was successfully applied.",
    `The application is running at ${baseUrl}.`,
    "",
    ...authSection,
    "## Your job",
    "1. Log in if required (see Authentication section above).",
    "2. Navigate to the relevant page based on the bug description.",
    "3. Reproduce the exact scenario described in the bug (follow the Steps to Reproduce).",
    "4. Observe whether the bug still occurs or has been fixed.",
    "5. Call `report_verdict` with your findings.",
    "",
    "## Tool usage rules (STRICT — follow exactly)",
    "- `browser_snapshot`: call with empty args `{}`. NEVER pass `target`, `filename`, `depth`, or `boxes`.",
    "- `browser_click`: use `element` (description) + `target` (ref string from snapshot). If snapshot shows `[ref=e58]`, call `{\"element\": \"button name\", \"target\": \"e58\"}`. The `target` value is the ref string exactly as shown (e.g. \"e58\", \"e123\").",
    "- `browser_type`: use `element` + `target` + `text`. Example: `{\"element\": \"username input\", \"target\": \"e42\", \"text\": \"hello\"}`.",
    "- `browser_navigate`: always pass a full URL.",
    "- If a tool call returns an error, try ONE alternative approach. If that also fails, move on — do not retry more than twice.",
    "- After landing on the target page, take ONE snapshot, assess what you see, and call `report_verdict`. Do not keep drilling into specific elements.",
    "- Do NOT call `report_verdict` until you have navigated to the target page.",
    "- If the page does not load (connection refused), verdict is `uncertain`.",
    "",
    "## Bug Report",
    `**ID:** ${bug.id}`,
    `**Title:** ${bug.title}`,
    "",
    bug.description,
  ].join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function e2eVerifyBugFix(
  bug: BugReport,
  baseUrl = "http://localhost:5173",
  onProgress?: (event: E2eProgressEvent) => void,
): Promise<BugVerificationResult> {
  const pw = new PlaywrightMcpClient();

  try {
    onProgress?.({ type: "start", message: "Checking app health…" });
    const healthy = await checkAppHealth(baseUrl);
    if (!healthy) {
      return {
        verdict: "uncertain",
        confidence: 0,
        reasoning: `App is not running at ${baseUrl}. Please start the app before running E2E tests.`,
      };
    }
    onProgress?.({ type: "start", message: "Launching headless browser…" });
    await pw.connect();

    const tools: OpenRouterToolDefinition[] = [...pw.tools, REPORT_VERDICT_TOOL];
    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(bug, baseUrl) },
      {
        role: "user",
        content: `Please verify whether bug "${bug.title}" is fixed. Start by navigating to the relevant page.`,
      },
    ];

    let verdict: BugVerificationResult | null = null;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await chatCompletion(messages, {
        model: E2E_MODEL_CHAIN[0],
        temperature: 0,
        max_tokens: 1024,
        tools,
        tool_choice: "required",
      });

      const choice = response.choices[0];
      const assistantMsg = choice.message;

      messages.push({
        role: "assistant",
        content: assistantMsg.content ?? null,
        tool_calls: assistantMsg.tool_calls,
      } as ChatMessage);

      const toolCalls = assistantMsg.tool_calls ?? [];
      if (toolCalls.length === 0) break;

      const toolResults: ChatMessage[] = [];
      let verdictFound = false;

      for (const call of toolCalls) {
        const { name, arguments: argsStr } = call.function;
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(argsStr) as Record<string, unknown>; } catch { /* ignore */ }

        if (name === "report_verdict") {
          verdict = {
            verdict: args.verdict as BugVerificationResult["verdict"] ?? "uncertain",
            confidence: typeof args.confidence === "number" ? Math.max(0, Math.min(1, args.confidence)) : 0.5,
            reasoning: typeof args.reasoning === "string" ? args.reasoning : "No reasoning provided.",
          };
          onProgress?.({ type: "verdict", verdict });
          toolResults.push({ role: "tool", tool_call_id: call.id, content: "Verdict recorded." } as ChatMessage);
          verdictFound = true;
          break;
        }

        onProgress?.({ type: "tool_call", toolName: name, args });

        const result = await pw.callTool(name, args);
        const truncated = result.text.length > 3000
          ? result.text.slice(0, 3000) + "\n[truncated]"
          : result.text;

        onProgress?.({ type: "tool_result", toolName: name, ok: !result.isError, text: truncated });

        const content = result.isError && (name === "browser_click" || name === "browser_type")
          ? `${truncated}\n\nHINT: For ${name}, "target" must be the ref string from the snapshot (e.g. if snapshot shows [ref=e58], use {"element": "description", "target": "e58"}). Never pass a number or JSON object.`
          : truncated;

        toolResults.push({ role: "tool", tool_call_id: call.id, content } as ChatMessage);
      }

      messages.push(...toolResults);
      if (verdictFound) break;
    }

    return verdict ?? {
      verdict: "uncertain",
      confidence: 0,
      reasoning: "Agent did not report a verdict within the allowed turns.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onProgress?.({ type: "error", message: msg });
    return { verdict: "uncertain", confidence: 0, reasoning: `E2E test error: ${msg}` };
  } finally {
    await pw.disconnect();
    onProgress?.({ type: "done" });
  }
}

// ─── Progress event types ─────────────────────────────────────────────────────

export type E2eProgressEvent =
  | { type: "start"; message: string }
  | { type: "tool_call"; toolName: string; args: Record<string, unknown> }
  | { type: "tool_result"; toolName: string; ok: boolean; text: string }
  | { type: "verdict"; verdict: BugVerificationResult }
  | { type: "error"; message: string }
  | { type: "done" };
