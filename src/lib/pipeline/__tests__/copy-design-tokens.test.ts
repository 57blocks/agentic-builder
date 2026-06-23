import { describe, it, expect } from "vitest";
import { tokensDestForTier } from "../copy-design-tokens";

describe("tokensDestForTier", () => {
  it("m/l-tier 写 frontend/src/styles", () => {
    expect(tokensDestForTier("m")).toBe("frontend/src/styles/tokens.css");
    expect(tokensDestForTier("l")).toBe("frontend/src/styles/tokens.css");
  });
  it("s-tier 写 src/styles", () => {
    expect(tokensDestForTier("s")).toBe("src/styles/tokens.css");
  });
});
