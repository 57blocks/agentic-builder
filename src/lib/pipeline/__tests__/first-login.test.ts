import { describe, expect, it } from "vitest";
import { parseRbacAccounts, parseDemoAccounts } from "../first-login";

describe("parseRbacAccounts", () => {
  it("extracts email/password/role from flat account literals", () => {
    const src = `
      const DEFAULT_SEED_ACCOUNTS = [
        { email: "admin@example.com", role: "admin", password: "Admin@2026", displayName: "admin" },
        { email: "operator@example.com", role: "operator", password: "Operator@2026" },
        { email: "viewer@example.com", role: "viewer", password: "Viewer@2026" },
      ];
    `;
    const out = parseRbacAccounts(src);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ email: "admin@example.com", password: "Admin@2026", role: "admin", source: "rbac" });
    expect(out.map((a) => a.email)).toContain("viewer@example.com");
  });

  it("ignores password-less / non-account objects", () => {
    const src = `{ host: "db", port: 5432 } { email: "x@y.com" /* no password */ }`;
    expect(parseRbacAccounts(src)).toHaveLength(0);
  });
});

describe("parseDemoAccounts", () => {
  it("applies one shared bcrypt password to every demo email, deduped", () => {
    const src = `
      const pw = await bcrypt.hash("Demo@2026", 10);
      await upsert({ email: "family@csma-demo.dev", passwordHash: pw });
      await upsert({ email: "ms.liu@csma-demo.dev", passwordHash: pw });
      await upsert({ email: "family@csma-demo.dev", passwordHash: pw }); // dup
    `;
    const out = parseDemoAccounts(src);
    expect(out).toHaveLength(2);
    expect(out.every((a) => a.password === "Demo@2026" && a.source === "demo")).toBe(true);
    expect(out.map((a) => a.email).sort()).toEqual(["family@csma-demo.dev", "ms.liu@csma-demo.dev"]);
  });

  it("returns nothing when no bcrypt password is present", () => {
    expect(parseDemoAccounts(`email: "x@y.com"`)).toHaveLength(0);
  });
});
