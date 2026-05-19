/**
 * Runtime infra provisioning types. One generated app → one Dokploy project →
 * 0..N managed services (postgres, redis, future). Persisted to
 * `.blueprint/kickoff-infra.json` so both `coding/route.ts` and
 * `deploy/pipeline.ts` can read the same source of truth.
 */

export type InfraServiceKind = "postgres" | "redis";

export interface InfraServiceInfo {
  kind: InfraServiceKind;
  /** Dokploy-side ID for delete/teardown. */
  id: string;
  /** Dokploy-side service `appName` — used as internal hostname. */
  appName: string;
  /** Public URL — what the developer's local `pnpm dev` reads from .env. */
  publicUrl: string;
  /** Internal URL on dokploy-network — what compose services should use. */
  internalUrl: string;
  /** Host port exposed by Dokploy. */
  externalPort: number;
}

export interface KickoffInfraFile {
  dokployProjectId: string;
  dokployEnvironmentId: string;
  appName: string;
  services: InfraServiceInfo[];
  savedAt: string;
}

export interface RequiredServices {
  needsPostgres: boolean;
  needsRedis: boolean;
}

export interface ProvisionInfraInput {
  projectRoot: string;
  /** Slug-style app name used as the Dokploy project name. */
  appName: string;
  /** Aggregated TRD/SysDesign/ImplGuide text — used for tech-stack detection. */
  designDocs: string;
}

export interface ProvisionInfraResult {
  ok: boolean;
  metadata: KickoffInfraFile | null;
  markdownLines: string[];
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}
