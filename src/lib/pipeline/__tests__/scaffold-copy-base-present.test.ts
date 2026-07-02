// src/lib/pipeline/__tests__/scaffold-copy-base-present.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { copyScaffold } from "../scaffold-copy";

let out: string;
beforeEach(async () => { out = await fs.mkdtemp(path.join(os.tmpdir(), "scaf-bp-")); });
afterEach(async () => { await fs.rm(out, { recursive: true, force: true }); });

const exists = (p: string) => fs.access(p).then(() => true).catch(() => false);

describe("copyScaffold baseAlreadyPresent", () => {
  it("skips the base tier copy when baseAlreadyPresent is true", async () => {
    const res = await copyScaffold("M", out, { baseAlreadyPresent: true });
    expect(await exists(path.join(out, "frontend", "src", "router.tsx"))).toBe(false);
    expect(res.copied.length).toBe(0);
  });

  it("still copies the base when baseAlreadyPresent is falsy (unchanged default)", async () => {
    const res = await copyScaffold("M", out, { forceOverwrite: false });
    expect(await exists(path.join(out, "frontend", "src", "router.tsx"))).toBe(true);
    expect(res.copied.length).toBeGreaterThan(0);
  });

  it("does not clobber a pre-existing view when baseAlreadyPresent is true", async () => {
    const viewsDir = path.join(out, "frontend", "src", "views");
    await fs.mkdir(viewsDir, { recursive: true });
    await fs.writeFile(path.join(viewsDir, "Home.tsx"), "PROTOTYPE", "utf-8");
    await copyScaffold("M", out, { baseAlreadyPresent: true });
    expect(await fs.readFile(path.join(viewsDir, "Home.tsx"), "utf-8")).toBe("PROTOTYPE");
  });
});
