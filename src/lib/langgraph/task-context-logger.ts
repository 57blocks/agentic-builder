/**
 * Per-task context logger for all coding roles.
 *
 * For every worker task, dump the FULL context that was assembled
 * for the LLM call into:
 *
 *   <repoRoot>/.logs/coding/<role>/<taskSlug>__<runStamp>__attempt<N>/
 *     messages.json         — full ChatMessage[] (image_url replaced with a
 *                             pointer to image.* in the same folder, so the
 *                             json stays readable)
 *     prompt.md             — human-readable form: system + user messages,
 *                             memory recall, vision image references
 *     image.<ext>           — copy of the vision image injected (if any)
 *     project-context.md    — the projectContext system block as plain text
 *     task.json             — the task object (id/title/description/files/…)
 *     memory-recall.txt     — memory-recall block (only when injected)
 *     summary.json          — { role, workerLabel, model, hasVisionImage,
 *                               matchedRefId, charCounts, timestamps, … }
 *
 * Fire-and-forget: any failure here MUST NOT break the worker. The logger
 * catches all I/O errors and downgrades to console.warn.
 */
import path from "node:path";
import fs from "node:fs/promises";

import type { ChatMessage } from "@/lib/openrouter";
import type { AppliedSkillRef } from "./coding-skills";

const LOG_ROOT_REL = path.join(".logs", "coding");

function sanitizeForPath(s: string, max = 80): string {
  return (
    s
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max) || "untitled"
  );
}

function nowStamp(): string {
  // 2026-06-15T12-34-56-789Z
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export interface TaskContextLogInput {
  sessionId: string;
  task: {
    id: string;
    title: string;
    description?: string;
    files?: unknown;
    coversRequirementIds?: string[];
    subSteps?: unknown;
    tddPlan?: unknown;
  };
  workerLabel: string;
  role: string;
  attempt: number;
  /** Final ChatMessage[] handed to the LLM. */
  messages: ChatMessage[];
  /** Original projectContext string (extracted out of state for convenience). */
  projectContext: string;
  /** Memory-recall block, when one was injected. */
  memoryRecallBlock?: string;
  /** Vision-image bytes + mime, when a design reference was injected. */
  visionImage?: {
    bytes: Buffer;
    mime: string;
    /** Reference id from manifest, for traceability. */
    referenceId: string;
    /** Original filename in `.design-references/`. */
    storedFileName: string;
    pageHint: string;
  };
  /** Model id resolved for this call. */
  model?: string;
  /** Extra free-form fields stuffed into summary.json. */
  extras?: Record<string, unknown>;
}

/**
 * Strip the heavy base64 payload out of any VisionChatMessage in `messages`
 * before serializing — leave a pointer to `image.<ext>` in the dump folder
 * so the json file stays small and readable. Original messages array is not
 * mutated.
 */
function redactMessagesForDisk(
  messages: ChatMessage[],
  imageFilenameInFolder: string | null,
): unknown[] {
  return messages.map((m) => {
    if (
      typeof m === "object" &&
      m !== null &&
      "content" in m &&
      Array.isArray((m as unknown as { content: unknown[] }).content)
    ) {
      return {
        ...m,
        content: (m as unknown as { content: unknown[] }).content.map((part) => {
          if (
            part &&
            typeof part === "object" &&
            (part as { type?: string }).type === "image_url"
          ) {
            return {
              type: "image_url",
              image_url: {
                url: imageFilenameInFolder
                  ? `@${imageFilenameInFolder}`
                  : "<image redacted: data url removed>",
                detail:
                  (part as { image_url?: { detail?: string } }).image_url
                    ?.detail ?? "high",
              },
            };
          }
          return part;
        }),
      };
    }
    return m;
  });
}

function extImageMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  return "bin";
}

function renderPromptMarkdown(input: TaskContextLogInput, imageFilename: string | null): string {
  const lines: string[] = [];
  lines.push(`# ${input.task.id} · ${input.task.title}`);
  lines.push("");
  lines.push(`- Role: \`${input.role}\``);
  lines.push(`- Worker: ${input.workerLabel}`);
  lines.push(`- Attempt: ${input.attempt}`);
  lines.push(`- Model: ${input.model ?? "(unspecified)"}`);
  lines.push(`- Captured: ${new Date().toISOString()}`);
  lines.push(`- Session: \`${input.sessionId}\``);
  if (input.visionImage) {
    lines.push(`- Vision image: \`${input.visionImage.referenceId}\` (\`${input.visionImage.storedFileName}\`, ${input.visionImage.bytes.byteLength.toLocaleString()} bytes)`);
  } else {
    lines.push(`- Vision image: none`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Walk messages in order, render each one as a section.
  let sysCounter = 0;
  let userCounter = 0;
  let asstCounter = 0;
  for (const m of input.messages) {
    const msg = m as { role: string; content: unknown };
    if (msg.role === "system") {
      sysCounter += 1;
      lines.push(`## System message #${sysCounter}`);
    } else if (msg.role === "user") {
      userCounter += 1;
      lines.push(`## User message${userCounter > 1 ? ` #${userCounter}` : ""}`);
    } else if (msg.role === "assistant") {
      asstCounter += 1;
      lines.push(`## Assistant message #${asstCounter}`);
    } else {
      lines.push(`## ${msg.role} message`);
    }
    lines.push("");
    // Content can be string OR array of parts (vision messages).
    if (typeof msg.content === "string") {
      lines.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part && typeof part === "object") {
          const p = part as { type?: string; text?: string; image_url?: { detail?: string } };
          if (p.type === "text" && typeof p.text === "string") {
            lines.push(p.text);
          } else if (p.type === "image_url") {
            lines.push("");
            lines.push(
              imageFilename
                ? `*(Vision image attached: \`./${imageFilename}\`, detail=${p.image_url?.detail ?? "high"})*`
                : "*(Vision image attached — base64 data url omitted)*",
            );
          }
        }
      }
    }
    lines.push("");
  }

  if (input.memoryRecallBlock && input.memoryRecallBlock.trim()) {
    lines.push("---");
    lines.push("");
    lines.push("## Memory recall (injected into the system block above)");
    lines.push("");
    lines.push(input.memoryRecallBlock);
    lines.push("");
  }

  return lines.join("\n");
}

export async function logTaskContext(
  input: TaskContextLogInput,
): Promise<string | null> {
  try {
    const taskSlug = `${sanitizeForPath(input.task.id, 20)}__${sanitizeForPath(input.task.title, 60)}`;
    const folderName = `${taskSlug}__${nowStamp()}__attempt${input.attempt}`;
    const dir = path.resolve(process.cwd(), LOG_ROOT_REL, input.role, folderName);
    await fs.mkdir(dir, { recursive: true });

    // 1) Image (if injected)
    let imageFilename: string | null = null;
    if (input.visionImage) {
      const ext = extImageMime(input.visionImage.mime);
      imageFilename = `image.${ext}`;
      await fs.writeFile(
        path.join(dir, imageFilename),
        input.visionImage.bytes,
      );
    }

    // 2) Messages dump with image_url redacted to a relative pointer
    const redacted = redactMessagesForDisk(input.messages, imageFilename);
    await fs.writeFile(
      path.join(dir, "messages.json"),
      JSON.stringify(redacted, null, 2),
      "utf-8",
    );

    // 3) Human-readable prompt.md — same content as messages.json but flat
    //    Markdown so you can just open it. Vision image references point at
    //    the sibling image.<ext> file.
    await fs.writeFile(
      path.join(dir, "prompt.md"),
      renderPromptMarkdown(input, imageFilename),
      "utf-8",
    );

    // 4) projectContext as a standalone markdown file
    await fs.writeFile(
      path.join(dir, "project-context.md"),
      input.projectContext ?? "",
      "utf-8",
    );

    // 5) task snapshot
    await fs.writeFile(
      path.join(dir, "task.json"),
      JSON.stringify(input.task, null, 2),
      "utf-8",
    );

    // 6) memory recall block (only when present)
    if (input.memoryRecallBlock && input.memoryRecallBlock.trim()) {
      await fs.writeFile(
        path.join(dir, "memory-recall.txt"),
        input.memoryRecallBlock,
        "utf-8",
      );
    }

    // 7) summary metadata
    const summary = {
      timestamp: new Date().toISOString(),
      role: input.role,
      workerLabel: input.workerLabel,
      attempt: input.attempt,
      sessionId: input.sessionId,
      taskId: input.task.id,
      taskTitle: input.task.title,
      model: input.model ?? null,
      hasVisionImage: !!input.visionImage,
      visionRef: input.visionImage
        ? {
            referenceId: input.visionImage.referenceId,
            storedFileName: input.visionImage.storedFileName,
            pageHint: input.visionImage.pageHint,
            mime: input.visionImage.mime,
            bytes: input.visionImage.bytes.byteLength,
            localFile: imageFilename,
          }
        : null,
      messageCount: input.messages.length,
      projectContextChars: (input.projectContext ?? "").length,
      memoryRecallChars: (input.memoryRecallBlock ?? "").length,
      ...input.extras,
    };
    await fs.writeFile(
      path.join(dir, "summary.json"),
      JSON.stringify(summary, null, 2),
      "utf-8",
    );

    console.log(`[TaskContextLog] Wrote ${dir}`);
    return dir;
  } catch (err) {
    console.warn(
      `[TaskContextLog] Failed to write task context log:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export interface TaskUsageRecord {
  timestamp: string;
  sessionId: string;
  taskId: string;
  role: string;
  attempt: number;
  model: string;
  /** Whether Mechanism B (Engineering skill injection) was enabled this run. */
  engineeringSkillsEnabled: boolean;
  /** Engineering skills (Mechanism B) that matched; [] when disabled or none. */
  appliedSkills: AppliedSkillRef[];
  inputTokens: number;   // = promptTokens
  outputTokens: number;  // = completionTokens
  totalTokens: number;
  costUsd: number;
  llmCalls: number;
}

/**
 * Write a self-contained `usage.json` into an existing per-task log folder
 * (the dir returned by logTaskContext). Fire-and-forget: catches all I/O
 * errors and downgrades to console.warn, never throwing into the worker.
 */
export async function writeTaskUsage(
  taskLogDir: string,
  record: TaskUsageRecord,
): Promise<void> {
  try {
    await fs.writeFile(
      path.join(taskLogDir, "usage.json"),
      JSON.stringify(record, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.warn(
      `[TaskContextLog] Failed to write usage.json:`,
      err instanceof Error ? err.message : err,
    );
  }
}
