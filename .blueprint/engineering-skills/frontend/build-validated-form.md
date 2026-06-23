---
id: build-validated-form
agent: frontend
version: v1
description: "Build a validated form — Zod schema + React Hook Form resolver + 3-layer validation (form / action / route) + file upload with presigned URLs. Invoke when the user says \"build a form\" / \"add form validation\" / \"user input\" / \"file upload\" / \"build a signup page\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - build validated form
      - validated
      - form
      - designing a new form
      - adding validation \(client \+ server consistent\)
      - wiring rhf to zod
      - implementing file upload \(multipart / presigned url\)
      - handling the four form states \(idle / submitting / error / success\)
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"build-validated-form\" engineering skill. That skill applies when: Build a validated form — Zod schema + React Hook Form resolver + 3-layer validation (form / action / route) + file upload with presigned URLs. Invoke when the user says \"build a form\" / \"add form validation\" / \"user input\" / \"file upload\" / \"build a signup page\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

Any form with ≥ 3 fields that needs validation and submits to a backend. Reuse one Zod schema across client (instant feedback) + Server Action (submit validation) + API route (final validation) — three layers guard against any single one being bypassed.

## Decision tree

1. **Complexity**: < 5 fields, no dynamic fields → native `<form>` + `FormData` + Server Action is enough; ≥ 5 fields or needs instant validation → RHF + Zod.
2. **Submission**: Next.js App Router → prefer Server Action (no need to build an API route, call the server directly). Third-party backend → API route as proxy.
3. **Error feedback**: field-level errors inline (red text + `aria-invalid`), form-wide error in a top alert.
4. **File upload**:

| File size | Approach |
|---|---|
| < 4 MB | multipart direct to Server Action |
| ≥ 4 MB or images / videos | S3 presigned URL (client uploads directly to S3, no Vercel function bandwidth used) |

5. **Optimistic update**: only in scenarios that tolerate occasional rollback (e.g., comments); don't use it for money / critical state.

## Minimal skeleton

**`src/lib/schemas/profile.ts`** — shared Zod schema:

```ts
import { z } from 'zod';

export const profileSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'At least 2 characters').max(50),
  age: z.coerce.number().int().min(13).max(120),
});

export type ProfileInput = z.infer<typeof profileSchema>;
```

**Client component — RHF + Zod**:

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileInput } from '@/lib/schemas/profile';
import { updateProfile } from './actions';
import { useState } from 'react';

export function ProfileForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });

  async function onSubmit(data: ProfileInput) {
    setServerError(null);
    const result = await updateProfile(data);
    if (!result.ok) setServerError(result.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError && <div role="alert">{serverError}</div>}

      <label htmlFor="email">Email</label>
      <input id="email" {...register('email')} aria-invalid={!!errors.email} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <label htmlFor="name">Name</label>
      <input id="name" {...register('name')} aria-invalid={!!errors.name} />
      {errors.name && <p role="alert">{errors.name.message}</p>}

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Save'}
      </button>
    </form>
  );
}
```

**Server Action — re-parse on the server (prevents bypass)**:

```ts
'use server';
import { profileSchema } from '@/lib/schemas/profile';
import type { ActionResult } from '@/lib/action-result';

export async function updateProfile(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'validation_failed', message: 'Invalid input',
             fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string> };
  }
  // ... write to DB
  return { ok: true, data: { id: 'xxx' } };
}
```

**File upload — presigned URL flow**:

```tsx
// 1. Client requests presigned URL
const { url, fields } = await http<{ url: string; fields: Record<string, string> }>(
  '/api/upload/presign', { method: 'POST', body: JSON.stringify({ filename: file.name }) });

// 2. Client uploads to S3 directly (bypassing the app server)
const fd = new FormData();
Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
fd.append('file', file);
await fetch(url, { method: 'POST', body: fd });

// 3. Client notifies the server that the file is uploaded (server persists the key to DB)
await http('/api/upload/complete', { method: 'POST', body: JSON.stringify({ key: fields.key }) });
```

## Verification checklist

- Enter a wrong-format email — inline error appears before submit (client validation)
- Hit the Server Action directly via curl, bypassing the client — server still rejects (`safeParse` works)
- During submit the button is disabled + `aria-busy="true"` (prevents double-click + a11y)
- Server errors (`{ ok: false }`) render in the top alert, not thrown to error.tsx
- Required fields have `<label>` associated to `<input>` (clicking the label focuses the input)
- Large file uploads bypass the Vercel function (Network panel shows origin s3.amazonaws.com)

## Going further

- React Hook Form docs: <https://react-hook-form.com/>
- Zod docs: <https://zod.dev/>
- `@hookform/resolvers`: <https://github.com/react-hook-form/resolvers>
- Next.js Server Actions: <https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations>
- S3 presigned POST: <https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html>
- Form accessibility (error association): <https://www.w3.org/WAI/tutorials/forms/notifications/>
