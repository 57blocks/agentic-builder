---
id: setup-i18n
agent: frontend
version: v1
description: "Internationalize a Next.js App Router app — next-intl routing + messages file structure + Server/Client component reads + RTL + add-a-locale checklist. Invoke when the user says \"add multi-language\" / \"set up i18n\" / \"add a locale\" / \"internationalize\" / \"support RTL\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - setup i18n
      - i18n
      - adding i18n to a project
      - adding a new locale
      - configuring rtl layout
      - designing message-file granularity
      - adding translations for a namespace
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"setup-i18n\" engineering skill. That skill applies when: Internationalize a Next.js App Router app — next-intl routing + messages file structure + Server/Client component reads + RTL + add-a-locale checklist. Invoke when the user says \"add multi-language\" / \"set up i18n\" / \"add a locale\" / \"internationalize\" / \"support RTL\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

A new project being internationalized for the first time, or adding a new language to an existing project. Setting this up early is much cheaper than retrofitting — retrofitting means scanning every hardcoded string in the codebase.

## Decision tree

1. **Routing strategy**: subpath (`/en/about`, `/zh/about` — recommended, SEO friendly) / domain (`en.example.com` — multi-region) / cookie-only (no URL signal, for personalization-only).
2. **Server vs Client**: Server components use `getTranslations()`; client components use `useTranslations()`. Render on the server when possible to shrink the JS bundle.
3. **Message file granularity**: split by namespace (`Common.json` / `Auth.json` / `Dashboard.json`) — not monolithic. Enables per-page lazy loading.
4. **RTL needs**: Arabic / Hebrew support → `<html dir={locale === 'ar' ? 'rtl' : 'ltr'}>`. Use Tailwind's `rtl:` / `ltr:` modifiers.
5. **Type-safe message keys**: enable the next-intl TS plugin so missing / wrong keys are compile-time errors.

## Minimal skeleton

**Install**:

```bash
pnpm add next-intl
```

**`src/i18n/routing.ts`**:

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
```

**`src/i18n/request.ts`** — Server Component entry:

```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'en')) locale = routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

**`middleware.ts`**:

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
```

**`app/[locale]/layout.tsx`**:

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = await getMessages();
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**`messages/en.json`**:

```json
{
  "Common": { "save": "Save", "cancel": "Cancel" },
  "Dashboard": {
    "greeting": "Hello, {name}!",
    "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
  }
}
```

**Server Component usage**:

```tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('Dashboard');
  return <h1>{t('greeting', { name: 'Jane' })}</h1>;
}
```

**Client Component usage**:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function SaveButton() {
  const t = useTranslations('Common');
  return <button>{t('save')}</button>;
}
```

## Add-a-locale 5-step checklist

1. Add the locale code to the `locales` array in `routing.ts`
2. Create `messages/<locale>.json`, copy the structure from `en.json`, translate the values
3. If it's an RTL language, add it to the `dir` check in `layout.tsx`
4. Run `pnpm typecheck` — the TS plugin will flag missing / extra keys
5. Add a Playwright spec for the new locale (at least confirm `/<locale>/` renders)

## Verification checklist

- `/en/about` and `/zh/about` render correctly when visited directly
- Visiting the root path with browser language `zh` redirects to `/zh/`
- A missing key in `messages/zh.json` becomes a TS compile error (with the plugin enabled); otherwise it falls back to the default locale without crashing
- `<html lang>` matches the URL locale; Arabic gets `dir="rtl"`
- Bundle analyzer shows client locale files lazy-loaded, not packed into the main chunk

## Going further

- next-intl docs: <https://next-intl.dev/>
- ICU MessageFormat syntax (plural / select): <https://formatjs.io/docs/core-concepts/icu-syntax/>
- TypeScript plugin (key safety): <https://next-intl.dev/docs/workflows/typescript>
- RTL with Tailwind: <https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support>
- Translation management platforms (recommended at team size > 5): Crowdin / Lokalise / Tolgee
