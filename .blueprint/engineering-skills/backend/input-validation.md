---
id: input-validation
agent: backend
version: v1
description: "Input validation and injection prevention: SQL injection, XSS, SSRF, path traversal, mass assignment"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - input validation
      - input
      - validation
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"input-validation\" engineering skill. That skill applies when: Input validation and injection prevention: SQL injection, XSS, SSRF, path traversal, mass assignment Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for rejecting malicious input and preventing injection attacks across SQL, HTML, shell, and other interpreters.

---

## Decision Rules

### Validate All Input at the Boundary

Treat every value that enters the system from outside as untrusted until validated:
- HTTP request bodies, query parameters, headers, cookies
- File uploads (name, type, content)
- Data read from a queue or event stream published by an external system
- Webhook payloads (even signed ones — validate the structure after verifying the signature)
- Data returned from third-party APIs

**Validate as early as possible** — at the API boundary, before the value reaches any business logic or data layer. Reject invalid input with a clear 400/422 error; do not attempt to sanitize and proceed.

**Validation checks to apply to every input:**
- **Type:** is the value the expected type (string, integer, boolean)?
- **Presence:** is the value present if required?
- **Length / size:** string length, array count, file size within allowed bounds?
- **Format:** matches expected pattern (email, UUID, ISO date, phone number)?
- **Range:** numeric value within allowed min/max?
- **Enum membership:** value is one of the allowed set?
- **Encoding:** valid UTF-8 or expected encoding?

---

### SQL Injection

**The rule: never concatenate user input into a SQL string. Always use parameterized queries.**

```
# Wrong — SQL injection
query = "SELECT * FROM users WHERE email = '" + email + "'"

# Right — parameterized
query = "SELECT * FROM users WHERE email = ?"
db.execute(query, [email])
```

This applies to:
- WHERE clause values
- INSERT values
- UPDATE SET values
- LIMIT and OFFSET values (cast to integer explicitly)
- ORDER BY column names and direction — these **cannot** be parameterized; use an allowlist instead:

```
allowed_sort_columns = {"created_at", "name", "amount"}
if sort_col not in allowed_sort_columns:
    raise ValidationError("invalid sort column")
query = f"SELECT * FROM orders ORDER BY {sort_col} {direction}"
```

**ORMs are not automatically safe:**
- Raw query escape hatches (`raw()`, `execute()`, string interpolation in query builders) bypass parameterization
- Review any raw SQL in ORM code for injection risks

**Second-order SQL injection:**
- Data stored safely in the DB is later retrieved and used in a SQL query without re-parameterizing
- Apply parameterized queries everywhere data is used in SQL, not just at the input boundary

---

### Cross-Site Scripting (XSS)

XSS is an injection attack targeting the browser — user-controlled data is rendered as executable HTML/JavaScript.

**The rule: never render user-controlled data as raw HTML. Always escape output for the target context.**

Escaping contexts:
- **HTML body:** escape `<`, `>`, `&`, `"`, `'` → `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#x27;`
- **HTML attribute:** same escaping, plus attribute must be quoted
- **JavaScript:** escape for JS string context; prefer `JSON.encode()` for embedding data
- **URL:** percent-encode user-controlled values in URLs; validate that URLs use expected schemes (`http`/`https`, not `javascript:`)
- **CSS:** avoid embedding user data in CSS; if unavoidable, allow only safe CSS property values

**Use your framework's auto-escaping — do not write escaping manually:**
- Modern templating engines (Jinja2, ERB, Blade, Thymeleaf) escape by default
- Explicitly unescaped output (`|safe`, `raw()`, `innerHTML =`) is the danger zone — audit every use

**Content Security Policy (CSP):**
- `Content-Security-Policy` header restricts what scripts can execute
- `default-src 'self'` blocks inline scripts and external script sources as a defense in depth layer
- CSP is a mitigation, not a substitute for output escaping

**Stored XSS:** user input saved to DB and later rendered. The injection point and execution point are different — escaping must happen at render time, not storage time. Never rely on "we sanitized it when we stored it."

---

### Server-Side Request Forgery (SSRF)

SSRF occurs when an attacker causes your server to make HTTP requests to internal resources by supplying a URL.

**Common injection points:** avatar URL, webhook URL, import-from-URL features, PDF generation from user-supplied HTML.

**Prevention:**
- Validate URLs against an allowlist of permitted schemes (`https` only) and domains
- Block requests to private IP ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `169.254.0.0/16` (AWS metadata)
- Resolve the hostname to an IP and re-check the IP after DNS resolution (DNS rebinding prevention)
- Use a dedicated egress proxy with allowlisted destinations for user-supplied URL fetching
- Never allow `file://`, `gopher://`, `dict://` schemes

```
# Before fetching a user-supplied URL:
1. Parse the URL; reject non-http/https schemes
2. Resolve the hostname to an IP
3. Check the IP is not in a private/loopback range
4. Fetch via a proxy or with a short timeout
```

---

### Path Traversal

Path traversal occurs when user input is used to construct a file system path, allowing access to files outside the intended directory.

```
# Attack: ?filename=../../etc/passwd
path = base_dir + "/" + user_supplied_filename
open(path)  # reads /etc/passwd
```

**Prevention:**
- Never construct file paths by concatenating user input directly
- Resolve the final path and verify it is within the expected base directory:
  ```
  resolved = realpath(base_dir + "/" + user_filename)
  if not resolved.startswith(base_dir):
      raise Forbidden
  ```
- Use an allowlist of permitted filenames or file IDs rather than accepting raw path segments
- Store user uploads by a system-generated key (UUID), not the original filename

---

### Command Injection

Command injection occurs when user input is passed to a shell command.

**The rule: never pass user input to a shell. Use library functions or parameterized command execution instead.**

_…(truncated for prompt budget — full reference lives in the Engineering source)_
