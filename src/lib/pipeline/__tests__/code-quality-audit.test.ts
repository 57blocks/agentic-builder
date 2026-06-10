import { describe, it, expect } from "vitest";
import {
  parseTscOutput,
  parseEslintJson,
  parseJscpdJson,
  parseMadgeJson,
  countAstAnomalies,
  auditCodeQuality,
} from "@/lib/pipeline/code-quality-audit";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

describe("parseTscOutput", () => {
  it("counts `error TS####` lines", () => {
    const out = `src/foo.ts(12,5): error TS2322: blah\nsrc/foo.ts(13,1): error TS2345: nope\nFound 2 errors.`;
    expect(parseTscOutput(out)).toBe(2);
  });
  it("returns 0 for clean output", () => {
    expect(parseTscOutput("")).toBe(0);
  });
});

describe("parseEslintJson", () => {
  it("aggregates error and warning counts", () => {
    const json = JSON.stringify([
      { errorCount: 2, warningCount: 1 },
      { errorCount: 0, warningCount: 3 },
    ]);
    expect(parseEslintJson(json)).toEqual({ lintErrors: 2, lintWarnings: 4 });
  });
  it("returns zeroes on malformed input", () => {
    expect(parseEslintJson("not json")).toEqual({ lintErrors: 0, lintWarnings: 0 });
  });
});

describe("parseJscpdJson", () => {
  it("reads statistics.total.percentage", () => {
    const json = JSON.stringify({ statistics: { total: { percentage: 4.2 } } });
    expect(parseJscpdJson(json)).toEqual({ percentage: 4.2 });
  });
  it("falls back to 0 on missing field", () => {
    expect(parseJscpdJson("{}")).toEqual({ percentage: 0 });
  });
});

describe("parseMadgeJson", () => {
  it("counts cycles array length", () => {
    const json = JSON.stringify([["a.ts", "b.ts", "a.ts"], ["c.ts", "d.ts", "c.ts"]]);
    expect(parseMadgeJson(json)).toEqual({ circularDeps: 2 });
  });
  it("returns 0 on non-array input", () => {
    expect(parseMadgeJson("{}")).toEqual({ circularDeps: 0 });
  });
});

describe("countAstAnomalies", () => {
  it("counts any / @ts-ignore / non-null assertions in source", () => {
    const src = `
      const x: any = 1;
      // @ts-ignore
      const y = (x as number)!.toString();
      const z: any = 2;
    `;
    const r = countAstAnomalies(src);
    expect(r.anyCount).toBe(2);
    expect(r.tsIgnoreCount).toBe(1);
    expect(r.nonNullAssertCount).toBe(1);
  });
});

describe("auditCodeQuality (integration with mocked runner)", () => {
  it("returns present=false when no workspaces detected", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "audit-empty-"));
    const r = await auditCodeQuality({ outputDir: tmp });
    expect(r.present).toBe(false);
  });

  it("aggregates results from frontend workspace", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "audit-frontend-"));
    const fe = path.join(tmp, "frontend");
    await fs.mkdir(path.join(fe, "src"), { recursive: true });
    await fs.writeFile(path.join(fe, "package.json"), "{}");
    await fs.writeFile(path.join(fe, "src", "a.ts"), "export const x: any = 1;\nexport const y: any = 2;\n");

    const r = await auditCodeQuality({
      outputDir: tmp,
      runner: async (cmd, args) => {
        if (args.includes("tsc")) return { stdout: "src/a.ts(1,1): error TS2322: x\n", stderr: "" };
        if (args.includes("eslint")) return { stdout: JSON.stringify([{ errorCount: 3, warningCount: 1 }]), stderr: "" };
        if (args.includes("jscpd")) {
          await fs.mkdir(path.join(fe, ".ralph-jscpd"), { recursive: true });
          await fs.writeFile(path.join(fe, ".ralph-jscpd", "jscpd-report.json"), JSON.stringify({ statistics: { total: { percentage: 2.5 } } }));
          return { stdout: "", stderr: "" };
        }
        if (args.includes("madge")) return { stdout: "[]", stderr: "" };
        return { stdout: "", stderr: "" };
      },
    });
    expect(r.present).toBe(true);
    expect(r.staticChecks.tscErrors).toBe(1);
    expect(r.staticChecks.lintErrors).toBe(3);
    expect(r.typeSafety.anyCount).toBe(2);
    expect(r.duplication.percentage).toBeCloseTo(2.5);
  });
});

describe("auditCodeQuality error paths", () => {
  it("captures error string when tool throws without stdout", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "audit-err-"));
    const fe = path.join(tmp, "frontend");
    await fs.mkdir(path.join(fe, "src"), { recursive: true });
    await fs.writeFile(path.join(fe, "package.json"), "{}");
    await fs.writeFile(path.join(fe, "src", "a.ts"), "export const x = 1;\n");
    const r = await auditCodeQuality({
      outputDir: tmp,
      runner: async () => { throw new Error("pure failure"); },
    });
    // The workspace's `errors` array should have captured the throws.
    const ws = r.workspaces[0];
    expect(ws.errors.length).toBeGreaterThan(0);
    expect(ws.errors.some((e) => /pure failure/.test(e))).toBe(true);
  });

  it("aggregates across two workspaces", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "audit-multi-"));
    for (const ws of ["frontend", "backend"]) {
      const p = path.join(tmp, ws);
      await fs.mkdir(path.join(p, "src"), { recursive: true });
      await fs.writeFile(path.join(p, "package.json"), "{}");
      await fs.writeFile(path.join(p, "src", "a.ts"), "export const x: any = 1;\n");
    }
    const r = await auditCodeQuality({
      outputDir: tmp,
      runner: async (cmd, args) => {
        if (args.includes("tsc")) return { stdout: "src/a.ts(1,1): error TS2322: x\n", stderr: "" };
        if (args.includes("eslint")) return { stdout: "[]", stderr: "" };
        return { stdout: "", stderr: "" };
      },
    });
    expect(r.workspaces).toHaveLength(2);
    expect(r.staticChecks.tscErrors).toBe(2); // 1 per workspace
    expect(r.typeSafety.anyCount).toBe(2);
  });
});

describe("countAstAnomalies word boundaries", () => {
  it("does not match `: anyMap` as any", () => {
    const r = countAstAnomalies("const x: anyMap = 1;");
    expect(r.anyCount).toBe(0);
  });
  it("does match `: any` (exact)", () => {
    const r = countAstAnomalies("const x: any = 1;");
    expect(r.anyCount).toBe(1);
  });
});
