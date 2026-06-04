# Google OAuth Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth sign-in alongside the existing email/password login, restricting access to `@57blocks.com` accounts, persisting users to a new `users` table, and protecting all routes via Next.js middleware.

**Architecture:** Extract all Google OAuth helper functions (PKCE generation, state cookie parsing, id_token decoding, domain validation) into a testable `src/lib/auth-google.ts` module. Route handlers (`/api/auth/google`, `/api/auth/callback/google`, `/api/auth/logout`) are thin orchestrators that call those helpers plus the existing `signToken`/`verifyToken`. A new `src/middleware.ts` guards every route except `/login` and `/api/auth/*`.

**Tech Stack:** Next.js 15 App Router, Web Crypto API (built-in), Drizzle ORM + PostgreSQL, existing HMAC token auth (`src/lib/auth.ts`), Vitest for unit tests.

---

## File Map

| File | Action |
|---|---|
| `src/lib/db/migrations/006_users.sql` | Create — SQL migration for `users` table |
| `src/lib/db/schema.ts` | Modify — add `users` pgTable + inferred types |
| `src/lib/auth-google.ts` | Create — PKCE, state cookie, id_token decode, domain check |
| `src/lib/__tests__/auth-google.test.ts` | Create — unit tests for `auth-google.ts` |
| `src/lib/db/users.repo.ts` | Create — `upsertUser()` for both login paths |
| `src/middleware.ts` | Create — route protection |
| `src/app/api/auth/google/route.ts` | Create — initiates OAuth flow |
| `src/app/api/auth/callback/google/route.ts` | Create — handles Google redirect |
| `src/app/api/auth/logout/route.ts` | Create — clears `auth_token` cookie |
| `src/app/api/auth/login/route.ts` | Modify — add domain check + user upsert |
| `src/app/login/page.tsx` | Modify — Google button + error messages |
| `src/components/AppNav.tsx` | Modify — add logout button to user profile section |
| `.env.example` | Modify — document Google OAuth env vars |

---

## Task 1: Users table — SQL migration

**Files:**
- Create: `src/lib/db/migrations/006_users.sql`
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Create the SQL migration file**

```sql
-- src/lib/db/migrations/006_users.sql
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  picture     TEXT,
  google_id   TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Add the Drizzle schema definition**

Open `src/lib/db/schema.ts`. Find the existing `// ─── Inferred TypeScript types ───────────────────────────────────────────────` comment near the bottom. Insert the `users` table **before** that comment:

```typescript
// ─── users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:        text("id").primaryKey(),
  email:     text("email").notNull().unique(),
  name:      text("name"),
  picture:   text("picture"),
  googleId:  text("google_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Add inferred types for `users`**

Still in `src/lib/db/schema.ts`, append to the existing inferred-types block at the bottom:

```typescript
export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

- [ ] **Step 4: Run the migration**

```bash
npm run db:migrate-sql
```

Expected output includes:
```
[migrate] Running 006_users.sql…
[migrate] ✓ 006_users.sql
[migrate] All migrations complete.
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/migrations/006_users.sql src/lib/db/schema.ts
git commit -m "feat(auth): add users table migration and Drizzle schema"
```

---

## Task 2: Google OAuth helper module (with tests)

**Files:**
- Create: `src/lib/auth-google.ts`
- Create: `src/lib/__tests__/auth-google.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/__tests__/auth-google.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  isAllowedEmail,
  parseStateCookie,
  buildStateCookieValue,
  decodeIdToken,
} from "../auth-google";

describe("isAllowedEmail", () => {
  it("accepts @57blocks.com emails", () => {
    expect(isAllowedEmail("user@57blocks.com")).toBe(true);
  });
  it("rejects other domains", () => {
    expect(isAllowedEmail("user@gmail.com")).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(isAllowedEmail("User@57Blocks.COM")).toBe(true);
  });
  it("rejects emails that merely contain the domain", () => {
    expect(isAllowedEmail("user@evil57blocks.com")).toBe(false);
    expect(isAllowedEmail("user@57blocks.com.evil.com")).toBe(false);
  });
});

describe("parseStateCookie", () => {
  it("splits state from code_verifier on first colon", () => {
    const result = parseStateCookie("abc123:verifierbase64string");
    expect(result).toEqual({ state: "abc123", code_verifier: "verifierbase64string" });
  });
  it("returns null when no colon present", () => {
    expect(parseStateCookie("nocolon")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(parseStateCookie("")).toBeNull();
  });
  it("handles code_verifier that contains colons (splits on first only)", () => {
    const result = parseStateCookie("state:ver:ifier");
    expect(result).toEqual({ state: "state", code_verifier: "ver:ifier" });
  });
});

describe("buildStateCookieValue + parseStateCookie roundtrip", () => {
  it("parses back what was built", () => {
    const value = buildStateCookieValue("mystate", "myverifier");
    expect(parseStateCookie(value)).toEqual({ state: "mystate", code_verifier: "myverifier" });
  });
});

describe("decodeIdToken", () => {
  function makeToken(payload: object): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `header.${encoded}.signature`;
  }

  it("extracts email, sub, name, picture", () => {
    const token = makeToken({
      sub: "12345",
      email: "user@57blocks.com",
      name: "Alice",
      picture: "https://example.com/pic.jpg",
    });
    expect(decodeIdToken(token)).toEqual({
      sub: "12345",
      email: "user@57blocks.com",
      name: "Alice",
      picture: "https://example.com/pic.jpg",
    });
  });

  it("returns null for a token without 3 segments", () => {
    expect(decodeIdToken("only.two")).toBeNull();
    expect(decodeIdToken("notavalidtoken")).toBeNull();
  });

  it("returns null when email is missing", () => {
    expect(decodeIdToken(makeToken({ sub: "123", name: "Alice" }))).toBeNull();
  });

  it("returns null when sub is missing", () => {
    expect(decodeIdToken(makeToken({ email: "user@57blocks.com" }))).toBeNull();
  });

  it("returns null when payload is not valid JSON", () => {
    expect(decodeIdToken("header.notbase64json.sig")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "auth-google|FAIL|PASS|✓|✗|×"
```

Expected: tests fail with `Cannot find module '../auth-google'`.

- [ ] **Step 3: Implement `src/lib/auth-google.ts`**

```typescript
export const ALLOWED_DOMAIN = "@57blocks.com";
export const OAUTH_STATE_COOKIE = "oauth_state";

export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

export async function generatePkce(): Promise<{
  code_verifier: string;
  code_challenge: string;
}> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const code_verifier = Buffer.from(verifierBytes).toString("base64url");

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code_verifier),
  );
  const code_challenge = Buffer.from(digest).toString("base64url");

  return { code_verifier, code_challenge };
}

export function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Buffer.from(bytes).toString("hex");
}

export function buildStateCookieValue(state: string, code_verifier: string): string {
  return `${state}:${code_verifier}`;
}

export function parseStateCookie(
  value: string,
): { state: string; code_verifier: string } | null {
  if (!value) return null;
  const colonIdx = value.indexOf(":");
  if (colonIdx === -1) return null;
  const state = value.slice(0, colonIdx);
  const code_verifier = value.slice(colonIdx + 1);
  if (!state || !code_verifier) return null;
  return { state, code_verifier };
}

export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

export function decodeIdToken(idToken: string): GoogleIdTokenPayload | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as Partial<GoogleIdTokenPayload>;
    if (!payload.email || !payload.sub) return null;
    return payload as GoogleIdTokenPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "auth-google|FAIL|PASS|✓|✗|×"
```

Expected: all `auth-google` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-google.ts src/lib/__tests__/auth-google.test.ts
git commit -m "feat(auth): add Google OAuth helper functions with tests"
```

---

## Task 3: Users repository

**Files:**
- Create: `src/lib/db/users.repo.ts`

- [ ] **Step 1: Create `src/lib/db/users.repo.ts`**

```typescript
import { db } from "./client";
import { users, type User } from "./schema";
import { v4 as uuid } from "uuid";

export interface UpsertUserInput {
  email: string;
  name?: string | null;
  picture?: string | null;
  google_id?: string | null;
}

export async function upsertUser(input: UpsertUserInput): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      id: uuid(),
      email: input.email,
      name: input.name ?? null,
      picture: input.picture ?? null,
      googleId: input.google_id ?? null,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        googleId: input.google_id ?? null,
        name: input.name ?? null,
        picture: input.picture ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/users.repo.ts
git commit -m "feat(auth): add users repository with upsertUser"
```

---

## Task 4: Route protection middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(COOKIE_NAME)?.value ?? null;
  const payload = token ? await verifyToken(token) : null;

  // Already logged in → redirect away from /login
  if (pathname.startsWith("/login")) {
    if (payload) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated → send to /login
  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclude: auth API routes, Next.js internals, static files
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)"],
};
```

- [ ] **Step 2: Verify dev server starts without errors**

```bash
npm run dev 2>&1 | head -20
```

Expected: server starts, no TypeScript or import errors in the middleware.

- [ ] **Step 3: Verify route protection manually**

Open `http://localhost:3000/` in a browser (with no `auth_token` cookie).
Expected: redirects to `http://localhost:3000/login`.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): add Next.js middleware for route protection"
```

---

## Task 5: Google OAuth initiation route

**Files:**
- Create: `src/app/api/auth/google/route.ts`

- [ ] **Step 1: Create `src/app/api/auth/google/route.ts`**

```typescript
import { NextResponse } from "next/server";
import {
  generatePkce,
  generateState,
  buildStateCookieValue,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth-google";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ??
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/auth/callback/google";

export async function GET() {
  const { code_verifier, code_challenge } = await generatePkce();
  const state = generateState();

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    code_challenge,
    code_challenge_method: "S256",
    state,
    access_type: "offline",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, buildStateCookieValue(state, code_verifier), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return res;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/google/route.ts
git commit -m "feat(auth): add GET /api/auth/google OAuth initiation route"
```

---

## Task 6: Google OAuth callback route

**Files:**
- Create: `src/app/api/auth/callback/google/route.ts`

- [ ] **Step 1: Create `src/app/api/auth/callback/google/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  parseStateCookie,
  decodeIdToken,
  isAllowedEmail,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth-google";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { upsertUser } from "@/lib/db/users.repo";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ??
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/auth/callback/google";

function errorRedirect(req: NextRequest, error: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  const res = NextResponse.redirect(url);
  // Clear stale state cookie
  res.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  if (!code || !stateParam) {
    return errorRedirect(req, "oauth");
  }

  // Verify CSRF state
  const stateCookieRaw = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!stateCookieRaw) {
    return errorRedirect(req, "state");
  }
  const parsed = parseStateCookie(stateCookieRaw);
  if (!parsed || parsed.state !== stateParam) {
    return errorRedirect(req, "state");
  }

  // Exchange authorization code for tokens
  let idToken: string;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        code_verifier: parsed.code_verifier,
      }),
    });
    if (!tokenRes.ok) {
      return errorRedirect(req, "oauth");
    }
    const tokenData = (await tokenRes.json()) as { id_token?: string };
    if (!tokenData.id_token) {
      return errorRedirect(req, "oauth");
    }
    idToken = tokenData.id_token;
  } catch {
    return errorRedirect(req, "oauth");
  }

  // Decode id_token payload
  const googlePayload = decodeIdToken(idToken);
  if (!googlePayload) {
    return errorRedirect(req, "oauth");
  }

  // Domain check — must be @57blocks.com
  if (!isAllowedEmail(googlePayload.email)) {
    return errorRedirect(req, "domain");
  }

  // Persist user
  await upsertUser({
    email: googlePayload.email,
    name: googlePayload.name ?? null,
    picture: googlePayload.picture ?? null,
    google_id: googlePayload.sub,
  });

  // Mint auth token
  const authToken = await signToken(googlePayload.email);

  const res = NextResponse.redirect(new URL("/", req.url));

  // Clear OAuth state cookie
  res.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Set session cookie
  res.cookies.set(COOKIE_NAME, authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return res;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/callback/google/route.ts
git commit -m "feat(auth): add GET /api/auth/callback/google OAuth callback route"
```

---

## Task 7: Logout route

**Files:**
- Create: `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Create `src/app/api/auth/logout/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "feat(auth): add POST /api/auth/logout route"
```

---

## Task 8: Update email/password login route

**Files:**
- Modify: `src/app/api/auth/login/route.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { isAllowedEmail } from "@/lib/auth-google";
import { upsertUser } from "@/lib/db/users.repo";

const MOCK_USERS: Record<string, string> = {
  "admin@57blocks.com": "agentic2024",
  "demo@57blocks.com": "demo1234",
};

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isAllowedEmail(normalizedEmail)) {
      return NextResponse.json(
        { message: "Only @57blocks.com accounts are allowed." },
        { status: 403 },
      );
    }

    const expected = MOCK_USERS[normalizedEmail];
    if (!expected || expected !== password) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    await upsertUser({
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0],
      picture: null,
      google_id: null,
    });

    const token = await signToken(normalizedEmail);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch {
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat(auth): add domain check and user upsert to password login"
```

---

## Task 9: Update login page UI

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Add error reading and Google button**

In `src/app/login/page.tsx`, make the following changes:

**a) Change the import line at the top** from:
```typescript
import { useState, type FormEvent } from "react";
```
to:
```typescript
import { useState, useEffect, type FormEvent } from "react";
```

**b) After the existing state declarations** (`const [error, setError] = useState...`), add:

```typescript
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("error");
    if (e === "domain") setOauthError("Only @57blocks.com accounts are allowed.");
    else if (e === "state") setOauthError("Authentication failed. Please try again.");
    else if (e === "oauth") setOauthError("Google sign-in failed. Please try again.");
  }, []);
```

**c) After the closing `</form>` tag and before the `{/* Hint */}` comment**, add the divider and Google button:

```tsx
          {/* OAuth error */}
          {oauthError && (
            <p className="text-[13px] text-[#ef4444] bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3.5 py-2.5 mt-2">
              {oauthError}
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-px bg-[#e2e8f0]" />
            <span className="text-[12px] text-[#94a3b8] select-none">or</span>
            <div className="flex-1 h-px bg-[#e2e8f0]" />
          </div>

          {/* Google sign-in */}
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2.5 h-11 w-full border border-[#e2e8f0] rounded-lg bg-white hover:bg-[#f8fafc] text-[14px] font-semibold text-[#374151] transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.08-6.08C34.46 3.19 29.53 1 24 1 14.82 1 7.07 6.7 3.91 14.72l7.06 5.49C12.64 14.06 17.88 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.1 24.5c0-1.64-.15-3.22-.42-4.74H24v8.97h12.42c-.54 2.9-2.17 5.36-4.62 7.01l7.05 5.48C43.07 37.26 46.1 31.32 46.1 24.5z"/>
              <path fill="#FBBC05" d="M10.97 28.21A14.6 14.6 0 0 1 9.5 24c0-1.46.25-2.87.69-4.21L3.13 14.3A23.07 23.07 0 0 0 1 24c0 3.68.88 7.16 2.43 10.25l7.54-6.04z"/>
              <path fill="#34A853" d="M24 47c5.52 0 10.15-1.83 13.53-4.96l-7.05-5.48C28.72 38.26 26.47 39 24 39c-6.1 0-11.32-4.54-13.17-10.65l-7.54 6.04C7.12 42.35 14.97 47 24 47z"/>
            </svg>
            Sign in with Google
          </a>
```

- [ ] **Step 2: Remove the old demo hint** (the `{/* Hint */}` paragraph at the bottom showing `admin@agentic.ai / agentic2024`) — it now references a non-existent account. Replace with:

```tsx
          {/* Hint */}
          <p className="mt-6 text-center text-[12px] text-[#94a3b8]">
            Use your <span className="font-mono text-[#475569]">@57blocks.com</span> account
          </p>
```

- [ ] **Step 3: Verify the login page renders correctly**

Start the dev server (`npm run dev`) and open `http://localhost:3000/login`. You should see:
- The existing email/password form
- An "or" divider below it
- A "Sign in with Google" button
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(auth): add Google sign-in button and OAuth error messages to login page"
```

---

## Task 10: Add logout button to AppNav

**Files:**
- Modify: `src/components/AppNav.tsx`

- [ ] **Step 1: Add `useRouter` import if not already present**

At the top of `src/components/AppNav.tsx`, the `useRouter` import is already present (`import { usePathname, useRouter } from "next/navigation"`). No change needed.

- [ ] **Step 2: Add a `handleLogout` function**

Inside the `AppNav` component function body, after the existing `handleNewProject` function, add:

```typescript
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
```

- [ ] **Step 3: Add the logout button to the user profile section**

Find the user profile `<div>` near the bottom of AppNav's return (the one containing the avatar with the hardcoded "A" initial and "57Blocks" / "Senior Architect" text). After the `{!collapsed && (...)}` block that shows the name, add a logout button:

```tsx
          {!collapsed && (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="ml-auto text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
              title="Sign out"
            >
              Sign out
            </button>
          )}
```

The full updated user profile block should look like:

```tsx
        <div className={`border-t border-slate-200 flex items-center ${collapsed ? "justify-center pt-4 px-0" : "gap-3 pt-4.25 pb-2 px-3"}`}>
          <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0 overflow-hidden">
            <div className="w-full h-full bg-linear-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[12px] font-bold text-slate-900 leading-4 truncate">57Blocks</span>
              <span className="text-xs text-slate-600 leading-3.75 truncate">Senior Architect</span>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="ml-auto text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
              title="Sign out"
            >
              Sign out
            </button>
          )}
        </div>
```

- [ ] **Step 4: Verify logout works**

1. Log in via the login page (email/password)
2. Confirm you land on the dashboard
3. Click "Sign out" in the sidebar
4. Confirm you are redirected to `/login`
5. Confirm a direct navigation to `/` redirects back to `/login`

- [ ] **Step 5: Commit**

```bash
git add src/components/AppNav.tsx
git commit -m "feat(auth): add logout button to AppNav sidebar"
```

---

## Task 11: Document environment variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add Google OAuth block to `.env.example`**

Find the `# ── Database ─────────────────────────────────────────────────────────────────` section at the top of `.env.example`. Insert the following block **before** the Database section:

```env
# ── Google OAuth ──────────────────────────────────────────────────────────────
# Installed-app credentials from Google Cloud Console.
# Store the secret ONLY in .env.local — never commit it.
# The client ID is safe to expose; it identifies the app, not a user.
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=      # GOCSPX-... — set in .env.local only

# Override the OAuth redirect URI if your dev server runs on a different port.
# Defaults to http://localhost:3000/api/auth/callback/google
# GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

```

- [ ] **Step 2: Set the real secret in `.env.local`**

```bash
echo "GOOGLE_CLIENT_SECRET=GOCSPX-REDACTED" >> .env.local
echo "GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" >> .env.local
```

Verify `.env.local` is in `.gitignore` (it should already be):
```bash
grep "\.env\.local" .gitignore
```
Expected: `.env.local` appears in the output.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: document Google OAuth env vars in .env.example"
```

---

## Task 12: End-to-end smoke test

No new files. Manual verification of the complete flow.

- [ ] **Step 1: Restart the dev server with credentials**

```bash
npm run dev
```

Confirm it starts on port 3000 with no errors.

- [ ] **Step 2: Test unauthenticated redirect**

Visit `http://localhost:3000/` in a fresh browser tab (or incognito).
Expected: redirects to `http://localhost:3000/login`.

- [ ] **Step 3: Test email/password login with non-57blocks email**

On the login page, enter `test@gmail.com` / `anything`.
Expected: error message "Only @57blocks.com accounts are allowed."

- [ ] **Step 4: Test email/password login with valid credentials**

Enter `admin@57blocks.com` / `agentic2024`.
Expected: redirects to `/` (the dashboard landing page).

- [ ] **Step 5: Test logout**

Click "Sign out" in the sidebar.
Expected: redirects to `/login`.

- [ ] **Step 6: Test Google OAuth flow**

Click "Sign in with Google".
Expected:
- Browser redirects to `accounts.google.com`
- Sign in with a `@57blocks.com` Google account
- Redirects back to `http://localhost:3000/api/auth/callback/google?code=...`
- Lands on the dashboard at `/`

- [ ] **Step 7: Test Google OAuth domain rejection**

Click "Sign in with Google" and sign in with a non-`@57blocks.com` Google account.
Expected: redirects to `/login?error=domain` with message "Only @57blocks.com accounts are allowed."

- [ ] **Step 8: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (no regressions).
