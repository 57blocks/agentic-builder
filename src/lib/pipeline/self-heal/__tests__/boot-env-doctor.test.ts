import { describe, it, expect } from "vitest";
import { diagnoseBootEnvSwitches, ensureSafeDefaults } from "../boot-env-doctor";

describe("ensureSafeDefaults", () => {
  it("adds TIMESCALE_DISABLED=1 to a restored stale .env that lacks it", () => {
    // .tdd-bak content: real DB URL but no TIMESCALE_DISABLED (predates the fix)
    const restored =
      'DATABASE_URL="postgresql://app:pw@db:5432/app"\nREDIS_URL="redis://x"\nPORT=4000\n';
    const { envContent, applied } = ensureSafeDefaults(restored);
    expect(applied).toEqual(["default:timescale-disabled"]);
    expect(envContent).toMatch(/^TIMESCALE_DISABLED=1$/m);
    expect(envContent).toMatch(/DATABASE_URL="postgresql/); // secret untouched
  });

  it("is a no-op when defaults already present", () => {
    const env = "TIMESCALE_DISABLED=1\nPORT=4000\n";
    const { envContent, applied } = ensureSafeDefaults(env);
    expect(applied).toEqual([]);
    expect(envContent).toBe(env);
  });
});

const TIMESCALE_ERR =
  'error: extension "timescaledb" is not available\n' +
  "  HINT: Install TimescaleDB or set TIMESCALE_DISABLED=1 to suppress.";

describe("diagnoseBootEnvSwitches", () => {
  it("sets TIMESCALE_DISABLED=1 when the boot error is a timescale failure", () => {
    const env = "PORT=4000\nDATABASE_URL=postgres://x\n";
    const { envContent, applied } = diagnoseBootEnvSwitches(env, TIMESCALE_ERR);
    expect(applied).toEqual(["timescale-disabled"]);
    expect(envContent).toMatch(/^TIMESCALE_DISABLED=1$/m);
    // unquoted (flags shouldn't be JSON-quoted like the REDIS_URL bug)
    expect(envContent).not.toMatch(/TIMESCALE_DISABLED="1"/);
    // preserves other keys
    expect(envContent).toMatch(/^PORT=4000$/m);
    expect(envContent).toMatch(/DATABASE_URL=postgres:\/\/x/);
  });

  it("is a no-op when TIMESCALE_DISABLED=1 is already set (no pointless retry)", () => {
    const env = "PORT=4000\nTIMESCALE_DISABLED=1\n";
    const { envContent, applied } = diagnoseBootEnvSwitches(env, TIMESCALE_ERR);
    expect(applied).toEqual([]);
    expect(envContent).toBe(env);
  });

  it("flips an existing TIMESCALE_DISABLED=0 to 1 on a timescale error", () => {
    const env = "TIMESCALE_DISABLED=0\n";
    const { envContent, applied } = diagnoseBootEnvSwitches(env, TIMESCALE_ERR);
    expect(applied).toEqual(["timescale-disabled"]);
    expect(envContent).toMatch(/^TIMESCALE_DISABLED=1$/m);
    expect(envContent).not.toMatch(/TIMESCALE_DISABLED=0/);
  });

  it("does NOT touch env for an unrelated boot error (e.g. a TS crash)", () => {
    const env = "PORT=4000\n";
    const { envContent, applied } = diagnoseBootEnvSwitches(
      env,
      "TypeError: Cannot read properties of undefined (reading 'foo')",
    );
    expect(applied).toEqual([]);
    expect(envContent).toBe(env);
  });

  it("never invents a DATABASE_URL (secrets are out of scope for switch-diagnosis)", () => {
    const env = "DATABASE_URL=\nPORT=4000\n";
    const { envContent, applied } = diagnoseBootEnvSwitches(
      env,
      "DATABASE_URL missing after importing backend database entry",
    );
    // no switch rule matches → no change; DATABASE_URL stays blank (restored elsewhere from .tdd-bak)
    expect(applied).toEqual([]);
    expect(envContent).toBe(env);
  });
});
