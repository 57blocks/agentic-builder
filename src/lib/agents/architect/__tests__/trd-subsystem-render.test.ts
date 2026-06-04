/**
 * Tests for renderSubsystemArchitectureBlock — renders the business-domain
 * decomposition (.blueprint/subsystems.json) into the authoritative architecture
 * block injected into the TRD prompt, so §3 services/APIs/data-models are shaped
 * around the domains instead of an ad-hoc split.
 */

import { describe, expect, it } from "vitest";
import { renderSubsystemArchitectureBlock } from "../trd-agent";
import type { SubsystemManifest, Subsystem } from "@/lib/pipeline/subsystems/types";

function sub(partial: Partial<Subsystem> & { id: string; name: string }): Subsystem {
  return {
    ownedRoutes: [],
    ownedApiEndpoints: [],
    ownedCollections: [],
    ownedModules: [],
    dependsOn: [],
    prdSections: [],
    ...partial,
  };
}

describe("renderSubsystemArchitectureBlock", () => {
  it("returns empty string when there is no (or an empty) manifest", () => {
    expect(renderSubsystemArchitectureBlock(undefined)).toBe("");
    expect(renderSubsystemArchitectureBlock(null)).toBe("");
    expect(
      renderSubsystemArchitectureBlock({ version: 1, subsystems: [] }),
    ).toBe("");
  });

  it("renders each domain with ownership + dependsOn and the routing instructions", () => {
    const manifest: SubsystemManifest = {
      version: 1,
      tier: "L",
      subsystems: [
        sub({
          id: "auth-accounts",
          name: "Auth & Accounts",
          description: "Identity and sessions.",
          ownedApiEndpoints: ["POST /api/v1/auth/login", "DELETE /api/v1/auth/account"],
          ownedRoutes: ["/login", "/account"],
          ownedCollections: ["users", "sessions"],
          ownedModules: ["auth"],
        }),
        sub({
          id: "enrollment",
          name: "Enrollment",
          ownedApiEndpoints: ["POST /api/v1/enrollments"],
          ownedCollections: ["enrollments"],
          dependsOn: ["auth-accounts"],
        }),
      ],
    };

    const out = renderSubsystemArchitectureBlock(manifest);

    // Authoritative header + per-section routing instructions.
    expect(out).toContain("Subsystem decomposition (AUTHORITATIVE architecture)");
    expect(out).toContain("2 business-domain subsystems");
    expect(out).toMatch(/§3\.1 Services → list ONE service boundary per domain/);
    expect(out).toMatch(/§3\.3 API Specification Summary → group endpoints by their owning domain/);

    // Domain detail rendered verbatim.
    expect(out).toContain("id: auth-accounts");
    expect(out).toContain("POST /api/v1/auth/login");
    expect(out).toContain("ownedCollections: users, sessions");
    expect(out).toContain("dependsOn: [auth-accounts]");
  });

  it("caps a domain's owned endpoints and notes the overflow", () => {
    const endpoints = Array.from({ length: 30 }, (_, i) => `GET /api/v1/r${i}`);
    const out = renderSubsystemArchitectureBlock({
      version: 1,
      subsystems: [sub({ id: "big", name: "Big", ownedApiEndpoints: endpoints })],
    });
    expect(out).toMatch(/\+12 more \(cover ALL of them\)/);
  });
});
