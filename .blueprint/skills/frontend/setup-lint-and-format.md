---
id: setup-lint-and-format
agent: frontend
version: v1
description: "Install the team's baseline tooling — ESLint flat config + Prettier + TS strict trio + required npm scripts + `.gitignore`. Invoke when the user says \"unify code style\" / \"set up ESLint\" / \"configure Prettier\" / \"bootstrap tooling\" / \"add lint\"."
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - setup lint and format
      - lint
      - format
      - bootstrapping a new project's tooling
      - aligning an existing project to the team's lint / format / typecheck baseline
      - installing eslint flat config / prettier / ts strict
      - standardizing npm scripts \(lint / typecheck / format / test / build\)
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"setup-lint-and-format\" engineering skill. That skill applies when: Install the team's baseline tooling — ESLint flat config + Prettier + TS strict trio + required npm scripts + `.gitignore`. Invoke when the user says \"unify code style\" / \"set up ESLint\" / \"configure Prettier\" / \"bootstrap tooling\" / \"add lint\". Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

## When you need this

When bootstrapping a new project or aligning an existing one to the team baseline. Once installed, everyone on the team produces code with consistent formatting, naming, import order, and TS strictness, and CI blocks anything that drifts. This layer is a prerequisite for the other engineering tasks (CI, tests, production build).

## Decision tree

1. **Package manager**: pnpm (recommended — monorepo + symlink friendly) / npm / bun. Swap `pnpm` for the equivalent command in scripts as needed.
2. **Tailwind enabled?**: yes → also install `prettier-plugin-tailwindcss` (consistent className ordering).
3. **Monorepo?**: yes → put `eslint.config.mjs` + `tsconfig.base.json` at the root and extend from sub-packages.
4. **TS strictness**: default-on the trio (`strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`); the first two are critical, the third helps codebases with deep inheritance.

## Minimal skeleton

**`package.json` scripts**:

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "build": "next build"
  }
}
```

**`tsconfig.json` required fields**:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "moduleResolution": "Bundler",
    "isolatedModules": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**`eslint.config.mjs` minimal working setup** (Next.js + TS + a11y):

```js
import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';
import a11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'dist/**'] },
  ...tseslint.configs.recommendedTypeChecked,
  next,
  a11y.flatConfigs.recommended,
  {
    languageOptions: {
      parserOptions: { project: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'react/jsx-no-target-blank': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
);
```

**`.prettierrc`**:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Drop the `plugins` line in non-Tailwind projects.

**`.gitignore` required entries**:

```
node_modules/
.next/
dist/
coverage/
*.log
.env*.local
.DS_Store
```

## Verification checklist

- `pnpm lint` passes with zero errors and zero warnings (`--max-warnings=0` makes warnings a hard fail)
- `pnpm typecheck` exits 0
- `pnpm format:check` exits 0 (used in CI); locally run `pnpm format` to write
- Deliberately write an `any` or a `<a target="_blank">` without rel — confirm lint errors
- Saving a `.tsx` file in the IDE auto-formats via Prettier and auto-fixes via ESLint (VS Code: `editor.formatOnSave` + ESLint extension)

## Going further

- ESLint flat config docs: <https://eslint.org/docs/latest/use/configure/configuration-files>
- typescript-eslint type-checked rules: <https://typescript-eslint.io/getting-started/typed-linting>
- TS strictness flags overview: <https://www.typescriptlang.org/tsconfig#Strict_Type_Checking_Options_6173>
- Prettier plugin ecosystem: <https://prettier.io/docs/en/plugins.html>
- Husky + lint-staged (git hook gating, optional): <https://typicode.github.io/husky/>
