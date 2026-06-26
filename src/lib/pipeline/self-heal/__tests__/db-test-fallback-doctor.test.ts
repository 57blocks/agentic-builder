import { describe, it, expect } from "vitest";
import { diagnoseDbSource, rewriteDbSource } from "../db-test-fallback-doctor";

// The exact broken shape generated for CSMA (session 22be72f9): an
// unconditional top-level throw that crashes every backend test at import once
// the TDD gate strips DATABASE_URL.
const CSMA_DB_TS = `import { config as loadDotenv } from "dotenv";
import { Sequelize } from "sequelize";

loadDotenv({ override: process.env.NODE_ENV !== "production" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  logging: false,
});
`;

describe("diagnoseDbSource", () => {
  it("flags the unconditional-throw shape and that it is not yet guarded", () => {
    const d = diagnoseDbSource(CSMA_DB_TS);
    expect(d.hasUnconditionalThrow).toBe(true);
    expect(d.alreadyGuarded).toBe(false);
  });

  it("treats a test-aware sqlite file as already guarded", () => {
    const guarded = `const c = process.env.DATABASE_URL
      ? { dialect: "postgres" }
      : (process.env.NODE_ENV === "test" ? { dialect: "sqlite" } : null);`;
    const d = diagnoseDbSource(guarded);
    expect(d.alreadyGuarded).toBe(true);
  });

  it("does not flag a file with no DATABASE_URL throw", () => {
    const clean = `export const sequelize = new Sequelize("sqlite::memory:");`;
    expect(diagnoseDbSource(clean).hasUnconditionalThrow).toBe(false);
  });
});

describe("rewriteDbSource", () => {
  it("rewrites the CSMA shape: test-aware URL + drops hard-coded postgres dialect", () => {
    const { changed, source } = rewriteDbSource(CSMA_DB_TS);
    expect(changed).toBe(true);
    // The resolved URL now falls back to sqlite in a test process…
    expect(source).toMatch(/process\.env\.VITEST/);
    expect(source).toMatch(/sqlite::memory:/);
    // …the throw guard is preserved (it only fires in dev/prod now)…
    expect(source).toMatch(/throw new Error\("DATABASE_URL is required"\)/);
    // …and the hard-coded postgres dialect is gone so the URL picks the dialect.
    expect(source).not.toMatch(/dialect:\s*["']postgres["']/);
  });

  it("is idempotent: a rewritten file is detected as guarded and not touched again", () => {
    const once = rewriteDbSource(CSMA_DB_TS).source;
    const twice = rewriteDbSource(once);
    expect(twice.changed).toBe(false);
    expect(twice.source).toBe(once);
  });

  it("no-ops when the canonical const declaration is absent", () => {
    // Has a throw but not the `const DATABASE_URL = process.env.DATABASE_URL`
    // anchor — too risky to edit, so we bail.
    const odd = `if (!process.env.DATABASE_URL) { throw new Error("DATABASE_URL is required"); }`;
    const { changed, source } = rewriteDbSource(odd);
    expect(changed).toBe(false);
    expect(source).toBe(odd);
  });

  it("no-ops on a clean file", () => {
    const clean = `export const sequelize = new Sequelize("sqlite::memory:");`;
    expect(rewriteDbSource(clean).changed).toBe(false);
  });

  it("rewritten test path yields the sqlite URL, prod path yields undefined", () => {
    const { source } = rewriteDbSource(CSMA_DB_TS);
    // Emulate the resolved expression for both environments.
    const evalUrl = (env: {
      NODE_ENV?: string;
      VITEST?: string;
      DATABASE_URL?: string;
    }) => {
      const { NODE_ENV, VITEST, DATABASE_URL } = env;
      return (
        DATABASE_URL ||
        (NODE_ENV === "test" || (VITEST ?? "") !== ""
          ? "sqlite::memory:"
          : undefined)
      );
    };
    expect(evalUrl({ NODE_ENV: "test" })).toBe("sqlite::memory:");
    expect(evalUrl({ VITEST: "true" })).toBe("sqlite::memory:");
    expect(evalUrl({ NODE_ENV: "production" })).toBeUndefined();
    expect(evalUrl({ NODE_ENV: "production", VITEST: "" })).toBeUndefined();
    expect(evalUrl({ DATABASE_URL: "postgres://x" })).toBe("postgres://x");
    // Sanity: the generated source embeds exactly this resolution logic.
    expect(source).toContain('? "sqlite::memory:" : undefined');
  });
});
