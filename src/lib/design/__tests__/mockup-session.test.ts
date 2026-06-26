import { describe, it, expect } from "vitest";
import {
  roleForRoutePath,
  detectSessionKey,
  detectPolicyVersion,
  buildMockupSessionSeed,
} from "../mockup-session";

const PRD_S18 = `
## 18. localStorage 存储契约
| Storage Key | 数据形态 | 读写函数 | 用途 |
|---|---|---|---|
| \`csma_demo_session\` | \`{ email, role, name, loginMethod, loggedAt, profileCompleted, agreementsSigned, policyVersion }\` | readSession / saveSession | 当前登录会话 |
| \`csma_demo_staff_profile_map\` | \`{ [role]: profileData }\` | readStaffProfileData | 教师/管理员档案 |
`;

describe("roleForRoutePath", () => {
  it("maps path prefixes to roles", () => {
    expect(roleForRoutePath("/teacher/dashboard")).toBe("teacher");
    expect(roleForRoutePath("/admin/reports")).toBe("admin");
    expect(roleForRoutePath("/family/dashboard")).toBe("family");
    expect(roleForRoutePath("/auth")).toBe("family");
  });
});

describe("detectSessionKey", () => {
  it("picks the session row (has role + session-ish fields), not the [role] index row", () => {
    expect(detectSessionKey(PRD_S18)).toBe("csma_demo_session");
  });

  it("returns null when no session-shaped row exists", () => {
    expect(detectSessionKey("| `x` | `{ foo }` | f | u |")).toBeNull();
  });
});

describe("detectPolicyVersion", () => {
  it("extracts a policyVersion literal", () => {
    expect(
      detectPolicyVersion('AND localStorage agreement = { policyVersion: "2026.05" }'),
    ).toBe("2026.05");
  });
});

describe("buildMockupSessionSeed", () => {
  it("builds a teacher session for a /teacher URL using the detected key", () => {
    const seed = buildMockupSessionSeed(
      "https://csma-demo2.vercel.app/teacher/dashboard",
      PRD_S18,
      "2026-06-17T00:00:00.000Z",
    );
    expect(seed?.key).toBe("csma_demo_session");
    const parsed = JSON.parse(seed!.value!);
    expect(parsed.role).toBe("teacher");
    expect(parsed.profileCompleted).toBe(true);
    expect(parsed.agreementsSigned).toBe(true);
  });

  it("builds an admin session for an /admin URL", () => {
    const seed = buildMockupSessionSeed(
      "https://x.app/admin/reports",
      PRD_S18,
      "2026-06-17T00:00:00.000Z",
    );
    expect(JSON.parse(seed!.value!).role).toBe("admin");
  });

  it("returns null when the PRD declares no session key (caller skips seeding)", () => {
    expect(
      buildMockupSessionSeed("https://x.app/teacher/x", "no contract here", "t"),
    ).toBeNull();
  });

  it("clears the session for the login page (so /auth shows the form, not a redirect)", () => {
    const seed = buildMockupSessionSeed(
      "https://csma-demo2.vercel.app/auth",
      PRD_S18,
      "2026-06-17T00:00:00.000Z",
    );
    expect(seed?.key).toBe("csma_demo_session");
    expect(seed?.clear).toBe(true);
    expect(seed?.value).toBeUndefined();
  });
});
