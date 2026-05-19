import { describe, expect, it } from "vitest";

import { renderAuthoritativeAuthDecisionBlock } from "../trd-auth-block";
import {
  buildDefaultAuthDecision,
  type AuthDecision,
} from "../auth-decision-types";

describe("renderAuthoritativeAuthDecisionBlock", () => {
  it("returns empty string when no decision is provided", () => {
    expect(renderAuthoritativeAuthDecisionBlock(null)).toBe("");
    expect(renderAuthoritativeAuthDecisionBlock(undefined)).toBe("");
  });

  it("renders password-rbac mode with roles, seed accounts, and zero required env keys", () => {
    const block = renderAuthoritativeAuthDecisionBlock(buildDefaultAuthDecision());

    expect(block).toContain("Auth Decision (AUTHORITATIVE)");
    expect(block).toContain("`password-rbac`");
    expect(block).toContain("auth-password-rbac");
    expect(block).toContain("`admin`");
    expect(block).toContain("`operator`");
    expect(block).toContain("`viewer`");
    expect(block).toContain("admin@example.com");
    expect(block).toContain("(none — mode has no external auth dependencies)");
  });

  it("renders magic-link mode with SMTP env keys", () => {
    const decision: AuthDecision = {
      ...buildDefaultAuthDecision(),
      mode: "magic-link",
      scaffold: "auth-magic-link",
      requiredEnvKeys: [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD",
        "SMTP_FROM",
      ],
      userOverridden: true,
    };

    const block = renderAuthoritativeAuthDecisionBlock(decision);

    expect(block).toContain("`magic-link`");
    expect(block).toContain("`SMTP_HOST`");
    expect(block).toContain("`SMTP_FROM`");
    expect(block).toContain("userOverridden: true");
    expect(block).toContain("do not suggest changing the mode");
  });

  it("renders privy mode with privy env keys", () => {
    const decision: AuthDecision = {
      ...buildDefaultAuthDecision(),
      mode: "privy",
      scaffold: "auth-privy",
      requiredEnvKeys: ["PRIVY_APP_ID", "PRIVY_APP_SECRET", "VITE_PRIVY_APP_ID"],
    };

    const block = renderAuthoritativeAuthDecisionBlock(decision);

    expect(block).toContain("`privy`");
    expect(block).toContain("`PRIVY_APP_ID`");
    expect(block).toContain("`VITE_PRIVY_APP_ID`");
  });
});
