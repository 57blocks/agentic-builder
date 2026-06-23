---
id: secrets-management
agent: backend
version: v1
description: "Secrets management: secret storage, rotation, least privilege, secret scanning, encryption keys"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - secrets management
      - secrets
      - management
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"secrets-management\" engineering skill. That skill applies when: Secrets management: secret storage, rotation, least privilege, secret scanning, encryption keys Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for storing, distributing, and rotating secrets without leaking them.

---

## Decision Rules

### What Is a Secret

A secret is any value that grants access or proves identity:
- Database credentials (host, user, password, connection string)
- API keys and tokens (third-party services, internal service accounts)
- Signing keys and encryption keys
- OAuth client secrets
- Private TLS certificates and keys
- Webhook signing secrets

Configuration that is not a secret: feature flags, non-sensitive URLs, log levels, timeouts. These can live in environment config or a config file.

---

### Where Secrets Must Never Live

- **Source code** — committed secrets persist in git history even after deletion; rotate immediately if this happens
- **Build artifacts** — Docker images, compiled binaries, deployment packages
- **Client-side code** — browser JavaScript, mobile apps (trivially extracted)
- **Unencrypted config files** committed to version control (`.env`, `config.yaml`, `application.properties`)
- **Application logs** — see [error-handling-observability](../error-handling-observability/README.md)
- **URLs** — secrets in query strings appear in access logs, browser history, and referrer headers
- **Environment variables in CI that are printed** — mask secrets in CI output; never echo them

---

### Secret Storage Options

| Option                          | When to use                                           |
|---------------------------------|-------------------------------------------------------|
| Secrets manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) | Production systems; supports rotation, access control, audit |
| CI/CD secret store (GitHub Actions secrets, GitLab CI variables) | CI pipeline credentials only |
| `.env` file (local dev only, gitignored) | Local development; never in production |
| Kubernetes Secrets (encrypted at rest) | Kubernetes workloads; prefer external secrets operator |
| HSM / KMS for encryption keys   | Keys that must never leave secure hardware            |

Rules:
- Use a dedicated secrets manager in production — not environment variables set directly on servers
- Secrets manager provides: encryption at rest, access control per secret, rotation support, audit log of access
- Never store secrets in a general-purpose config store (Consul, etcd, S3 bucket) without encryption and access control

---

### Accessing Secrets at Runtime

- Fetch secrets from the secrets manager at application startup (or lazily on first use), not at build time
- Cache secrets in memory for the lifetime of the process; do not re-fetch on every request
- Set a refresh interval for cached secrets to pick up rotations: fetch every 5–15 minutes or on a cache miss after a TTL
- Do not write secrets to disk from the application — keep them in memory only
- Do not pass secrets as command-line arguments — they appear in `ps` output and process lists

**Startup fail-fast:**
- If a required secret is missing or unreachable at startup, crash with a clear error message
- Do not start in a degraded state that silently fails later

---

### Secret Rotation

Rotate secrets:
- On a regular schedule (e.g., every 90 days for long-lived credentials)
- Immediately after any suspected compromise
- When an employee with access departs
- After a security incident

**Zero-downtime rotation:**
1. Generate a new secret
2. Add the new secret alongside the old (if the service supports multiple active credentials)
3. Update the secrets manager with the new value
4. Deploy / refresh applications to pick up the new secret
5. Verify all instances are using the new secret
6. Revoke the old secret

For DB credentials: most secrets managers support automatic rotation with Lambda/Cloud Functions that update the DB user password and the stored secret atomically.

**Rotation readiness:**
- Applications must be designed to tolerate a secret value changing without a redeploy
- Fetch secrets dynamically (startup fetch + periodic refresh), not baked into the build

---

### Least Privilege for Secret Access

- Each service should have access only to the secrets it needs — not a master secret that grants access to everything
- Use IAM roles, service accounts, or Vault policies to scope access per service
- Audit who (which services, which humans) can access which secrets
- Avoid sharing secrets between services — each service has its own DB credentials, its own API keys
- Human access to production secrets should require justification, be time-limited, and be audited

---

### Secret Scanning

- Run a secret scanner in CI on every commit: `trufflehog`, `gitleaks`, `detect-secrets`
- Configure pre-commit hooks to block commits containing secret patterns
- Scan the full git history when first introducing secret scanning — secrets may already be present
- Register known secret formats with your scanner (API key prefixes: `sk_live_`, `ghp_`, etc.)

**If a secret is found in git history:**
1. Rotate the secret immediately — treat it as compromised
2. Remove from git history (`git filter-repo`) — but assume it has already been seen
3. Audit access logs for the compromised secret
4. Notify relevant parties per your incident response process

Removing from history does not undo exposure — rotation is the critical step.

---

### Environment Variables

Environment variables are a common injection mechanism for secrets in containerized systems (12-factor app). Use them carefully:

- Inject via the orchestrator (Kubernetes secrets, ECS task definitions) — not hardcoded in Dockerfiles or docker-compose files committed to git
- Avoid passing secrets as environment variables if the platform logs environment variables on crash or startup
- Prefer secrets manager SDK injection over environment variables for production: the application fetches the secret directly, never storing it in the process environment where it can be read by any subprocess

---

### Encryption Keys

_…(truncated for prompt budget — full reference lives in the Engineering source)_
