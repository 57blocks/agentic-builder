/**
 * Per-task context logger for frontend coding tasks.
 *
 * For every frontend worker task, dump the FULL context that was assembled
 * for the LLM call into:
 *
 *   <repoRoot>/.logs/fe/<taskSlug>__<runStamp>__attempt<N>/
 *     messages.json         — full ChatMessage[] (image_url replaced with a
 *                             pointer to image.* in the same folder, so the
 *                             json stays readable)
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

const LOG_ROOT_REL = path.join(".logs", "fe");

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

export interface FrontendContextLogInput {
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

export async function logFrontendTaskContext(
  input: FrontendContextLogInput,
): Promise<string | null> {
  try {
    const taskSlug = `${sanitizeForPath(input.task.id, 20)}__${sanitizeForPath(input.task.title, 60)}`;
    const folderName = `${taskSlug}__${nowStamp()}__attempt${input.attempt}`;
    const dir = path.resolve(process.cwd(), LOG_ROOT_REL, folderName);
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

    // 3) projectContext as a standalone markdown file
    await fs.writeFile(
      path.join(dir, "project-context.md"),
      input.projectContext ?? "",
      "utf-8",
    );

    // 4) task snapshot
    await fs.writeFile(
      path.join(dir, "task.json"),
      JSON.stringify(input.task, null, 2),
      "utf-8",
    );

    // 5) memory recall block (only when present)
    if (input.memoryRecallBlock && input.memoryRecallBlock.trim()) {
      await fs.writeFile(
        path.join(dir, "memory-recall.txt"),
        input.memoryRecallBlock,
        "utf-8",
      );
    }

    // 6) summary metadata
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

    console.log(`[FrontendContextLog] Wrote ${dir}`);
    return dir;
  } catch (err) {
    console.warn(
      `[FrontendContextLog] Failed to write frontend context log:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
