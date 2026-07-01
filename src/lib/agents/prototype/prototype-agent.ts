// src/lib/agents/prototype/prototype-agent.ts
import { BaseAgent } from "../shared/base-agent";
import { MODEL_CONFIG } from "@/lib/model-config";

const SYSTEM_PROMPT = `You are a senior frontend engineer.

Your job: port ONE captured demo page into an EXISTING Vite + React + TypeScript
+ Tailwind v4 scaffold that already ships a shadcn/ui component set and a
tokens.css design system.

Rules:
- The PRD is the single source of truth. The captured demo HTML is a
  visual/structural reference ONLY — when they conflict (fields, copy, flows,
  page existence), follow the PRD.
- Produce idiomatic React: a single named-export function component, typed,
  using @/ path aliases and @/components/ui shadcn primitives. Drop to plain
  <div> only for layout structure.
- Reuse the demo's Tailwind classes where they map to the scaffold's Tailwind v4
  + tokens; never introduce a competing design system.
- v1 is STATIC and per-page: placeholder data, inert handlers, and explicit
  // TODO(logic): … seams where real behavior belongs. Duplicate shared chrome
  inline; do not extract shared components.
- Output ONLY one fenced tsx block containing the complete file. No prose.`;

/** Ports a captured demo page (HTML) into a scaffold React view. */
export class PrototypeAgent extends BaseAgent {
  constructor() {
    super({
      name: "PrototypeAgent",
      role: "frontend",
      systemPrompt: SYSTEM_PROMPT,
      defaultModel: MODEL_CONFIG.codeGenFrontend,
      temperature: 0.3,
      // Full-page ports reproduce the demo's markup verbatim → large output.
      // 8192 truncated big landing/home pages (finish_reason=length) and every
      // fallback model hit the same ceiling. 32768 gives capable models (codex/
      // claude/deepseek) room to emit a complete file in one shot.
      maxTokens: 32768,
    });
  }

  /**
   * Run the port. `message` is assembled by `buildPortMessage`; `designContext`
   * is prepended as additional context by BaseAgent.run.
   */
  async portPage(message: string, designContext: string, sessionId?: string) {
    return this.run(message, designContext, "prototype", sessionId);
  }
}
