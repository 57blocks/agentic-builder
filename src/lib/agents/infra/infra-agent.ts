import { BaseAgent, type AgentResult } from "../shared/base-agent";
import { MODEL_CONFIG } from "@/lib/model-config";
import {
  parseInfraSpec,
  type InfraSpec,
  type ParseResult,
} from "@/lib/pipeline/infra/types";

const SYSTEM_PROMPT = `You are an Infrastructure Agent.

Given a project TRD + System Design + tier, output a STRICT JSON document
describing the runtime topology. Your output MUST be valid JSON and ONLY JSON
(no prose, no markdown fences).

Schema (exact field names):
{
  "tier": "S" | "M" | "L",
  "services": [
    // app service (one per Dockerfile we must generate)
    {
      "name": "<kebab-case>",
      "kind": "app",
      "role": "frontend" | "backend" | "worker",
      "runtime": "node20-alpine" | "node22-alpine" | "node20" | "node22",
      "context": ".",                       // S-tier; or "frontend" / "backend" for M/L
      "workdir": "/app",
      "install": "pnpm install --frozen-lockfile",
      "build": "pnpm run build",             // optional
      "start": "node dist/server.js",        // exec form recommended
      "port": 3001,                          // omit for static-served frontends
      "envs": ["DATABASE_URL", "REDIS_URL"], // backend env vars
      "depends": ["postgres", "redis"],      // names of services in this spec
      "servesStatic": false                  // true for nginx-served SPA frontends
    },
    // managed service (no Dockerfile, official image)
    {
      "name": "redis",
      "kind": "managed",
      "image": "redis:7-alpine" | "postgres:16-alpine" | "nginx:alpine",
      "envs": []                             // POSTGRES_USER/PASSWORD/DB for postgres
    }
  ],
  "domains": []                              // leave empty unless asked
}

Rules:
- S-tier: exactly ONE app service with context=".". No backend/managed services.
- M-tier: frontend (servesStatic=true, context="frontend") + backend
  (context="backend"). Add postgres ONLY if SysDesign mentions a relational DB.
- L-tier: frontend + backend; optionally worker(s); add postgres if relational;
  add redis ONLY if SysDesign mentions queue, cache, session store, or
  rate limiter. Otherwise OMIT redis.
- Use kebab-case service names. Frontend service should typically be "frontend",
  backend "backend".
- Redis is ALWAYS per-project (never shared). Do not invent shared infra.
- Do not invent envs. Only list envs the backend actually reads.
- Do not output any text outside the JSON object.`;

export interface InfraAgentResult extends AgentResult {
  parsed: ParseResult;
  spec?: InfraSpec;
  rawJson?: string;
}

function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    const inner = trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "");
    return inner.trim();
  }
  return trimmed;
}

function extractJsonObject(s: string): string {
  const cleaned = stripCodeFence(s);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
}

export class InfraAgent extends BaseAgent {
  constructor() {
    super({
      name: "Infra Agent",
      role: "Infrastructure Generator",
      systemPrompt: SYSTEM_PROMPT,
      defaultModel: MODEL_CONFIG.infra,
      temperature: 0.1,
      maxTokens: 4096,
    });
  }

  async generateInfraSpec(args: {
    tier: "S" | "M" | "L";
    trdContent: string;
    sysDesignContent: string;
    sessionId?: string;
  }): Promise<InfraAgentResult> {
    const ctx = [
      `## Project Tier\n${args.tier}`,
      `## TRD\n${args.trdContent}`,
      `## System Design\n${args.sysDesignContent}`,
    ].join("\n\n");

    const result = await this.run(
      `Produce the InfraSpec JSON for this project. Respond with JSON only.`,
      ctx,
      "step-infra",
      args.sessionId,
    );

    const rawJson = extractJsonObject(result.content);
    const parsed = parseInfraSpec(rawJson);
    return {
      ...result,
      parsed,
      spec: parsed.spec,
      rawJson,
    };
  }
}
