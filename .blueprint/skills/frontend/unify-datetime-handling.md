---
id: unify-datetime-handling
agent: frontend
version: v1
description: "Unify datetime handling — server emits UTC ISO 8601 wire contract + client `<LocalDateTime>` renders + `date-fns-tz` arithmetic + 5 common-bug diagnostic table. Invoke when the user says \"timezone\" / \"date is wrong\" / \"DST\" / \"show local time\" / \"off-by-one date\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - unify datetime handling
      - unify
      - datetime
      - handling
      - designing the wire / db / display contract for date data
      - fixing cross-timezone display issues
      - doing date arithmetic across dst boundaries
      - date input form submission format
      - diagnosing an off-by-one date bug
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"unify-datetime-handling\" engineering skill. That skill applies when: Unify datetime handling — server emits UTC ISO 8601 wire contract + client `<LocalDateTime>` renders + `date-fns-tz` arithmetic + 5 common-bug diagnostic table. Invoke when the user says \"timezone\" / \"date is wrong\" / \"DST\" / \"show local time\" / \"off-by-one date\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

Any project involving timestamp display, date inputs, cross-timezone users, scheduled jobs, etc. **80% of date bugs come from not establishing "wire = UTC, convert on the client" up front.** Lay down the contract and helpers early to avoid the rake.

## Decision tree

1. **What the server stores**: always UTC ISO 8601 (`2025-05-21T03:00:00Z`). DB uses `TIMESTAMPTZ` (Postgres) / `TIMESTAMP WITH TIME ZONE` equivalents.
2. **API wire format**: always UTC ISO 8601. Don't ship epoch numbers (removes one ambiguity).
3. **Client timezone source**: `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser auto) / user preference (settings page, store in cookie). For SSR (to avoid hydration mismatch) → write the cookie so the server can read it too.
4. **Does the arithmetic need DST?**: "add 1 day" / "start of month" / range filter → must use `date-fns-tz` in the user's timezone (so adding 24h in UTC doesn't drift an hour across a DST switch).
5. **Date-only input**: user enters `2025-05-21`. On submit, convert the user's local 00:00:00 to UTC ISO.

## Minimal skeleton

**`<LocalDateTime>`** — client-side timezone render (hydration-safe):

```tsx
'use client';
import { useEffect, useState } from 'react';

type Props = { value: string; format?: Intl.DateTimeFormatOptions };

export function LocalDateTime({ value, format }: Props) {
  // SSR renders ISO to avoid hydration mismatch; client effect switches to local
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(
      new Intl.DateTimeFormat(undefined, format ?? { dateStyle: 'medium', timeStyle: 'short' })
        .format(new Date(value)),
    );
  }, [value, format]);
  return <time dateTime={value}>{text}</time>;
}
```

**`<LocalDateTimeServer>`** (when the user's TZ is in a cookie — no hydration mismatch):

```tsx
import { cookies } from 'next/headers';

export async function LocalDateTimeServer({ value, format }: Props) {
  const tz = (await cookies()).get('tz')?.value ?? 'UTC';
  const text = new Intl.DateTimeFormat('en', { timeZone: tz, ...format }).format(new Date(value));
  return <time dateTime={value}>{text}</time>;
}
```

**Date arithmetic (with DST)** — `date-fns-tz`:

```ts
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { addDays, startOfDay } from 'date-fns';

// User's local midnight → UTC ISO
const userTz = 'America/New_York';
const localMidnight = startOfDay(toZonedTime(new Date(), userTz));
const utcMidnight = fromZonedTime(localMidnight, userTz).toISOString();

// "Add 1 day" done in the user's timezone (doesn't drift across DST)
const tomorrow = fromZonedTime(addDays(toZonedTime(new Date(), userTz), 1), userTz);
```

**Date input form**:

```tsx
// User enters '2025-05-21' — convert to UTC ISO before submit
function onSubmit(dateStr: string) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const utc = fromZonedTime(`${dateStr}T00:00:00`, tz).toISOString();
  submitToApi({ deadline: utc });
}
```

## 5 most common bugs

| Symptom | Root cause | Fix |
|---|---|---|
| Date displayed one day earlier/later than expected | Server extracts the date in UTC and crosses midnight | Extract the date in the user's TZ (`format(date, 'yyyy-MM-dd', { timeZone })`) |
| Date input submits to DB 8 hours earlier | Passing `'2025-05-21'` to `new Date()` parses it as UTC midnight | Use `fromZonedTime` to explicitly convert in the user's TZ |
| "Add 1 day" loses 1 hour across a DST switch | Adding `+86400000ms` in UTC | Use `addDays` + a timezone, don't compute milliseconds |
| SSR date and client hydration disagree | Server in UTC, client in local — rendered text differs | Use the `<LocalDateTime>` pattern (initial state = ISO, swap to local in an effect) |
| "This week" filter spills a day into the previous/next week | "This week" computed in UTC vs in the user's TZ differs | Compute range boundaries via `startOfWeek` / `endOfWeek` in the user's TZ, then convert to UTC |

## Verification checklist

- API responses contain only `Z`-suffixed ISO strings (grep the backend to confirm)
- DB schema uses `TIMESTAMPTZ` (Postgres), not `TIMESTAMP`
- Set the browser timezone to `America/Los_Angeles` — dates render in LA time
- Run a "today + 1 day" unit test on a DST switch day (e.g., 2025-03-09 US east) — result is still local 00:00
- A submitted date input round-trips to the same calendar date (no off-by-one)
- SSR initial render has no hydration mismatch warnings

## Going further

- `Intl.DateTimeFormat` API: <https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat>
- `date-fns-tz` docs: <https://github.com/marnusw/date-fns-tz>
- IANA tz database: <https://www.iana.org/time-zones>
- Temporal API (stabilizing, future `Date` replacement): <https://tc39.es/proposal-temporal/docs/>
- "Falsehoods Programmers Believe About Time": <https://infiniteundo.com/post/25326999628/falsehoods-programmers-believe-about-time>
