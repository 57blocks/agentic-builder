---
id: setup-api-and-error-layer
agent: frontend
version: v1
description: "Build the team's unified \"request + error handling\" stack — `HttpError` class + `http<T>()` wrapper (with timeout/cancel/credentials) + TanStack Query key factory + ErrorBoundary placement rules + `ActionResult<T>` union type + Sentry init. Invoke when the user says \"wrap fetch\" / \"add error handling\" / \"wire Sentry\" / \"unify fetch\" / \"add timeout and retry\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - setup api and error layer
      - api
      - error
      - layer
      - building the api layer \+ error fallback for a new project \(do them together\)
      - centralizing scattered `fetch` calls into one wrapper
      - adding timeout / cancel / retry to network requests
      - defining a tanstack query key factory
      - designing the errorboundary tree \(route / feature / widget boundaries\)
      - wiring sentry monitoring
      - unifying server action return shape
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"setup-api-and-error-layer\" engineering skill. That skill applies when: Build the team's unified \"request + error handling\" stack — `HttpError` class + `http<T>()` wrapper (with timeout/cancel/credentials) + TanStack Query key factory + ErrorBoundary placement rules + `ActionResult<T>` union type + Sentry init. Invoke when the user says \"wrap fetch\" / \"add error handling\" / \"wire Sentry\" / \"unify fetch\" / \"add timeout and retry\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

The first big job in a new project. `HttpError` spans client (`http()`) and boundary (`ErrorBoundary` / `ActionResult`): from the moment an error returns from the network, through throw / catch / render / report, it stays the same shape — that's the only way error handling stays consistent. Build them separately and you end up with "the http layer throws `Error`, the UI catches it but can't tell 4xx from 5xx."

## Decision tree

1. **Auth method**: cookie session (recommended for SaaS, `credentials: 'include'`) / bearer token (recommended for third-party APIs — inject header from a store).
2. **Need a cache layer?**: list / detail pages → TanStack Query; pure RSC fetch → no.
3. **Retry policy**: default 3 retries (exponential backoff) for idempotent GETs; **no** auto-retry for non-idempotent (POST / PUT / DELETE).
4. **Error rendering mode**: expected errors (4xx validation) → render inline; unexpected (5xx / network) → throw to ErrorBoundary + report to Sentry.
5. **Server Action return**: always return `ActionResult<T>` union — **don't throw** (a throw triggers full-screen `error.tsx`).
6. **Sentry init location**: Next.js uses `instrumentation.ts` (server + edge) + `sentry.client.config.ts` (client).

## Minimal skeleton

**`src/lib/http.ts`** — unified request layer:

```ts
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public data: unknown,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = 'HttpError';
  }
}

type HttpOptions = RequestInit & { timeoutMs?: number };

export async function http<T>(input: string, opts: HttpOptions = {}): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...rest,
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...headers },
      signal: opts.signal ?? ctrl.signal,
    });
    const body = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    if (!res.ok) {
      throw new HttpError(res.status, body?.code ?? 'http_error', body, body?.message);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}
```

**`src/lib/query-keys.ts`** — TanStack Query key factory:

```ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    list: (filters?: { role?: string }) => ['users', 'list', filters] as const,
  },
};
// invalidate usage: queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
```

**`src/lib/action-result.ts`** — unified Server Action return shape:

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };
```

**`app/error.tsx`** + **`app/global-error.tsx`** — route-level + global fallback:

```tsx
// app/error.tsx (per-route fallback)
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <p>Failed to load: {error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

**ErrorBoundary placement tree**:

```
RootLayout (app/layout.tsx)
├── global-error.tsx                  ← outermost fallback (catches every throw)
└── Route segment (app/<page>/...)
    ├── error.tsx                     ← route error (segment reset)
    └── <ErrorBoundary> feature       ← feature boundary (independently crashable module)
        └── <ErrorBoundary> widget    ← widget boundary (e.g. third-party embed)
```

**`instrumentation.ts`** — Sentry init:

```ts
import * as Sentry from '@sentry/nextjs';

export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Scrub: strip the user object down to just the id
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
}
```

## Verification checklist

- 4xx responses return a typed `HttpError` (with `status` / `code` / `data`); callers can branch on `instanceof HttpError`
- Network outage / 15s timeout triggers `AbortError` and doesn't hang forever
- In-flight requests are cancelled when the component unmounts (watch Network tab — pending requests become cancelled)
- A deliberate `throw new Error()` inside a page is caught by the route `error.tsx`, not bubbled to `global-error.tsx`
- Sentry dashboard receives events with the release tag and no PII
- Server Action `{ ok: false, ... }` renders inline, not as a 500 page

## Going further

- TanStack Query error handling + retry policy: <https://tanstack.com/query/latest/docs/framework/react/guides/query-retries>
- Next.js error handling model: <https://nextjs.org/docs/app/building-your-application/routing/error-handling>
- `unstable_rethrow` (so `notFound()` / `redirect()` aren't swallowed by catch): <https://nextjs.org/docs/app/api-reference/functions/unstable_rethrow>
- Sentry Next.js integration: <https://docs.sentry.io/platforms/javascript/guides/nextjs/>
- Sentry data scrubbing / PII config: <https://docs.sentry.io/data-management/sensitive-data/>
