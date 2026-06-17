---
id: setup-env-and-secrets
agent: frontend
version: v1
description: "Build the team's unified environment-variable layer — Zod schema validation + explicit server-only vs `NEXT_PUBLIC_*` split + a single typed entry point `env.ts` + a maintained `.env.example`. Invoke when the user says \"add env vars\" / \"configure .env\" / \"how do I use `NEXT_PUBLIC`\" / \"validate env\" / \"prevent secret leaks\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - setup env and secrets
      - env
      - secrets
      - setting up the env-variable entry point in a new project
      - splitting server-only from client-public env \(to keep secrets out of the client bundle\)
      - adding zod types \+ startup validation for env
      - switching between environments \(local / staging / prod\)
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"setup-env-and-secrets\" engineering skill. That skill applies when: Build the team's unified environment-variable layer — Zod schema validation + explicit server-only vs `NEXT_PUBLIC_*` split + a single typed entry point `env.ts` + a maintained `.env.example`. Invoke when the user says \"add env vars\" / \"configure .env\" / \"how do I use `NEXT_PUBLIC`\" / \"validate env\" / \"prevent secret leaks\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

Any project that has API keys, database URLs, third-party client IDs, or any other environment-specific config. Without this layer you'll hit three classic mistakes:

- A secret leaks into the client bundle (`process.env.STRIPE_SECRET_KEY` read in a client component ends up shipped to the browser)
- A missing env var goes unnoticed at boot and crashes mid-request
- Every teammate's local `.env` drifts and has to be reconciled by hand

## Decision tree

1. **Next.js?**: yes → use `@t3-oss/env-nextjs` (enforces server-only fields automatically). No → wrap `process.env` with Zod yourself.
2. **Does the client need it?**: yes → it must be prefixed `NEXT_PUBLIC_` and declared in the `client:` schema. No → put it in `server:` only and it's automatically isolated.
3. **Multiple environments**: use `.env.local` (local, gitignored) + `.env.staging` / `.env.production` (CI-injected, gitignored) + `.env.example` (git-tracked, empty or placeholder values).
4. **Startup validation**: `import './env'` once at the top of `next.config.ts` or `instrumentation.ts` so missing fields fail at boot.

## Minimal skeleton

**`src/env.ts`** (@t3-oss/env-nextjs):

```ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    SENTRY_DSN: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  },
  // Next.js App Router requires explicit runtimeEnv (build-time injection)
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  },
  emptyStringAsUndefined: true,
});
```

**Usage**:

```ts
import { env } from '@/env';

// server file
const db = createClient(env.DATABASE_URL);

// client file (env.STRIPE_SECRET_KEY here is a TypeScript error + throws at runtime)
const url = env.NEXT_PUBLIC_APP_URL;
```

**`.env.example`** (git-tracked, placeholders only):

```bash
# Server-only
DATABASE_URL=postgresql://user:pass@localhost:5432/dev
STRIPE_SECRET_KEY=sk_test_xxx
SENTRY_DSN=

# Client-public (NEXT_PUBLIC_* prefix)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=
```

**`next.config.ts` — one line at the top** (triggers validation at boot):

```ts
import './src/env';
```

## Verification checklist

- Deliberately remove a server env, run `pnpm dev` — it should fail at startup (not on first request)
- Try to read `env.STRIPE_SECRET_KEY` from a client component — should be a TypeScript error
- `pnpm build` validates too (CI catches it)
- `.env.local` is in `.gitignore`; `.env.example` is committed
- Run `pnpm dlx @next/bundle-analyzer build` and search the client bundle — no server secrets present

## Going further

- t3-env docs: <https://env.t3.gg/>
- Next.js env var layering (dev / production / local): <https://nextjs.org/docs/app/building-your-application/configuring/environment-variables>
- Doppler / Vercel env central management (recommended at team size > 5): <https://docs.doppler.com/docs/start>
- Secret scanning (pre-commit): <https://github.com/gitleaks/gitleaks>
