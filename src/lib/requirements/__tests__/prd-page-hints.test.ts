import { describe, it, expect } from "vitest";
import { extractPrdPageHints } from "../prd-page-hints";

describe("extractPrdPageHints", () => {
  it("detects PascalCase page specs under a non-English (Chinese) section heading", () => {
    const prd = `
## 9. 认证模块
### 9.1 AuthPage（\`/auth\`）
### 9.2 AgreementSigningPage（\`/family/agreements\`）
## 10. 家庭端模块详细规格
### 10.1 FamilyDashboardPage（\`/family/dashboard\`）
`;
    const names = extractPrdPageHints(prd).map((p) => p.name);
    // Names retain the trailing （`/route`） note (existing behaviour), so match
    // by prefix rather than exact equality.
    expect(names.some((n) => n.startsWith("AuthPage"))).toBe(true);
    expect(names.some((n) => n.startsWith("AgreementSigningPage"))).toBe(true);
    expect(names.some((n) => n.startsWith("FamilyDashboardPage"))).toBe(true);
  });

  it("detects a route-less PascalCase page (the old keyword/route check missed these)", () => {
    const prd = `
## 10. 家庭端模块详细规格
### 10.14 ActivitiesPage（暂无路由，原型代码保留）
### 12.12 AdminMarketingPage（无独立路由，原型保留）
`;
    const names = extractPrdPageHints(prd).map((p) => p.name);
    expect(names.some((n) => n.startsWith("ActivitiesPage"))).toBe(true);
    expect(names.some((n) => n.startsWith("AdminMarketingPage"))).toBe(true);
  });

  it("does NOT misclassify component-spec headers as pages", () => {
    const prd = `
## 8. UI 组件库规格
### 8.2 Button 规格
### 8.3 Badge 状态映射
`;
    const names = extractPrdPageHints(prd).map((p) => p.name);
    expect(names).not.toContain("Button 规格");
    expect(names).not.toContain("Badge 状态映射");
  });

  it("does not truncate a large L-tier PRD at 20 pages", () => {
    const prd =
      "## 模块\n" +
      Array.from(
        { length: 38 },
        (_, i) => `### ${i + 1}.0 Feature${i + 1}Page（\`/p/${i + 1}\`）`,
      ).join("\n");
    const hints = extractPrdPageHints(prd);
    expect(hints.length).toBe(38);
  });

  it("extracts the route path from the heading (for entry-URL auto-capture)", () => {
    const prd = `
## 10. 家庭端模块详细规格
### 10.1 FamilyDashboardPage（\`/family/dashboard\`）
### 10.4 PrivateEnrollmentPage（\`/family/courses/private/:courseId\`）
### 10.14 ActivitiesPage（暂无路由，原型代码保留）
`;
    const byName = (n: string) =>
      extractPrdPageHints(prd).find((p) => p.name.startsWith(n));

    expect(byName("FamilyDashboardPage")?.route).toBe("/family/dashboard");
    expect(byName("FamilyDashboardPage")?.isParamRoute).toBeFalsy();

    expect(byName("PrivateEnrollmentPage")?.route).toBe(
      "/family/courses/private/:courseId",
    );
    expect(byName("PrivateEnrollmentPage")?.isParamRoute).toBe(true);

    // No backtick route → route undefined
    expect(byName("ActivitiesPage")?.route).toBeUndefined();
  });

  it("still bounds a pathological PRD (cap at 80)", () => {
    const prd =
      "## 模块\n" +
      Array.from(
        { length: 200 },
        (_, i) => `### ${i + 1}.0 Feature${i + 1}Page（\`/p/${i + 1}\`）`,
      ).join("\n");
    expect(extractPrdPageHints(prd).length).toBe(80);
  });
});
