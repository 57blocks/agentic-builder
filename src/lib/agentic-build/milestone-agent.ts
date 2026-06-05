/**
 * Milestone agent — one autonomous coding turn for a single milestone.
 *
 * A non-interactive sibling of the code-chat agent loop (`agents/code-chat/
 * agent-loop.ts`): drive an LLM with bash / read_file / write_file / list_files
 * tools until it reports DONE or hits the step cap. The tool backend is a
 * `BuildExecutor`, so the very same loop runs locally or inside a container.
 *
 * It does NOT decide success — that is the acceptance runner's job. The agent
 * just builds; the orchestrator then runs the acceptance commands and, on
 * failure, calls the agent again with the failure feedback appended.
 *
 * `chatCompletionImpl` is injectable so the loop is unit-testable without an LLM.
 */

import {
  chatCompletion,
  resolveModel,
  estimateCost,
} from "@/lib/openrouter";
import type {
  ChatMessage,
  OpenRouterOptions,
  OpenRouterResponse,
  OpenRouterToolDefinition,
} from "@/lib/llm-types";
import { MODEL_CONFIG, primaryModel } from "@/lib/model-config";
import type { BuildExecutor } from "./executor";
import type { BuildPlan, Milestone } from "./types";

const TOOLS: OpenRouterToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "bash",
      description:
        "Run a shell command with cwd = workspace root. Use for scaffolding, " +
        "installing deps, running tests, git, etc. Returns 'exit_code: N' + output.",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a workspace-relative file. Returns its content or NOT_FOUND.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Create or overwrite a workspace-relative file with the given content " +
        "(parent dirs auto-created).",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "Recursively list files under a workspace-relative dir (default '.').",
      parameters: {
        type: "object",
        properties: { dir: { type: "string" } },
        required: [],
      },
    },
  },
];

const MAX_TOOL_OUTPUT = 4000;

function systemPrompt(plan: BuildPlan): string {
  return [
    `You are an autonomous software engineer working in a FRESH, initially-empty`,
    `workspace. There is NO scaffold — you create every file, choose the stack the`,
    `plan implies, install dependencies, and make the code actually run.`,
    ``,
    `Project: ${plan.projectName}`,
    plan.context ? `\nProject context & hard constraints:\n${plan.context}` : "",
    ``,
    `Rules:`,
    `- Use the tools to inspect and change the workspace. Do real work — do not`,
    `  just describe what you would do.`,
    `- Build ONLY what the current milestone asks. Do not jump ahead.`,
    `- Prefer extending files you already created in earlier milestones over`,
    `  rewriting them.`,
    `- You may run the milestone's checks yourself with bash to self-verify before`,
    `  finishing — an automated gate will run them again afterwards.`,
    `- When the milestone is complete and you believe its acceptance checks pass,`,
    `  reply with a final message that STARTS with "DONE" and a one-line summary.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function milestoneUserMessage(milestone: Milestone): string {
  const checks = milestone.acceptance
    .map((a, i) => `  ${i + 1}. ${a.label ? a.label + " — " : ""}\`${a.command}\``)
    .join("\n");
  return [
    `## Milestone ${milestone.id}: ${milestone.title}`,
    ``,
    milestone.instructions,
    ``,
    `### Acceptance checks that will gate this milestone (make them pass):`,
    checks || "  (none)",
  ].join("\n");
}

export interface RunMilestoneAgentInput {
  plan: BuildPlan;
  milestone: Milestone;
  executor: BuildExecutor;
  /** Conversation carried across attempts/milestones (mutated in place). */
  messages: ChatMessage[];
  /** Extra instruction for this attempt (e.g. acceptance failure feedback). */
  attemptInstruction?: string;
  model?: string;
  maxSteps?: number;
  chatCompletionImpl?: (
    messages: ChatMessage[],
    opts: OpenRouterOptions,
  ) => Promise<OpenRouterResponse>;
  onEvent?: (e: AgentEvent) => void;
}

export type AgentEvent =
  | { kind: "step"; step: number }
  | { kind: "tool"; name: string; arg: string }
  | { kind: "assistant"; text: string }
  | { kind: "done"; steps: number }
  | { kind: "cap"; steps: number };

export interface RunMilestoneAgentResult {
  filesTouched: string[];
  steps: number;
  costUsd: number;
  /** True when the agent signalled completion (vs hitting the step cap). */
  finished: boolean;
}

export async function runMilestoneAgent(
  input: RunMilestoneAgentInput,
): Promise<RunMilestoneAgentResult> {
  const {
    plan,
    milestone,
    executor,
    messages,
    attemptInstruction,
    onEvent,
  } = input;
  const complete = input.chatCompletionImpl ?? chatCompletion;
  const model = resolveModel(
    input.model ?? primaryModel(MODEL_CONFIG.agenticBuildCoder),
  );
  const maxSteps = input.maxSteps ?? 30;

  // Seed the conversation once (first attempt of the first milestone).
  if (messages.length === 0) {
    messages.push({ role: "system", content: systemPrompt(plan) });
  }
  messages.push({
    role: "user",
    content: attemptInstruction
      ? `${milestoneUserMessage(milestone)}\n\n---\n\n${attemptInstruction}`
      : milestoneUserMessage(milestone),
  });

  const filesTouched = new Set<string>();
  let costUsd = 0;
  let finished = false;
  let steps = 0;

  for (let step = 0; step < maxSteps; step++) {
    steps = step + 1;
    onEvent?.({ kind: "step", step: steps });

    const opts: OpenRouterOptions = {
      model,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.1,
      max_tokens: 8000,
    };
    const response = await complete(messages, opts);
    costUsd += estimateCost(response.model, response.usage);
    const msg = response.choices[0]?.message;
    const content = msg?.content ?? "";
    const toolCalls = msg?.tool_calls ?? [];

    messages.push({
      role: "assistant",
      content,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    });
    if (content) onEvent?.({ kind: "assistant", text: content });

    if (toolCalls.length === 0) {
      // No tools → the agent is reporting completion (or stuck narrating).
      if (/^\s*done\b/i.test(content) || step > 0) {
        finished = /^\s*done\b/i.test(content);
        onEvent?.({ kind: "done", steps });
        return { filesTouched: [...filesTouched], steps, costUsd, finished };
      }
      // First-turn narration with no action: nudge once.
      messages.push({
        role: "user",
        content:
          "You did not use any tool. Take action now with bash/read_file/write_file/list_files, or reply starting with DONE if the milestone is already complete.",
      });
      continue;
    }

    for (const call of toolCalls) {
      const result = await executeTool(call.function.name, call.function.arguments, executor, filesTouched);
      onEvent?.({
        kind: "tool",
        name: call.function.name,
        arg: summariseArg(call.function.name, call.function.arguments),
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  onEvent?.({ kind: "cap", steps });
  return { filesTouched: [...filesTouched], steps, costUsd, finished: false };
}

function summariseArg(name: string, rawArgs: string): string {
  try {
    const a = JSON.parse(rawArgs || "{}");
    if (name === "bash") return String(a.command ?? "").slice(0, 120);
    if (name === "read_file" || name === "write_file") return String(a.path ?? "");
    if (name === "list_files") return String(a.dir ?? ".");
  } catch {
    /* ignore */
  }
  return "";
}

async function executeTool(
  name: string,
  rawArgs: string,
  executor: BuildExecutor,
  filesTouched: Set<string>,
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch (err) {
    return `Error: tool arguments were not valid JSON: ${err instanceof Error ? err.message : String(err)}`;
  }
  switch (name) {
    case "bash": {
      const command = String(args.command ?? "").trim();
      if (!command) return "Error: empty command";
      const res = await executor.run(command);
      return `exit_code: ${res.exitCode}\n${res.output.slice(0, MAX_TOOL_OUTPUT)}`;
    }
    case "read_file": {
      const p = String(args.path ?? "");
      const content = await executor.readFile(p);
      if (content === null) return `NOT_FOUND: ${p}`;
      return content.slice(0, MAX_TOOL_OUTPUT);
    }
    case "write_file": {
      const p = String(args.path ?? "");
      try {
        await executor.writeFile(p, String(args.content ?? ""));
        filesTouched.add(p);
        return `OK: wrote ${p}`;
      } catch (err) {
        return `Error writing ${p}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case "list_files": {
      const dir = String(args.dir ?? ".");
      const files = await executor.listFiles(dir);
      return files.join("\n").slice(0, MAX_TOOL_OUTPUT);
    }
    default:
      return `Error: unknown tool '${name}'`;
  }
}
