---
id: setup-testing-baseline
agent: frontend
version: v1
description: "Build the team's unified testing stack — Vitest + Testing Library + MSW (unit/integration) + Playwright (E2E) + minimal example per layer + coverage thresholds + CI integration. Invoke when the user says \"add unit tests\" / \"set up Vitest\" / \"add E2E\" / \"mock the API\" / \"add coverage\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - setup testing baseline
      - testing
      - baseline
      - standing up the testing stack in a new project
      - choosing the unit / integration / e2e split
      - adding e2e coverage for a critical flow
      - mocking endpoints with msw
      - wiring tests into ci
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"setup-testing-baseline\" engineering skill. That skill applies when: Build the team's unified testing stack — Vitest + Testing Library + MSW (unit/integration) + Playwright (E2E) + minimal example per layer + coverage thresholds + CI integration. Invoke when the user says \"add unit tests\" / \"set up Vitest\" / \"add E2E\" / \"mock the API\" / \"add coverage\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

The third big job in a new project (after lint and the API layer). Without an agreed stack and split, you'll get: "five people picked five different mocking approaches", "all E2E tests cover the happy path so they fly but prod still breaks", "coverage climbs but it's all trivial assertions". This skill lays down a default stack and minimal test shape per layer.

## Decision tree

1. **Testing pyramid ratio**: unit 70% / integration (incl. RTL component) 25% / E2E 5%. E2E is slow + brittle — reserve it for critical user journeys (login, checkout, place order).
2. **Where to use MSW**: unit/integration (recommended) + E2E (optional, for complex third-party APIs). Reusing the same handlers everywhere is MSW's biggest win.
3. **Component tests**: use Testing Library (focus on user behavior, not implementation details).
4. **E2E framework**: Playwright (default — native multi-browser support); Cypress is fine if you only need Chrome.
5. **Coverage threshold**: start at 60% (lines + branches), ratchet up to 75%; don't chase 100% (diminishing returns + encourages trivial tests).
6. **What runs in CI**: each PR runs unit + integration + critical E2E specs; nightly runs the full E2E suite.

## Minimal skeleton

**Install**:

```bash
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D msw @mswjs/data
pnpm add -D @playwright/test
pnpm dlx playwright install --with-deps chromium
```

**`vitest.config.ts`**:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 60, branches: 60, functions: 60, statements: 60 },
      exclude: ['**/*.config.*', '**/*.d.ts', 'tests/**'],
    },
  },
});
```

**`tests/setup.ts`** — global test bootstrap + MSW server:

```ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**`tests/msw-handlers.ts`**:

```ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Jane Doe' }),
  ),
];
```

**Component test example** `src/components/UserCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserCard } from './UserCard';

test('clicking expand shows details', async () => {
  render(<UserCard name="Jane Doe" />);
  await userEvent.click(screen.getByRole('button', { name: /expand/i }));
  expect(screen.getByText('Details')).toBeInTheDocument();
});
```

**`playwright.config.ts`**:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: { command: 'pnpm build && pnpm start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
});
```

**E2E spec example** `e2e/login.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('user can log in and reach the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL('/dashboard');
});
```

**`package.json` scripts**:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

## Verification checklist

- `pnpm test` runs all unit + integration tests, exits 0
- `pnpm test:coverage` produces a coverage report and meets thresholds
- `pnpm test:e2e` runs the login spec (auto-starts the dev server locally)
- MSW fails on unregistered requests (`onUnhandledRequest: 'error'`) — no silent missed mocks
- Deliberately delete a button label — the corresponding RTL test fails (assertion is on visible text)
- CI workflow marks the test job as a required check

## Going further

- Testing Library query priority (`getByRole` > `getByLabelText` > ...): <https://testing-library.com/docs/queries/about/#priority>
- MSW 2.x docs: <https://mswjs.io/docs/>
- Playwright best practices (auto-waiting / locators): <https://playwright.dev/docs/best-practices>
- Vitest config reference: <https://vitest.dev/config/>
- The classic "don't test implementation details": <https://kentcdodds.com/blog/testing-implementation-details>
