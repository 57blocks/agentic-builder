// src/lib/pipeline/__tests__/prototype-scaffold.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  resolvePrototypeTier,
  resolveFrontendDir,
  copyBaseScaffoldForPrototype,
} from "../prototype-scaffold";

describe("resolvePrototypeTier", () => {
  it("uses an explicit tier when provided (normalized)", () => {
    expect(resolvePrototypeTier("anything", "l")).toEqual({ scopeTier: "L", scaffoldTier: "L" });
  });

  it("reads the **Project Tier: X** badge from the PRD when no explicit tier", () => {
    const prd = "# Spec\n\n**Project Tier: L**\n\nbody";
    expect(resolvePrototypeTier(prd).scopeTier).toBe("L");
  });

  it("defaults scope to M when no badge and no explicit tier", () => {
    expect(resolvePrototypeTier("no badge here").scopeTier).toBe("M");
  });

  it("promotes S→M when the PRD signals a backend", () => {
    const prd = "**Project Tier: S**\n\nWe need a REST API and a database.";
    const out = resolvePrototypeTier(prd);
    expect(out.scopeTier).toBe("S");
    expect(out.scaffoldTier).toBe("M");
  });

  it("keeps S when the PRD is frontend-only", () => {
    const prd = "**Project Tier: S**\n\nA client-side only single-page app, no backend.";
    expect(resolvePrototypeTier(prd).scaffoldTier).toBe("S");
  });
});

describe("resolveFrontendDir", () => {
  it("returns the output root itself for S-tier (single app)", () => {
    expect(resolveFrontendDir("/out", "S")).toBe("/out");
  });
  it("returns <root>/frontend for M/L", () => {
    expect(resolveFrontendDir("/out", "M")).toBe(path.join("/out", "frontend"));
    expect(resolveFrontendDir("/out", "L")).toBe(path.join("/out", "frontend"));
  });
});

describe("copyBaseScaffoldForPrototype", () => {
  let out: string;
  beforeEach(async () => {
    out = await fs.mkdtemp(path.join(os.tmpdir(), "proto-scaffold-"));
  });
  afterEach(async () => {
    await fs.rm(out, { recursive: true, force: true });
  });

  it("copies the M base frontend but applies NO _optional overlay", async () => {
    await copyBaseScaffoldForPrototype("M", out);
    const routerExists = await fs
      .access(path.join(out, "frontend", "src", "router.tsx"))
      .then(() => true)
      .catch(() => false);
    expect(routerExists).toBe(true);
    const optionalLeaked = await fs
      .access(path.join(out, "_optional"))
      .then(() => true)
      .catch(() => false);
    expect(optionalLeaked).toBe(false);
  });
});
