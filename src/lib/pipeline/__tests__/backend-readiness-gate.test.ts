import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  parseTscOutput,
  runBackendTscGate,
  runBackendReadinessGate,
  decideBackendReadinessRoute,
  type CommandRunner,
} from "../backend-readiness-gate";

const ok: CommandRunner = async () => ({ stdout: "", exitCode: 0 });
const withErrors: CommandRunner = async () => ({
  stdout: [
    "src/api/modules/admin-aliases/admin-aliases.routes.ts(12,3): error TS2304: Cannot find name 'registerApprovalsRoutes'.",
    "src/models/index.ts(4,10): error TS2305: Module has no exported member 'Course'.",
  ].join("\n"),
  exitCode: 2,
});
const infra: CommandRunner = async () => ({
  stdout: "sh: tsc: command not found",
  exitCode: 127,
});

describe("parseTscOutput", () => {
  it("passes on clean exit + no error lines", () => {
    expect(parseTscOutput("", 0)).toMatchObject({ pass: true, skipped: false, errorCount: 0 });
  });
  it("fails and counts error lines", () => {
    const r = parseTscOutput(
      "x(1,1): error TS2304: bad\ny(2,2): error TS2305: bad",
      2,
    );
    expect(r.pass).toBe(false);
    expect(r.errorCount).toBe(2);
    expect(r.firstErrors).toHaveLength(2);
  });
  it("treats unrunnable tsc (no diagnostics + infra signature) as skipped, not a failure", () => {
    expect(parseTscOutput("sh: tsc: command not found", 127)).toMatchObject({
      pass: true,
      skipped: true,
      errorCount: 0,
    });
  });
});

describe("runBackendTscGate", () => {
  it("skips when there is no backend/ dir", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brg-"));
    try {
      expect(await runBackendTscGate(dir, ok)).toMatchObject({ skipped: true, pass: true });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("passes when backend exists and tsc is clean", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brg-"));
    await fs.mkdir(path.join(dir, "backend"), { recursive: true });
    try {
      expect(await runBackendTscGate(dir, ok)).toMatchObject({ pass: true, skipped: false, errorCount: 0 });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("HARD-FAILS (deterministic) when backend tsc reports errors", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brg-"));
    await fs.mkdir(path.join(dir, "backend"), { recursive: true });
    try {
      const r = await runBackendTscGate(dir, withErrors);
      expect(r.pass).toBe(false);
      expect(r.skipped).toBe(false);
      expect(r.errorCount).toBe(2);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("skips (does not false-fail) when tsc cannot run", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brg-"));
    await fs.mkdir(path.join(dir, "backend"), { recursive: true });
    try {
      expect(await runBackendTscGate(dir, infra)).toMatchObject({ skipped: true, pass: true });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe("decideBackendReadinessRoute (G2 routing)", () => {
  const base = { flagOn: true, hasBackendTasks: true, backendNotGreen: true, hardStop: false };
  it("flag OFF → always proceed (no behavioural change)", () => {
    expect(decideBackendReadinessRoute({ ...base, flagOn: false })).toBe("proceed");
  });
  it("frontend-only project → proceed", () => {
    expect(decideBackendReadinessRoute({ ...base, hasBackendTasks: false })).toBe("proceed");
  });
  it("backend green → proceed", () => {
    expect(decideBackendReadinessRoute({ ...base, backendNotGreen: false })).toBe("proceed");
  });
  it("backend NOT green, default mode → proceed-quarantined (still builds frontend)", () => {
    expect(decideBackendReadinessRoute(base)).toBe("proceed");
  });
  it("backend NOT green, hard-stop mode → stop (skip frontend)", () => {
    expect(decideBackendReadinessRoute({ ...base, hardStop: true })).toBe("stop");
  });
  it("hard-stop only matters when backend is not green", () => {
    expect(decideBackendReadinessRoute({ ...base, backendNotGreen: false, hardStop: true })).toBe(
      "proceed",
    );
  });
});

describe("runBackendReadinessGate (G2 composition)", () => {
  it("fails fast on tsc errors and never runs the smoke probe", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brg-"));
    await fs.mkdir(path.join(dir, "backend"), { recursive: true });
    let smokeRan = false;
    try {
      const r = await runBackendReadinessGate(dir, {
        run: withErrors,
        smokeProbe: async () => {
          smokeRan = true;
          return { pass: true, failureCount: 0 };
        },
      });
      expect(r.pass).toBe(false);
      expect(smokeRan).toBe(false); // no point booting a non-compiling backend
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("runs smoke when tsc passes and surfaces unreachable routes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brg-"));
    await fs.mkdir(path.join(dir, "backend"), { recursive: true });
    try {
      const r = await runBackendReadinessGate(dir, {
        run: ok,
        smokeProbe: async () => ({ pass: false, failureCount: 3 }),
      });
      expect(r.tsc.pass).toBe(true);
      expect(r.pass).toBe(false);
      expect(r.smoke?.failureCount).toBe(3);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
