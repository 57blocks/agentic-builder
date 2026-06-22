import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  distributeSharedSchema,
  verifyDistributedSchemaIntact,
} from "../shared-schema-distributor";

const SCHEMA = "export interface User { id: string; name: string }\n";

describe("verifyDistributedSchemaIntact", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "schemaverify-"));
    await fs.mkdir(path.join(dir, ".blueprint"), { recursive: true });
    await fs.writeFile(path.join(dir, ".blueprint", "shared-schema.ts"), SCHEMA);
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("reports intact right after distribution (copies == source)", async () => {
    await distributeSharedSchema("M", dir, { sourceDir: dir });
    const r = await verifyDistributedSchemaIntact("M", dir, { sourceDir: dir });
    expect(r.sourceFound).toBe(true);
    expect(r.intact).toBe(true);
    expect(r.drifted).toEqual([]);
  });

  it("detects a drifted copy (one side edited after distribution)", async () => {
    await distributeSharedSchema("M", dir, { sourceDir: dir });
    // Simulate a worker editing only the frontend copy.
    await fs.writeFile(
      path.join(dir, "frontend/src/shared/schema.ts"),
      SCHEMA + "export interface Extra { buyerName?: string }\n",
    );
    const r = await verifyDistributedSchemaIntact("M", dir, { sourceDir: dir });
    expect(r.intact).toBe(false);
    expect(r.drifted).toContainEqual({ path: "frontend/src/shared/schema.ts", reason: "differs" });
  });

  it("detects a missing copy", async () => {
    await distributeSharedSchema("M", dir, { sourceDir: dir });
    await fs.rm(path.join(dir, "backend/src/shared/schema.ts"), { force: true });
    const r = await verifyDistributedSchemaIntact("M", dir, { sourceDir: dir });
    expect(r.intact).toBe(false);
    expect(r.drifted).toContainEqual({ path: "backend/src/shared/schema.ts", reason: "missing" });
  });

  it("does not false-fail when the blueprint source is absent (TRD skipped)", async () => {
    await fs.rm(path.join(dir, ".blueprint", "shared-schema.ts"), { force: true });
    const r = await verifyDistributedSchemaIntact("M", dir, { sourceDir: dir });
    expect(r.sourceFound).toBe(false);
    expect(r.intact).toBe(true);
  });
});
