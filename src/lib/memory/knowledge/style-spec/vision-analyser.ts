/**
 * Image → Style Spec analyser.
 *
 * Given an image (data: URL or http URL), call a vision-capable LLM and parse
 * the response into a structured {@link StyleSpec}. The result is consumed
 * downstream by `compose-style-spec-body.ts` to produce the dual-format
 * record body persisted as `design-knowledge`.
 */

import { openRouterVisionChatCompletion, resolveModel } from "@/lib/openrouter";
import type { VisionChatMessage } from "@/lib/llm-types";

import type {
  StyleSpec,
  StyleSpecIndustry,
} from "./types";

const ALLOWED_INDUSTRIES: ReadonlyArray<StyleSpecIndustry> = [
  "ai",
  "fintech-web3",
  "saas",
  "generic",
];

/** Default vision model — chosen for strong colour/typography reasoning. */
const DEFAULT_VISION_MODEL = "openai/gpt-5.4";

const SYSTEM_PROMPT = `You are a senior product designer analysing a UI / web design reference image.
Extract a STRUCTURED Style Spec describing the design tokens, typography and components visible in the screenshot.
Respond with ONE single JSON object — no prose, no markdown fences, no commentary.

REQUIRED SHAPE (camelCase, all keys present unless marked optional):
{
  "industry": "ai" | "fintech-web3" | "saas" | "generic",
  "summary": "1-2 sentence description of the overall aesthetic",
  "vibe": ["minimal", "dark", "futuristic", ...],         // 3-6 short adjectives
  "palette": {
    "primary":    { "hex": "#rrggbb", "label": "..." },
    "secondary":  { "hex": "#rrggbb", "label": "..." },   // optional
    "accent":     { "hex": "#rrggbb", "label": "..." },   // optional
    "background": { "hex": "#rrggbb", "label": "..." },
    "surface":    { "hex": "#rrggbb", "label": "..." },
    "text":       { "hex": "#rrggbb", "label": "..." },
    "textMuted":  { "hex": "#rrggbb", "label": "..." },   // optional
    "border":     { "hex": "#rrggbb", "label": "..." },   // optional
    "success":    { "hex": "#rrggbb", "label": "..." },   // optional
    "warning":    { "hex": "#rrggbb", "label": "..." },   // optional
    "danger":     { "hex": "#rrggbb", "label": "..." }    // optional
  },
  "typography": {
    "headingFont":   "Inter",
    "bodyFont":      "Inter",
    "monoFont":      "JetBrains Mono",                    // optional
    "headingWeight": 600,
    "bodyWeight":    400,
    "baseSizePx":    16,
    "notes":         ["large hero headings", "tabular nums"]  // optional
  },
  "spacing": { "basePx": 8, "scalePx": [4, 8, 12, 16, 24, 32, 48, 64] },
  "radius":  { "smPx": 4, "mdPx": 8, "lgPx": 16, "pillPx": 999 },
  "shadows": ["0 1px 2px rgba(0,0,0,0.05)", "0 8px 24px rgba(0,0,0,0.12)"],  // optional
  "components": {
    "button":     { "description": "..." },
    "card":       { "description": "..." },               // optional
    "input":      { "description": "..." },               // optional
    "table":      { "description": "..." },               // optional
    "navigation": { "description": "..." }                // optional
  },
  "layout": "fixed left sidebar + hero + KPI grid + alert feed",
  "visualElements": [
    { "name": "hero headline",     "col": 2, "row": 1, "zoom": 2.5 },
    { "name": "navigation bar",    "col": 2, "row": 1, "zoom": 3   },
    { "name": "primary CTA button","col": 2, "row": 2, "zoom": 4   },
    { "name": "card component",    "col": 3, "row": 2, "zoom": 3   },
    { "name": "colour accent",     "col": 1, "row": 3, "zoom": 3.5 }
  ]
}

GUIDELINES:
- All hex values must be lowercase 6-digit hex (#rrggbb), no shorthand.
- Always include "industry"; choose the closest bucket from the four allowed.
- "vibe" must be 3-6 short adjectives.
- Sample colours from large surfaces (backgrounds, panels) and from visible accents (buttons, charts).
- "visualElements": Identify 4-6 distinct UI elements you can see in the screenshot. For each, provide:
    - "name": short label (1-4 words), e.g. "hero headline", "primary CTA", "navigation bar",
      "metric card", "sidebar nav", "chart widget", "colour swatch", "input field".
    - "col": which horizontal third of the image it is in — 1 = left, 2 = center, 3 = right.
    - "row": which vertical third of the image it is in — 1 = top, 2 = middle, 3 = bottom.
    - "zoom": how much to zoom in so the element fills the crop frame (1.5–5, default 2.5).
    Spread the elements across different grid cells so the crops are visually diverse.
- If a property is genuinely not present in the image, OMIT it (do not invent).
- Output MUST be valid JSON parseable by JSON.parse — no trailing commas, no comments.`;

interface AnalyseInput {
  /** Public path (e.g. /knowledge-refs/ai-1.png) or absolute URL. */
  imagePath: string;
  /** Original filename (basename), used to populate the StyleSpec.imageName. */
  imageName: string;
  /** Industry hint inferred from filename — overridden by the model if confident. */
  industryHint?: StyleSpecIndustry;
  /** Optional override of the OpenRouter model alias / id. */
  model?: string;
  /** Image bytes — must be provided so we can send as base64 to the vision model. */
  imageBase64DataUrl: string;
}

/**
 * Run the vision analyser on a single image and return the parsed StyleSpec.
 * Throws on LLM failure or unparsable response.
 */
export async function analyseImageToStyleSpec(
  input: AnalyseInput,
): Promise<StyleSpec> {
  const modelAlias = input.model ?? DEFAULT_VISION_MODEL;
  const model = resolveModel(modelAlias);

  const userInstruction = [
    input.industryHint
      ? `Industry hint (from filename, override if obviously wrong): ${input.industryHint}`
      : "Industry hint: unknown — infer from the screenshot.",
    "Analyse the attached design reference image and return the Style Spec JSON described in the system prompt.",
  ].join("\n");

  const messages: VisionChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: userInstruction },
        {
          type: "image_url",
          image_url: { url: input.imageBase64DataUrl, detail: "high" },
        },
      ],
    },
  ];

  const resp = await openRouterVisionChatCompletion(messages, {
    model,
    temperature: 0.3,
    max_tokens: 2048,
  });

  const raw = resp.choices[0]?.message?.content ?? "";
  const content = typeof raw === "string" ? raw : JSON.stringify(raw);
  const parsed = parseAndValidate(content);

  return {
    ...parsed,
    imagePath: input.imagePath,
    imageName: input.imageName,
    capturedAt: new Date().toISOString(),
    model: resp.model ?? model,
    industry: ALLOWED_INDUSTRIES.includes(parsed.industry)
      ? parsed.industry
      : (input.industryHint ?? "generic"),
  };
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

function stripFences(s: string): string {
  const t = s.trim();
  const m =
    t.match(/^```(?:json)?\r?\n([\s\S]*?)\r?\n```\s*$/) ??
    t.match(/^```(?:json)?\r?\n([\s\S]*?)```\s*$/);
  return m ? m[1].trim() : t;
}

function parseAndValidate(raw: string): StyleSpec {
  const cleaned = stripFences(raw);
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    // Try to locate the JSON object inside the response
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      throw new Error(
        `Vision analyser did not return JSON. First 200 chars: ${cleaned.slice(0, 200)}`,
      );
    }
    json = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  if (!json || typeof json !== "object") {
    throw new Error("Vision analyser returned non-object payload");
  }
  const obj = json as Record<string, unknown>;

  // Minimal required-key validation — we are lenient on optional fields and
  // fill defaults where the model omitted them, to keep the pipeline resilient.
  if (!obj.palette || typeof obj.palette !== "object") {
    throw new Error("Style Spec missing 'palette' field");
  }
  if (!obj.typography || typeof obj.typography !== "object") {
    throw new Error("Style Spec missing 'typography' field");
  }

  return obj as unknown as StyleSpec;
}
