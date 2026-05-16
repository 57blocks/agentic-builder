import type { IntentStage } from "./types";

export interface GapDimension {
  id: string;
  category: string;
  title: string;
  llmHint: string;
}

export const PRD_DIMENSIONS: GapDimension[] = [
  {
    id: "users-and-roles",
    category: "Users",
    title: "Users & roles",
    llmHint:
      "Who uses this product? Internal or external? Authenticated or anonymous? Are there distinct roles with different permissions? If the brief is silent, ask.",
  },
  {
    id: "auth-and-signup",
    category: "Users",
    title: "Authentication & sign-up",
    llmHint:
      "How do users get in? Password, magic-link, SSO, none? Is there an approval/onboarding step (e.g. admin must grant access) before they can use the product?",
  },
  {
    id: "external-data-sources",
    category: "Integrations",
    title: "External data sources",
    llmHint:
      "Does the product rely on data fetched from third-party services? Which classes of source (market data, social, on-chain, public documents, etc.)? Who provides credentials? Refresh cadence?",
  },
  {
    id: "data-retention-history",
    category: "Data",
    title: "Data retention & history",
    llmHint:
      "How much historical data is needed (days/months/forever)? Is backfill required at launch? Cold-storage / archival rules?",
  },
  {
    id: "audit-and-compliance",
    category: "Trust",
    title: "Audit & compliance",
    llmHint:
      "Which user actions must be auditable (who did what when)? Who can view audit trails? Any regulatory regime (SOC2, GDPR) to comply with?",
  },
  {
    id: "notifications",
    category: "Communication",
    title: "Notifications & messaging",
    llmHint:
      "Does the product send emails, in-app messages, or push notifications? To whom, on what trigger, via what channel?",
  },
  {
    id: "admin-configuration",
    category: "Operations",
    title: "Admin & configuration surface",
    llmHint:
      "What parameters must be editable without redeploy (thresholds, weights, source URLs, feature flags)? Who edits them? Is there an admin UI?",
  },
  {
    id: "ops-and-maintenance",
    category: "Operations",
    title: "Operational & maintenance actions",
    llmHint:
      "What manual recovery / data-fix actions will operators need (CLI scripts, admin endpoints)? E.g. force-rescore, re-extract, override values, delete entity.",
  },
  {
    id: "scale-and-performance",
    category: "Constraints",
    title: "Scale & performance targets",
    llmHint:
      "Expected number of users, requests/sec, data volume, retention horizon, p95 response time. Anything that affects architecture choices.",
  },
  {
    id: "explicit-non-goals",
    category: "Scope",
    title: "Explicit non-goals for v1",
    llmHint:
      "Force the user to state at least 2-3 things that are explicitly OUT of scope for v1. This prevents scope creep and is often missing from briefs. Required = true.",
  },
];

export const TRD_DIMENSIONS: GapDimension[] = [
  {
    id: "deployment-target",
    category: "Deployment",
    title: "Deployment target",
    llmHint:
      "Where will this run? Single host, cloud (AWS / GCP / Azure), Kubernetes, on-prem customer environment? Internet-facing or behind VPN?",
  },
  {
    id: "packaging-form",
    category: "Deployment",
    title: "Packaging form",
    llmHint:
      "Monolithic Docker image (all services inside, supervisord), docker-compose decomposed, Helm chart, or serverless? Is a single deploy artifact required?",
  },
  {
    id: "database-and-extensions",
    category: "Storage",
    title: "Database & extensions",
    llmHint:
      "PostgreSQL version? Required extensions (TimescaleDB for time-series, pgvector for embeddings, PostGIS for geo)? Backup/restore expectations?",
  },
  {
    id: "cache-and-queue",
    category: "Storage",
    title: "Cache & job queue",
    llmHint:
      "Is Redis required? Is a job queue (BullMQ, Celery, Sidekiq) required for background work, scheduled jobs, retries, rate-limited fetchers?",
  },
  {
    id: "data-source-vendors",
    category: "Integrations",
    title: "Concrete data-source vendors",
    llmHint:
      "Only relevant if PRD identifies external sources. For each source class, which vendor specifically? Existing API keys? Rate-limit concerns?",
  },
  {
    id: "mail-provider",
    category: "Integrations",
    title: "Mail provider",
    llmHint:
      "Only relevant if PRD mentions email. SMTP / SES / SendGrid / Resend / Postmark? Existing credentials? Sandbox vs. production sender?",
  },
  {
    id: "ai-llm-vendor",
    category: "Integrations",
    title: "AI / LLM vendor",
    llmHint:
      "Only relevant if PRD mentions AI extraction or generation. Anthropic / OpenAI / local model / Azure OpenAI? Which model? Existing key?",
  },
  {
    id: "observability",
    category: "Operations",
    title: "Observability level",
    llmHint:
      "Plain logs, or structured logs + metrics + traces? Sentry for errors? Specific dashboard tooling (Grafana, Datadog, CloudWatch)?",
  },
  {
    id: "ci-cd",
    category: "Operations",
    title: "CI/CD",
    llmHint:
      "GitHub Actions / GitLab CI / none? Auto-deploy on merge? Manual deploy script (deploy.sh + SSH)? Secrets management in CI?",
  },
  {
    id: "existing-constraints",
    category: "Constraints",
    title: "Existing technical constraints",
    llmHint:
      "Anything the team must use or must not use? Existing infra to integrate with (LDAP, SSO IdP, message bus)? Team language/framework familiarity?",
  },
  {
    id: "secrets-management",
    category: "Constraints",
    title: "Secrets management",
    llmHint:
      "How are credentials supplied to the running app? Plain .env, AWS Secrets Manager, HashiCorp Vault, Doppler? Any rotation requirements?",
  },
];

export function dimensionsForStage(stage: IntentStage): GapDimension[] {
  return stage === "prd" ? PRD_DIMENSIONS : TRD_DIMENSIONS;
}
