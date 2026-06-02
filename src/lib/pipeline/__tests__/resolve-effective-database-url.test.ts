import { describe, expect, it } from "vitest";

import { resolveEffectiveDatabaseUrl } from "../generated-code-env";

const REQ = "postgres://app:req@host/reqdb";
const INFRA = "postgres://app:infra@ec2/infradb";
const ENV = "postgres://blueprint:dead@127.0.0.1/tasks_dev";

describe("resolveEffectiveDatabaseUrl", () => {
  it("uses the per-request override first", () => {
    expect(
      resolveEffectiveDatabaseUrl({ requestOverride: REQ, infraUrl: INFRA, envFallback: ENV }),
    ).toBe(REQ);
  });

  it("uses the kickoff-provisioned infra URL over the global env fallback", () => {
    // The core bug fix: a stale global env must NOT shadow the per-project DB.
    expect(
      resolveEffectiveDatabaseUrl({ requestOverride: null, infraUrl: INFRA, envFallback: ENV }),
    ).toBe(INFRA);
  });

  it("falls back to the global env only when override + infra are absent", () => {
    expect(
      resolveEffectiveDatabaseUrl({ infraUrl: null, envFallback: ENV }),
    ).toBe(ENV);
  });

  it("treats empty/whitespace as absent and returns null when nothing is set", () => {
    expect(
      resolveEffectiveDatabaseUrl({ requestOverride: "  ", infraUrl: "", envFallback: undefined }),
    ).toBeNull();
  });
});
