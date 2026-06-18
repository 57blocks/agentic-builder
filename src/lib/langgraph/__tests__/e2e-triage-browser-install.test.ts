import { describe, it, expect } from "vitest";

import { triageE2eFailures } from "../e2e-triage";

/**
 * Regression: a missing Playwright browser binary fails every test at launch
 * ("browserType.launch: Executable doesn't exist"). That is an environment
 * gap, NOT an application bug — it must be classified `infra` so the e2e
 * auto-fix loop skips it (instead of burning fix attempts rewriting code over
 * a missing browser, which left sessions stalled at e2e forever).
 */
describe("e2e triage — missing Playwright browser classifies as infra", () => {
  const browserMissingOutput = [
    "Running 6 tests using 1 worker",
    "",
    "  1) [firefox] › generated/e2e-001.spec.ts:18:3 › header displays app title",
    "",
    "    Error: browserType.launch: Executable doesn't exist at /Users/x/Library/Caches/ms-playwright/firefox-1522/firefox/Nightly.app/Contents/MacOS/firefox",
    "    ╔════════════════════════════════════════════════════════════╗",
    "    ║ Looks like Playwright was just installed or updated.       ║",
    "    ║ Please run the following command to download new browsers: ║",
    "    ║     pnpm exec playwright install                           ║",
    "    ╚════════════════════════════════════════════════════════════╝",
  ].join("\n");

  it("is infra, not deterministic (single run)", () => {
    const r = triageE2eFailures({
      firstRunOutput: browserMissingOutput,
      firstRunExitCode: 1,
    });
    expect(r.infra.length).toBeGreaterThanOrEqual(1);
    expect(r.deterministic.length).toBe(0);
  });

  it("a genuine assertion failure stays deterministic (no false infra)", () => {
    const assertionFailure = [
      "Running 1 test using 1 worker",
      "  1) [chromium] › generated/e2e-001.spec.ts:18:3 › header displays app title",
      "    Error: expect(locator).toHaveText(expected)",
      "    Expected string: \"StrongPass\"",
      "    Received string: \"\"",
    ].join("\n");
    const r = triageE2eFailures({
      firstRunOutput: assertionFailure,
      firstRunExitCode: 1,
    });
    expect(r.infra.length).toBe(0);
  });
});

/**
 * Regression (CSMA): this stack has NO migrations — tables come from
 * `sequelize.sync()` at boot. A missing table in TESTS (`no such table`) means
 * the test harness never synced the schema; docker-compose absent / missing
 * test-runner deps are environment gaps. All are infra, not code bugs, and must
 * NOT quarantine an otherwise-compiling multi-domain build.
 */
import { hasInfraSignal } from "../e2e-triage";

describe("hasInfraSignal — test-harness / environment infra", () => {
  it("classifies an unsynced test DB (no such table) as infra", () => {
    expect(
      hasInfraSignal("SQLITE_ERROR: no such table: sessions"),
    ).toBe(true);
    expect(hasInfraSignal('relation "users" does not exist')).toBe(true);
  });

  it("classifies absent docker-compose + test-setup gaps as infra", () => {
    expect(hasInfraSignal("docker-compose: command not found")).toBe(true);
    expect(
      hasInfraSignal("blocked by systemic test infrastructure issues"),
    ).toBe(true);
    expect(hasInfraSignal("the test database setup does not sync")).toBe(true);
  });

  it("does NOT misclassify a real code bug as infra", () => {
    expect(
      hasInfraSignal(
        "TypeError: Cannot read properties of undefined (reading 'id') at task.controller.ts:42",
      ),
    ).toBe(false);
    expect(
      hasInfraSignal("Expected 200 but received 500 — handler threw"),
    ).toBe(false);
  });
});
