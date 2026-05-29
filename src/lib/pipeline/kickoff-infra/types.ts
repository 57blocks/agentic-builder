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

/**
 * Persisted state of the Dokploy compose stack created at first deploy. We
 * stash it inside `kickoff-infra.json` so subsequent deploys reuse the same
 * compose (update env + redeploy in place) instead of leaking a fresh one
 * on every click — which produced N orphaned composes with N different URLs.
 *
 * `provisionInfra` (kickoff phase) does not write this field; the deploy
 * pipeline merges it in after a successful first deploy. Re-running kickoff
 * legitimately wipes it: that path implies fresh DB credentials, so the
 * existing compose's env is stale and recreating is correct.
 */
export interface ComposeInfo {
  composeId: string;
  appName: string;
  /** Hostname created at first deploy; reused on subsequent ones. */
  appHost?: string;
  savedAt: string;
}

export interface KickoffInfraFile {
  dokployProjectId: string;
  dokployEnvironmentId: string;
  appName: string;
  services: InfraServiceInfo[];
  /** Set lazily by the deploy pipeline; absent until first deploy. */
  compose?: ComposeInfo;
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
