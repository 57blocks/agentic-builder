/**
 * NOTE: This file is the LLM-spec InfraSpec used by the (currently dormant)
 * infra-agent path. Runtime provisioning types live in
 * `src/lib/pipeline/kickoff-infra/types.ts` — do not conflate the two.
 */
import { z } from "zod";

export const ALLOWED_RUNTIMES = [
  "node20-alpine",
  "node22-alpine",
  "node20",
  "node22",
] as const;
export type Runtime = (typeof ALLOWED_RUNTIMES)[number];

export const ALLOWED_MANAGED_IMAGES = [
  "redis:7-alpine",
  "postgres:16-alpine",
  "nginx:alpine",
] as const;

export const ServiceKindSchema = z.enum(["app", "managed"]);

const AppServiceSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,30}$/, "service name must be kebab-case"),
  kind: z.literal("app"),
  role: z.enum(["frontend", "backend", "worker"]),
  runtime: z.enum(ALLOWED_RUNTIMES),
  context: z.string().default("."),
  workdir: z.string().default("/app"),
  install: z.string().default("pnpm install --frozen-lockfile"),
  build: z.string().optional(),
  start: z.string(),
  port: z.number().int().min(1).max(65535).optional(),
  /**
   * Secret / dynamic env keys. Rendered as `${KEY}` in compose so they read
   * from Dokploy-stored environment (or a project-root `.env`). Each entry
   * also appears in `.env.example` for the local-dev path.
   */
  envs: z.array(z.string()).default([]),
  /**
   * Non-secret config that's safe to bake into the compose file as literal
   * values (NODE_ENV=production, PORT=3001, USE_REDIS_QUEUE=1, ...). These
   * are NOT written to `.env.example` and don't depend on any external env.
   */
  staticEnvs: z.record(z.string(), z.string()).default({}),
  depends: z.array(z.string()).default([]),
  servesStatic: z.boolean().default(false),
});

const ManagedServiceSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,30}$/, "service name must be kebab-case"),
  kind: z.literal("managed"),
  image: z.enum(ALLOWED_MANAGED_IMAGES),
  envs: z.array(z.string()).default([]),
  /** Extra command tokens (e.g. ["redis-server","--maxmemory","128mb"]). */
  command: z.array(z.string()).optional(),
  /** Volume name -> mount path (managed only; renderer creates the volume). */
  volumes: z.record(z.string(), z.string()).optional(),
});

export const ServiceSchema = z.discriminatedUnion("kind", [
  AppServiceSchema,
  ManagedServiceSchema,
]);
export type ServiceSpec = z.infer<typeof ServiceSchema>;
export type AppService = z.infer<typeof AppServiceSchema>;
export type ManagedService = z.infer<typeof ManagedServiceSchema>;

export const InfraSpecSchema = z
  .object({
    tier: z.enum(["S", "M", "L"]),
    services: z.array(ServiceSchema).min(1),
    domains: z
      .array(
        z.object({
          service: z.string(),
          host: z.string().optional(),
        }),
      )
      .default([]),
  })
  .superRefine((spec, ctx) => {
    const names = new Set<string>();
    for (const s of spec.services) {
      if (names.has(s.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate service name: ${s.name}`,
        });
      }
      names.add(s.name);
    }
    // Port conflict check (managed services don't bind host ports in our model)
    const ports = new Map<number, string>();
    for (const s of spec.services) {
      if (s.kind !== "app" || s.port == null) continue;
      const prev = ports.get(s.port);
      if (prev) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `port ${s.port} used by both ${prev} and ${s.name}`,
        });
      }
      ports.set(s.port, s.name);
    }
    // depends must reference existing services
    for (const s of spec.services) {
      const deps = s.kind === "app" ? s.depends : [];
      for (const d of deps) {
        if (!names.has(d)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${s.name} depends on missing service "${d}"`,
          });
        }
      }
    }
  });

export type InfraSpec = z.infer<typeof InfraSpecSchema>;

export interface ParseResult {
  ok: boolean;
  spec?: InfraSpec;
  errors?: string[];
}

/**
 * Parse a JSON string (or pre-parsed object) into an InfraSpec.
 * Returns structured errors instead of throwing — callers decide whether to
 * fall back to the static scaffold or fail the pipeline.
 */
export function parseInfraSpec(input: string | unknown): ParseResult {
  let raw: unknown;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch (e) {
      return {
        ok: false,
        errors: [`invalid JSON: ${(e as Error).message}`],
      };
    }
  } else {
    raw = input;
  }
  const result = InfraSpecSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
      ),
    };
  }
  return { ok: true, spec: result.data };
}
