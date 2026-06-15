import { NextRequest } from "next/server";
import {
  streamChatCompletion,
  resolveModel,
  openRouterVisionChatCompletion,
} from "@/lib/openrouter";
import type { VisionContentPart, VisionChatMessage } from "@/lib/llm-types";
import { MODEL_CONFIG } from "@/lib/model-config";
import { classifyProject } from "@/lib/agents/shared/project-classifier";
import { PRD_DIMENSIONS } from "@/lib/agents/intent/gap-checklist";
import { loadReferenceImagesAsDataUrls } from "@/lib/pipeline/design-references";
import { fallbackIntentForm } from "./intent-fallback";

// Generous timeout — 10-dim + per-concept prompt + json_object on a stream
// can take longer than the default 30s, especially when many concepts are
// drilled into. Setting this avoids the route being killed mid-response.
export const maxDuration = 180;

/**
 * POST /api/agents/intent-recheck
 *
 * Lightweight re-run of intent analysis after the user has submitted answers.
 * Accumulates the full conversation (original brief + all Q&A rounds) and
 * checks whether any of the 5 required items are still missing or ambiguous.
 *
 * Returns the same JSON shape as the initial intent analysis:
 * { project_name, summary, gathered, questions }
 */

function buildSystemPrompt(): string {
  const dimList = PRD_DIMENSIONS.map(
    (d, i) =>
      `  ${String.fromCharCode(65 + i)}. ${d.id} — ${d.title}. ${d.llmHint}`,
  ).join("\n");

  const dimIds = PRD_DIMENSIONS.map((d) => `"${d.id}"`).join(" | ");

  return `You are a senior product analyst in a clarification loop. The loop MUST converge — never let it run forever. Your output controls whether the user keeps answering or moves on to PRD generation.

## Required cross-cutting dimensions (Pass A — must be answered)

${dimList}

## Your task — strict convergence rules

You will receive the original project brief and the full Q&A conversation so far. Count completed rounds = number of [USER] turns in the conversation (0 on first call, increases by 1 each subsequent call).

### PASS A — Coverage (priority 1)
Re-evaluate ALL ${PRD_DIMENSIONS.length} dimensions. For each, decide KNOWN or MISSING/AMBIGUOUS based on the entire conversation so far. Emit at most ONE question per dimension that is still MISSING.

### PASS B — Per-concept drill-down (priority 2, BUDGETED)
On rounds 0 and 1 ONLY, identify named atomic concepts in the brief (variables like "MC-1" / "RQ-3", entities, roles, named vendors, specific KPIs). For each, check whether PROVENANCE / CREDENTIAL / CADENCE is specified. Emit specific questions for the 3-5 most blocking concepts only.

### Convergence rules (ENFORCE STRICTLY)
- Total questions per round: **≤ 8**. If you have more candidate questions than 8, drop the least consequential. Pass A always wins over Pass B.
- After round 2 (i.e. when conversation has ≥ 2 user turns) you MUST stop emitting Pass B questions. Only Pass A items still genuinely MISSING can appear.
- After round 3 (≥ 3 user turns) set \`all_clear: true\` regardless of remaining gaps. The user will refine in PRD review.
- If Pass A has no MISSING items AND you're already at round ≥ 1, set \`all_clear: true\` even if Pass B drill-downs remain — those are optional.

## Question style

- Use the SAME DOMAIN WORDS as the brief ("stablecoin" not "asset"; "RQ-1" if mentioned).
- type "radio" → one answer | "checkbox" → multiple | "text" → free-form.
- For provenance: radio with ["Public API (no key)", "Third-party API (needs key)", "Manual operator entry", "Scraped / parsed from document", "Computed from other variables", "Not yet decided"].
- For credentials: radio with ["Yes — we already have a key", "Yes — customer must supply", "No — public endpoint", "Not yet decided"].
- For cadence: radio with ["Real-time / streaming", "Every minute", "Hourly", "Daily", "On-demand only"].

## Output (STRICT JSON — no markdown, no prose)

{
  "project_name": "Short, memorable product name (2–5 words, title case)",
  "all_clear": true | false,
  "summary": "1 sentence describing what is now understood.",
  "gathered": [
    "users-and-roles: confirmed — internal team",
    "..."
  ],
  "questions": [
    {
      "id": ${dimIds} | "concept:<short-slug>",
      "type": "radio" | "checkbox" | "text",
      "label": "Concise question",
      "options": ["..."]
    }
  ]
}

Hard rules:
- Pass A ids MUST match dimension ids verbatim. Pass B ids MUST start with "concept:".
- "options" must be omitted when type is "text".
- Output ONLY the JSON object — no markdown fences, no commentary.`;
}

const INTENT_RECHECK_SYSTEM_PROMPT = buildSystemPrompt();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      brief?: string;
      conversationHistory?: { role: "user" | "assistant"; content: string }[];
      projectId?: string;
    };

    const brief = (body.brief ?? "").trim();
    const conversationHistory = body.conversationHistory ?? [];
    const projectId = (body.projectId ?? "").trim() || undefined;

    if (!brief) {
      return new Response(JSON.stringify({ error: "brief is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build the user-turn content.
    const userTurnParts: string[] = [];
    userTurnParts.push(`Original project brief:\n${brief}`);
    if (conversationHistory.length > 0) {
      userTurnParts.push(
        `\nClarification conversation so far:\n${conversationHistory
          .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
          .join("\n\n")}`,
      );
    } else {
      userTurnParts.push("(No answers yet — this is the initial check)");
    }

    // ── Vision pre-step ──
    // Derive functional requirements from this project's uploaded reference
    // screenshots and fold them into the brief as confirmed input, so the
    // text clarification engine below incorporates them. Best-effort: a vision
    // failure (or no images) simply falls back to the text-only flow.
    try {
      const images = await loadReferenceImagesAsDataUrls(process.cwd(), projectId);
      if (images.length > 0) {
        const parts: VisionContentPart[] = [
          {
            type: "text",
            text: `These are ${images.length} reference screenshot(s) of the target UI. List the FUNCTIONAL requirements they reveal — screens/pages, components, fields, actions/buttons, visible states, and flows implied by navigation between screens. Only describe what is visibly present; do NOT invent. Output concise plain-text bullet points.`,
          },
        ];
        for (const img of images) {
          if (img.label) parts.push({ type: "text", text: `Screenshot: ${img.label}` });
          parts.push({ type: "image_url", image_url: { url: img.dataUrl, detail: "high" } });
        }
        const visionMessages: VisionChatMessage[] = [
          { role: "system", content: "You are a precise UI analyst extracting functional requirements from screenshots." },
          { role: "user", content: parts },
        ];
        const visionResp = await openRouterVisionChatCompletion(visionMessages, {
          model: resolveModel(MODEL_CONFIG.design),
          temperature: 0.2,
          max_tokens: 2048,
        });
        const visionText = visionResp.choices[0]?.message?.content?.trim() ?? "";
        if (visionText) {
          userTurnParts.push(
            `\nFunctional requirements extracted from ${images.length} uploaded reference screenshot(s) — treat as confirmed product input:\n${visionText}`,
          );
          console.log(`[intent-recheck] vision pre-step folded ${images.length} screenshot(s) into the brief.`);
        }
      }
    } catch (err) {
      console.warn(
        `[intent-recheck] vision pre-step failed (continuing text-only): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: INTENT_RECHECK_SYSTEM_PROMPT },
      { role: "user", content: userTurnParts.join("\n\n") },
    ];

    const model = resolveModel(MODEL_CONFIG.intent);
    const encoder = new TextEncoder();

    // Emit pipeline-style SSE events so the client can reuse the same
    // handleEvent / streaming-display logic as the main pipeline.
    function send(event: Record<string, unknown>): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    }

    function sendFallback(
      controller: ReadableStreamDefaultController<Uint8Array>,
      reason: string,
    ) {
      const fallback = fallbackIntentForm(brief, reason);
      controller.enqueue(
        send({
          type: "step_stream",
          stepId: "intent",
          data: { chunk: fallback.summary, chunkType: "content" },
        }),
      );
      controller.enqueue(
        send({
          type: "step_complete",
          stepId: "intent",
          data: {
            stepId: "intent",
            status: "completed",
            content: JSON.stringify(fallback),
            timestamp: new Date().toISOString(),
            metadata: { fallback: true, reason },
          },
        }),
      );
    }

    const readable = new ReadableStream({
      async start(controller) {
        // ── step_start ──
        controller.enqueue(send({ type: "step_start", stepId: "intent", data: { status: "running" } }));

        let llmStream: ReadableStream<Uint8Array>;
        try {
          llmStream = await streamChatCompletion(messages, {
            model,
            temperature: 0.2,
            // 10 dimensions + up to 15 questions/round with rationale &
            // options needs more headroom than the legacy 6-item prompt.
            max_tokens: 8192,
            response_format: { type: "json_object" },
          });
        } catch (err) {
          sendFallback(
            controller,
            err instanceof Error ? `llm_error: ${err.message}` : "llm_error",
          );
          controller.close();
          return;
        }

        const reader = llmStream.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let lineBuffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            lineBuffer += decoder.decode(value, { stream: true });
            const parts = lineBuffer.split("\n");
            lineBuffer = parts.pop() ?? "";
            for (const line of parts) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload) as {
                  choices?: { delta?: { content?: string } }[];
                };
                const token = parsed.choices?.[0]?.delta?.content ?? "";
                if (token) accumulated += token;
              } catch {
                // ignore malformed upstream SSE lines
              }
            }
          }

          // ── step_complete — parse accumulated JSON and stream summary word-by-word ──
          const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]) as {
                summary?: string;
                project_name?: string;
                all_clear?: boolean;
                gathered?: string[];
                questions?: unknown[];
              };
              // Stream the summary text word by word so the client shows a typing effect
              if (parsed.summary) {
                const words = parsed.summary.split(" ");
                for (let i = 0; i < words.length; i++) {
                  const chunk = (i === 0 ? "" : " ") + words[i];
                  controller.enqueue(send({
                    type: "step_stream",
                    stepId: "intent",
                    data: { chunk, chunkType: "content" },
                  }));
                }
              }

              // When intent is all_clear, classify the project tier so the store
              // can filter UI tabs (TRD, QA) before startPipeline is called.
              let classificationMeta: Record<string, unknown> | undefined;
              if (parsed.all_clear) {
                try {
                  const classification = await classifyProject(brief);
                  classificationMeta = {
                    tier: classification.tier,
                    type: classification.type,
                    needsBackend: classification.needsBackend,
                    needsDatabase: classification.needsDatabase,
                    reasoning: classification.reasoning,
                  };
                } catch {
                  // Non-fatal — startPipeline will classify again
                }
              }

              controller.enqueue(send({
                type: "step_complete",
                stepId: "intent",
                data: {
                  stepId: "intent",
                  status: "completed",
                  content: JSON.stringify(parsed),
                  timestamp: new Date().toISOString(),
                  ...(classificationMeta ? { metadata: { classification: classificationMeta } } : {}),
                },
              }));
            } catch {
              sendFallback(controller, "parse_error: Failed to parse intent JSON");
            }
          } else {
            sendFallback(controller, "parse_error: No JSON found in model response");
          }
        } catch (err) {
          sendFallback(
            controller,
            err instanceof Error ? `stream_error: ${err.message}` : "stream_error",
          );
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
