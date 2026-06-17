---
id: auth
agent: backend
version: v1
description: "Authentication and authorization: sessions, JWTs, API keys, password hashing, RBAC, ABAC, IDOR prevention"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - auth
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"auth\" engineering skill. That skill applies when: Authentication and authorization: sessions, JWTs, API keys, password hashing, RBAC, ABAC, IDOR prevention Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for verifying identity (AuthN) and enforcing permissions (AuthZ) correctly and safely.

---

## Decision Rules

### Authentication vs. Authorization

- **Authentication (AuthN):** Who are you? Verify identity. Runs first.
- **Authorization (AuthZ):** What are you allowed to do? Enforce permissions. Runs after AuthN.
- Never conflate them. A request can be authenticated but not authorized (valid token, wrong permissions).

---

### Choosing an Authentication Mechanism

| Mechanism         | Best for                                               | Avoid when                                  |
|-------------------|--------------------------------------------------------|---------------------------------------------|
| Session + cookie  | Browser-based apps, server-rendered UIs                | APIs consumed by non-browser clients        |
| JWT (stateless)   | Stateless APIs, microservices, mobile clients          | You need instant revocation without a store |
| API key           | Server-to-server, developer/third-party API consumers  | User-facing login flows                     |
| OAuth 2.0         | Delegated access, third-party integrations             | Internal service-to-service (use mTLS/keys) |
| mTLS              | Internal service-to-service in zero-trust networks     | Public client-facing APIs                   |

Do not build a custom authentication scheme. Use a proven mechanism or an identity provider (Auth0, Cognito, Okta, Keycloak).

---

### Sessions

- Store session state server-side (DB or Redis); store only a session ID in the cookie
- Cookie attributes required on every session cookie:
  ```
  Set-Cookie: session=<id>; HttpOnly; Secure; SameSite=Strict; Path=/
  ```
  - `HttpOnly` — prevents JavaScript from reading the cookie (XSS mitigation)
  - `Secure` — only sent over HTTPS
  - `SameSite=Strict` (or `Lax`) — CSRF mitigation
- Rotate the session ID on privilege escalation (login, sudo, role change) to prevent session fixation
- Set a session expiry and an idle timeout independently:
  - Absolute expiry: session dies after N hours regardless of activity
  - Idle timeout: session dies after N minutes of inactivity
- Invalidate sessions server-side on logout — deleting the cookie client-side is not enough

---

### JWTs

**Structure:** `header.payload.signature` — the payload is base64-encoded, not encrypted. Do not put secrets in a JWT payload.

**Signing:**
- Use asymmetric keys (RS256, ES256) when the token will be verified by a different service than the one that issued it
- Use symmetric keys (HS256) only when the same service issues and verifies
- Always verify the signature before trusting any claim
- Never accept `alg: none` — reject tokens with no algorithm

**Claims to always validate:**
- `exp` — token is not expired
- `iss` — issuer matches expected value
- `aud` — audience matches your service
- `nbf` — token is not being used before its valid-from time (if present)

**Expiry:**
- Access tokens: short-lived (5–15 minutes)
- Refresh tokens: longer-lived (days to weeks), stored securely, used only to obtain new access tokens
- Never issue non-expiring JWTs

**Revocation:**
- JWTs are stateless — you cannot invalidate them before expiry without a store
- For revocation support, maintain a denylist (Redis set of revoked `jti` claims) checked on every request
- Or keep access tokens very short-lived (< 15 min) and revoke refresh tokens instead
- Denylist entries can expire when the token's `exp` is reached

**Transmission:**
- Send in `Authorization: Bearer <token>` header
- Do not send in query strings — they appear in logs and browser history
- Do not store in `localStorage` — vulnerable to XSS; prefer `HttpOnly` cookies or in-memory

---

### API Keys

- Generate keys with a cryptographically secure random source (at least 128 bits of entropy)
- Never store plaintext API keys — store a hash (SHA-256 is sufficient; no need for bcrypt/argon2 since keys are high-entropy)
- Show the key to the user exactly once at creation; store only the hash
- Prefix keys for easy identification and secret scanning: `sk_live_...`, `pk_test_...`
- Scope keys to the minimum required permissions
- Support key rotation without downtime: allow multiple active keys per account during transition
- Log key usage (which key, which endpoint, timestamp) for audit purposes

---

### Password Handling

- Never store plaintext passwords or reversible encrypted passwords
- Hash with a slow, salted algorithm: **Argon2id** (preferred), bcrypt (widely supported), scrypt
- Do not use MD5, SHA-1, SHA-256, or any fast hash for passwords — they are trivially brute-forced
- Use the library's default cost factor, then tune upward so hashing takes ~100–300ms on your hardware
- On login, use a constant-time comparison to prevent timing attacks
- Enforce a minimum password length (at least 8 characters); check against known breached password lists (HaveIBeenPwned API)
- Never log passwords, even on validation failure

---

### Authorization Models

**Role-Based Access Control (RBAC):**
- Users are assigned roles; roles have permissions
- Simple and auditable; good default for most applications
- Roles: `admin`, `editor`, `viewer`, `billing_admin`, etc.
- Store role assignments in the DB; check on every request

**Attribute-Based Access Control (ABAC):**
- Access decisions based on attributes of the user, resource, and environment
- More expressive than RBAC: `user.department == resource.owner_department AND time.hour < 18`
- Use when RBAC becomes unwieldy (too many roles, context-dependent rules)
- Harder to audit and debug; start with RBAC and move to ABAC only when needed

**Resource ownership checks:**
- Always verify the authenticated user owns or has access to the specific resource being acted on
- A valid session/token does not mean access to every resource of that type
  ```
  # Wrong: only checks authentication
  order = get_order(order_id)

_…(truncated for prompt budget — full reference lives in the Engineering source)_
