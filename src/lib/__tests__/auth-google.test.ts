import { describe, it, expect } from "vitest";
import {
  isAllowedEmail,
  parseStateCookie,
  buildStateCookieValue,
  decodeIdToken,
} from "../auth-google";

describe("isAllowedEmail", () => {
  it("accepts @57blocks.com emails", () => {
    expect(isAllowedEmail("user@57blocks.com")).toBe(true);
  });
  it("rejects other domains", () => {
    expect(isAllowedEmail("user@gmail.com")).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(isAllowedEmail("User@57Blocks.COM")).toBe(true);
  });
  it("rejects emails that merely contain the domain", () => {
    expect(isAllowedEmail("user@evil57blocks.com")).toBe(false);
    expect(isAllowedEmail("user@57blocks.com.evil.com")).toBe(false);
  });
});

describe("parseStateCookie", () => {
  it("splits state from code_verifier on first colon", () => {
    const result = parseStateCookie("abc123:verifierbase64string");
    expect(result).toEqual({ state: "abc123", code_verifier: "verifierbase64string" });
  });
  it("returns null when no colon present", () => {
    expect(parseStateCookie("nocolon")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(parseStateCookie("")).toBeNull();
  });
  it("handles code_verifier that contains colons (splits on first only)", () => {
    const result = parseStateCookie("state:ver:ifier");
    expect(result).toEqual({ state: "state", code_verifier: "ver:ifier" });
  });
});

describe("buildStateCookieValue + parseStateCookie roundtrip", () => {
  it("parses back what was built", () => {
    const value = buildStateCookieValue("mystate", "myverifier");
    expect(parseStateCookie(value)).toEqual({ state: "mystate", code_verifier: "myverifier" });
  });
});

describe("decodeIdToken", () => {
  function makeToken(payload: object): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `header.${encoded}.signature`;
  }

  it("extracts email, sub, name, picture", () => {
    const token = makeToken({
      sub: "12345",
      email: "user@57blocks.com",
      name: "Alice",
      picture: "https://example.com/pic.jpg",
    });
    expect(decodeIdToken(token)).toEqual({
      sub: "12345",
      email: "user@57blocks.com",
      name: "Alice",
      picture: "https://example.com/pic.jpg",
    });
  });

  it("returns null for a token without 3 segments", () => {
    expect(decodeIdToken("only.two")).toBeNull();
    expect(decodeIdToken("notavalidtoken")).toBeNull();
  });

  it("returns null when email is missing", () => {
    expect(decodeIdToken(makeToken({ sub: "123", name: "Alice" }))).toBeNull();
  });

  it("returns null when sub is missing", () => {
    expect(decodeIdToken(makeToken({ email: "user@57blocks.com" }))).toBeNull();
  });

  it("returns null when payload is not valid JSON", () => {
    expect(decodeIdToken("header.notbase64json.sig")).toBeNull();
  });
});
