import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  extractContractEndpoints,
  assertContractCoversManifest,
} from "../contract-precondition";
import type { SubsystemManifest } from "../types";

function manifest(endpointsByDomain: Record<string, string[]>): SubsystemManifest {
  return {
    version: 1,
    subsystems: Object.entries(endpointsByDomain).map(([id, eps]) => ({
      id,
      name: id,
      ownedRoutes: [],
      ownedApiEndpoints: eps,
      ownedCollections: [],
      ownedModules: [],
      dependsOn: [],
      prdSections: [],
    })),
  };
}

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "contract-"));
  await fs.mkdir(path.join(dir, ".blueprint"), { recursive: true });
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

async function writeContract(obj: unknown) {
  await fs.writeFile(path.join(dir, ".blueprint", "API_CONTRACTS.json"), JSON.stringify(obj), "utf8");
}

describe("extractContractEndpoints", () => {
  it("parses OpenAPI paths", () => {
    const eps = extractContractEndpoints({
      paths: { "/api/v1/diffs": { get: {}, post: {} }, "/api/v1/diffs/{id}": { delete: {} } },
    });
    expect(eps).toEqual([
      { method: "GET", endpoint: "/api/v1/diffs" },
      { method: "POST", endpoint: "/api/v1/diffs" },
      { method: "DELETE", endpoint: "/api/v1/diffs/{id}" },
    ]);
  });
  it("parses a flat array", () => {
    expect(extractContractEndpoints([{ method: "post", endpoint: "/api/v1/auth/login" }])).toEqual([
      { method: "POST", endpoint: "/api/v1/auth/login" },
    ]);
  });
});

describe("assertContractCoversManifest", () => {
  it("ok when every owned endpoint is declared (param shapes normalised)", async () => {
    await writeContract({
      paths: {
        "/api/v1/diffs": { get: {}, post: {} },
        "/api/v1/diffs/{id}": { get: {} },
      },
    });
    const r = await assertContractCoversManifest(
      dir,
      manifest({ diffs: ["GET /api/v1/diffs", "POST /api/v1/diffs", "GET /api/v1/diffs/:id"] }),
    );
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.contractEndpoints).toBe(3);
  });

  it("fails and lists missing endpoints", async () => {
    await writeContract({ paths: { "/api/v1/diffs": { get: {} } } });
    const r = await assertContractCoversManifest(
      dir,
      manifest({ diffs: ["GET /api/v1/diffs", "POST /api/v1/diffs"] }),
    );
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["POST /api/v1/diffs"]);
  });

  it("fails when the contract file is absent", async () => {
    const r = await assertContractCoversManifest(dir, manifest({ a: ["GET /api/v1/x"] }));
    expect(r.ok).toBe(false);
    expect(r.contractFound).toBe(false);
  });

  it("fails when the contract declares no endpoints", async () => {
    await writeContract({ paths: {} });
    const r = await assertContractCoversManifest(dir, manifest({ a: ["GET /api/v1/x"] }));
    expect(r.ok).toBe(false);
    expect(r.contractEndpoints).toBe(0);
  });
});
