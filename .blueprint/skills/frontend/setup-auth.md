---
id: setup-auth
agent: frontend
version: v1
description: "Set up application auth — provider selection (Auth.js / Clerk / self-issued cookie) + middleware interception + per-page re-check + RBAC role gates + cookie forwarding to an external backend. Invoke when the user says \"build login\" / \"add auth\" / \"protect routes\" / \"add roles\" / \"add SSO\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - setup auth
      - auth
      - adding identity authentication to a new project
      - protecting routes \(middleware \+ page-level double check\)
      - wiring role / permission control \(rbac\)
      - integrating an external auth backend \(cookie forwarding\)
      - choosing auth\.js vs clerk vs self-built
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"setup-auth\" engineering skill. That skill applies when: Set up application auth — provider selection (Auth.js / Clerk / self-issued cookie) + middleware interception + per-page re-check + RBAC role gates + cookie forwarding to an external backend. Invoke when the user says \"build login\" / \"add auth\" / \"protect routes\" / \"add roles\" / \"add SSO\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

Any one of: "log in / know who the current user is / some pages require login / some actions are role-gated". Auth is a security red line — it must have **two layers**: middleware rejects unauthenticated requests at the edge, and pages / Server Actions re-check session inside (in case middleware is bypassed or a new page forgets to add the rule).

## Decision tree

1. **Provider choice**:

| Scenario | Recommended |
|---|---|
| Self-hosted backend, want full session control | Self-issued cookie + middleware (most flexibility) |
| Want the fastest path with budget to spare | Clerk (out-of-the-box UI + session) |
| Open source + self-hosted + multi-provider | Auth.js (NextAuth) |

2. **Where to store the session**: **always an httpOnly cookie**. Never localStorage (XSS empties the wallet).
3. **Middleware vs page check**: **both** (defense in depth). Middleware gives edge rejection (fast, unauthenticated never reaches the app); page-level gives real session verification (cookies can be forged).
4. **RBAC model**: role on the session (refreshed at login) or role fetched on demand (when it changes often). Small teams use the former.
5. **External backend**: the frontend only carries the cookie issued by the backend (`HttpOnly + SameSite=Lax + Secure`); every request uses `credentials: 'include'` and the frontend never parses the token.

## Minimal skeleton

**Provider decision matrix**:

| Dimension | Self-issued cookie | Auth.js | Clerk |
|---|---|---|---|
| Time to set up | High (you write it) | Medium | Low |
| Multi-provider (Google / GitHub) | DIY | Built-in | Built-in |
| UI components | DIY | DIY | Provided |
| Price | Free | Free | Per MAU |

**`middleware.ts`** — edge interception:

```ts
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/settings', '/admin'];

export function middleware(req: NextRequest) {
  const session = req.cookies.get('session')?.value;
  const path = req.nextUrl.pathname;

  if (PROTECTED.some((p) => path.startsWith(p)) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
```

**`src/lib/session.ts`** — page-level re-check:

```ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { http } from './http';

export type Session = { userId: string; email: string; role: 'admin' | 'user' };

export async function getSession(): Promise<Session | null> {
  const sid = (await cookies()).get('session')?.value;
  if (!sid) return null;
  try {
    return await http<Session>('/api/me', { headers: { cookie: `session=${sid}` } });
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/login');
  return s;
}
```

**Page usage**:

```tsx
// app/dashboard/page.tsx
import { requireSession } from '@/lib/session';

export default async function Dashboard() {
  const session = await requireSession();
  return <h1>Welcome {session.email}</h1>;
}
```

**RBAC `<RequireRole>` component**:

```tsx
import { requireSession } from '@/lib/session';
import { notFound } from 'next/navigation';

export async function RequireRole({
  role,
  children,
}: { role: 'admin'; children: React.ReactNode }) {
  const s = await requireSession();
  if (s.role !== role) notFound();
  return children;
}
```

## Verification checklist

- Visiting `/dashboard` while logged out redirects to `/login?next=/dashboard`
- After login the cookie is `HttpOnly` + `Secure` (in prod) + `SameSite=Lax`
- Tamper with the cookie in DevTools → middleware lets it through, but `requireSession()` fails and redirects (both layers work)
- A non-admin visiting `/admin` triggers `notFound()` (404, not 500)
- Log out, then use the browser back button to a protected page — should redirect to login again (cookie is gone)
- Deliberately remove a `requireSession()` call from one page — middleware still gates it, but the page has a latent hole (catch this in PR review)

## Going further

- Auth.js (NextAuth v5) docs: <https://authjs.dev/>
- Clerk Next.js integration: <https://clerk.com/docs/quickstarts/nextjs>
- Lucia Auth (lightweight self-issued sessions): <https://lucia-auth.com/>
- HttpOnly cookie best practices: <https://owasp.org/www-community/HttpOnly>
- OAuth 2.1 / OIDC intro: <https://www.oauth.com/>
- RBAC vs ABAC: <https://csrc.nist.gov/projects/role-based-access-control>
