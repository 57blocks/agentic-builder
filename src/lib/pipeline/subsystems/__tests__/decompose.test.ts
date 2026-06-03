import { describe, expect, it } from "vitest";

import {
  parseSubsystemManifestFromLlm,
  buildRepairMessage,
  buildDecomposerUserMessage,
  extractOutline,
} from "../decompose";
import type { ManifestValidationResult } from "../validate";

describe("parseSubsystemManifestFromLlm", () => {
  it("parses a well-formed manifest (tolerates surrounding prose/fences)", () => {
    const raw = "here you go:\n```json\n" +
      JSON.stringify({
        subsystems: [
          { id: "auth", name: "Auth", ownedRoutes: ["/auth"], ownedApiEndpoints: ["POST /api/v1/auth/login"], dependsOn: [] },
        ],
      }) + "\n```";
    const m = parseSubsystemManifestFromLlm(raw, { tier: "L" });
    expect(m).not.toBeNull();
    expect(m!.tier).toBe("L");
    expect(m!.subsystems[0].id).toBe("auth");
    // missing arrays default to []
    expect(m!.subsystems[0].ownedCollections).toEqual([]);
    expect(m!.subsystems[0].ownedModules).toEqual([]);
  });

  it("returns null for non-JSON / wrong shape / empty subsystems", () => {
    expect(parseSubsystemManifestFromLlm("no json here")).toBeNull();
    expect(parseSubsystemManifestFromLlm('{"foo":1}')).toBeNull();
    expect(parseSubsystemManifestFromLlm('{"subsystems":[]}')).toBeNull();
    expect(parseSubsystemManifestFromLlm('{"subsystems":[{"name":"no id"}]}')).toBeNull();
  });
});

describe("buildRepairMessage", () => {
  it("lists validation errors and the unassigned inventory items", () => {
    const validation: ManifestValidationResult = {
      ok: false,
      errors: ['Route "/family/cart" is not owned by any subsystem (coverage gap).'],
      warnings: [],
      buildLayers: [],
    };
    const inventory = {
      routes: ["/family/cart", "/auth"],
      apiEndpoints: ["POST /api/v1/cart", "POST /api/v1/auth/login"],
      collections: [],
    };
    const manifest = {
      version: 1,
      subsystems: [
        { id: "auth", name: "Auth", ownedRoutes: ["/auth"], ownedApiEndpoints: ["POST /api/v1/auth/login"], ownedCollections: [], ownedModules: [], dependsOn: [], prdSections: [] },
      ],
    };
    const msg = buildRepairMessage(validation, inventory, manifest);
    expect(msg).toMatch(/coverage gap/);
    expect(msg).toMatch(/UNASSIGNED routes \(1\):.*\/family\/cart/);
    expect(msg).toMatch(/UNASSIGNED endpoints \(1\):.*POST \/api\/v1\/cart/);
  });
});

describe("user message + outline", () => {
  it("outline keeps only H2/H3 headings", () => {
    const prd = "# Title\n## A\ntext\n### A.1\nmore\n#### deep\n## B\n";
    const outline = extractOutline(prd);
    expect(outline).toContain("## A");
    expect(outline).toContain("### A.1");
    expect(outline).toContain("## B");
    expect(outline).not.toContain("#### deep");
    expect(outline).not.toContain("# Title");
  });

  it("user message embeds the inventory counts", () => {
    const msg = buildDecomposerUserMessage("## H\n", {
      routes: ["/a", "/b"],
      apiEndpoints: ["GET /api/v1/x"],
      collections: ["things"],
    });
    expect(msg).toMatch(/Routes \(2\)/);
    expect(msg).toMatch(/API endpoints \(1\)/);
    expect(msg).toMatch(/Data collections \(1\)/);
  });
});
