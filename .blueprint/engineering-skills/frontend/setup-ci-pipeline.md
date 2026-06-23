---
id: setup-ci-pipeline
agent: frontend
version: v1
description: "Set up a GitHub Actions PR pipeline — lint / typecheck / test / build in four parallel steps + pnpm cache + branch protection + build artifact reused by E2E. Invoke when the user says \"add CI\" / \"configure GH Actions\" / \"run tests on PRs\" / \"add branch protection\" / \"add PR checks\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - setup ci pipeline
      - pipeline
      - adding a ci workflow to a new project
      - wiring typecheck / lint / test into pr checks
      - configuring pnpm / cache to speed up ci
      - setting branch protection rules
      - reusing a build artifact for e2e
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"setup-ci-pipeline\" engineering skill. That skill applies when: Set up a GitHub Actions PR pipeline — lint / typecheck / test / build in four parallel steps + pnpm cache + branch protection + build artifact reused by E2E. Invoke when the user says \"add CI\" / \"configure GH Actions\" / \"run tests on PRs\" / \"add branch protection\" / \"add PR checks\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

The second big job in a new project (after lint, before E2E). Without a red line CI, you don't really have CI — people will forget `pnpm typecheck`, "works locally" will fail CI, and `main` will go broken from time to time. This skill provides a working workflow you can drop in.

## Decision tree

1. **Triggers**: `pull_request` against `main` + `push` to `main` (keeps main healthy). Don't run on every feature push (saves CI minutes).
2. **Monorepo or single app?**: monorepo → add `turbo` cache + `paths-filter` to skip unchanged packages. Single app → a simple workflow is enough.
3. **Where does E2E run?**: PRs run the critical specs (< 3 min), nightly runs the full suite (< 30 min).
4. **Required checks**: lint + typecheck + test + build are all required; E2E can be non-required (so a single flaky run doesn't block merging).
5. **Build artifact reuse**: the build job produces an artifact and the E2E job downloads it to start, avoiding a duplicate build.

## Minimal skeleton

**`.github/workflows/ci.yml`**:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage

  build:
    needs: [lint, typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('**/*.{ts,tsx,js,jsx}') }}
          restore-keys: nextjs-${{ hashFiles('pnpm-lock.yaml') }}-
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: { name: build, path: .next/, retention-days: 1 }
```

E2E reusing the build artifact (PR use — append job or separate workflow):

```yaml
  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: build, path: .next/ }
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx playwright install --with-deps chromium
      - run: pnpm test:e2e
```

## Branch protection settings

GitHub repo Settings → Branches → Add rule for `main`:

- ☑ Require a pull request before merging
- ☑ Require approvals: 1
- ☑ Require status checks to pass: select `lint` / `typecheck` / `test` / `build`
- ☑ Require branches to be up to date before merging
- ☐ E2E (optional — leave off when flaky so it doesn't block merges)

## Verification checklist

- Submit a deliberately failing PR (e.g., add an `any` to trigger lint), CI goes red + blocks merge
- First run takes ~5 min; second run (pnpm + Next.js cache hit) takes < 2 min
- `concurrency.cancel-in-progress` ensures consecutive pushes only run the latest commit (saves minutes)
- The build artifact downloads cleanly in the E2E job — no need to rerun `pnpm build`
- `main` is protected: direct pushes are rejected

## Going further

- GitHub Actions trigger matrix: <https://docs.github.com/actions/using-workflows/events-that-trigger-workflows>
- pnpm action-setup (v4 with cache): <https://github.com/pnpm/action-setup>
- Next.js CI cache speedups: <https://nextjs.org/docs/app/api-reference/file-conventions/incremental-cache#self-hosted>
- Turborepo CI cache (monorepo): <https://turbo.build/repo/docs/crafting-your-repository/caching>
- Playwright on GH Actions best practices: <https://playwright.dev/docs/ci-intro>
