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
