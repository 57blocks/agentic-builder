---
id: optimize-performance
agent: frontend
version: v1
description: "Diagnose and fix frontend performance problems — symptom triage (navigation / interaction / jank / bundle) → tool selection → fix → measure. Invoke when the user says \"page is slow\" / \"Web Vitals are bad\" / \"bundle is too big\" / \"feels janky\" / \"LCP regressing\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - optimize performance
      - optimize
      - performance
      - lcp / inp / cls missing targets
      - js bundle is too large and needs trimming
      - a component janks / stutters
      - choosing react 19 performance primitives \(usetransition / usedeferredvalue\)
      - lighthouse / rum scores declining
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"optimize-performance\" engineering skill. That skill applies when: Diagnose and fix frontend performance problems — symptom triage (navigation / interaction / jank / bundle) → tool selection → fix → measure. Invoke when the user says \"page is slow\" / \"Web Vitals are bad\" / \"bundle is too big\" / \"feels janky\" / \"LCP regressing\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

Only tune when there's a concrete symptom ("feels slow" doesn't count): Lighthouse goes red, RUM alerts, user complaints, bundle exceeds threshold. **Don't optimize preemptively** — most `useMemo` / `useCallback` is wasted cognitive overhead.

## Decision tree (symptom-routed)

| Symptom | Tool | Fix direction |
|---|---|---|
| Slow first paint (LCP > 2.5s) | Lighthouse + WebPageTest + RUM | Shrink CSR JS, use RSC / Suspense streaming, preload critical assets |
| Sluggish interaction (INP > 200ms) | Chrome Performance tab | Use `useTransition` to deprioritize updates; split long tasks |
| Scroll / animation jank | Chrome Performance + Layers tab | Avoid layout thrashing; use `transform`/`opacity` instead of `top`/`width`; virtualize large lists |
| Oversized bundle | `@next/bundle-analyzer` / source-map-explorer | Break barrels, dynamic import, tree-shake, remove heavy deps |
| Slow hydration | React profiler + Lighthouse | Shrink client component scope, use RSC, defer non-critical client islands |
| Too many re-renders | React DevTools profiler | Lift inline objects / functions; React.memo + useMemo; use store selectors |

## Workflow (4 steps)

1. **Measure** — get data, not hunches. Lighthouse locally (mobile preset + throttling) + RUM in prod (e.g., Vercel Speed Insights). Record the current numbers.
2. **Identify** — read the trace and find the bottleneck: which long task, which render is too frequent, which chunk is too big. **No shotgun optimization.**
3. **Fix** — change one thing on purpose.
4. **Re-measure** — verify the fix worked (compare before/after). If not, revert and find the next thing.

## Minimal skeleton

**Install bundle analyzer**:

```bash
pnpm add -D @next/bundle-analyzer
```

```ts
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';
const withAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default withAnalyzer({ /* config */ });
```

```bash
ANALYZE=true pnpm build  # opens a chunk-composition report in the browser
```

**`useTransition` — deprioritize expensive updates as interruptible**:

```tsx
'use client';
import { useState, useTransition } from 'react';

function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q); // input updates immediately (urgent)
    startTransition(() => {
      // Expensive filter deprioritized as interruptible (non-urgent)
      setResults(filterExpensive(allItems, q));
    });
  }

  return (
    <>
      <input value={query} onChange={onChange} />
      {isPending && <Spinner />}
      <ResultList items={results} />
    </>
  );
}
```

**Dynamic import — trim first-paint bundle**:

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // only if you truly don't need SSR
});
```

**Next.js `<Image>` — CLS protection + auto srcset**:

```tsx
import Image from 'next/image';

<Image src="/hero.jpg" alt="" width={1200} height={600} priority />
```

## Web Vitals targets (mobile, 3G throttling)

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP | < 2.5s | < 4s | ≥ 4s |
| INP | < 200ms | < 500ms | ≥ 500ms |
| CLS | < 0.1 | < 0.25 | ≥ 0.25 |

## Verification checklist

- After the fix, run Lighthouse (mobile preset + applied throttling) — the score has a measurable improvement
- `ANALYZE=true pnpm build` shows client bundle main entry < 200 KB gzip (a reasonable threshold)
- React DevTools Profiler shows lower commit duration on the same interaction
- 24h later, RUM 75th percentile has improved (don't just trust local numbers)
- You didn't touch the same code in three places (a signal of shotgun optimization)

## Going further

- Web Vitals docs: <https://web.dev/vitals/>
- Chrome Performance recording guide: <https://developer.chrome.com/docs/devtools/performance/>
- React performance patterns: <https://react.dev/learn/render-and-commit>
- Next.js optimization checklist: <https://nextjs.org/docs/app/building-your-application/optimizing>
- React Compiler (auto-memo, experimental): <https://react.dev/learn/react-compiler>
- "When to useMemo and useCallback" by Kent C. Dodds: <https://kentcdodds.com/blog/usememo-and-usecallback>
