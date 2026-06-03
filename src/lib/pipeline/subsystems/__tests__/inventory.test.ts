import { describe, expect, it } from "vitest";

import { extractApiEndpoints, extractRoutes, extractCollections, extractPrdInventory } from "../inventory";

const SAMPLE = `
## 7. 信息架构
### 7.1 路由总览
| 路径 | 说明 |
|---|---|
| \`/family/cart\` | 购物车 |
| \`/admin/users/:userId\` | 用户详情 |

## 26. REST API
#### POST \`/api/v1/auth/login\`
body...
#### GET / POST / PUT / DELETE \`/api/v1/admin/settings/roles\`
#### POST \`/api/v1/admin/courses/:id/publish\` & \`/unpublish\` & \`/delete\`
#### GET \`/api/v1/courses\`

## 13. 完整数据模型
### 13.1 familyProfiles（家庭成员档案，N=3）
### 13.2 familyAccount（单对象）

## 14. 枚举值汇总
### 14.6 channel（渠道枚举）
### 14.7 day（星期枚举）
`;

describe("PRD inventory extraction", () => {
  it("extracts routes (excludes /api paths)", () => {
    expect(extractRoutes(SAMPLE)).toEqual(["/admin/users/:userId", "/family/cart"]);
  });

  it("expands multi-method headings and drops relative shorthand fragments", () => {
    const eps = extractApiEndpoints(SAMPLE);
    expect(eps).toContain("POST /api/v1/auth/login");
    expect(eps).toContain("GET /api/v1/courses");
    // GET/POST/PUT/DELETE expanded to 4
    expect(eps).toContain("GET /api/v1/admin/settings/roles");
    expect(eps).toContain("DELETE /api/v1/admin/settings/roles");
    // canonical publish kept; relative `& /unpublish` `& /delete` fragments dropped
    expect(eps).toContain("POST /api/v1/admin/courses/:id/publish");
    expect(eps.some((e) => e.endsWith(" /unpublish") || e.endsWith(" /delete"))).toBe(false);
  });

  it("extracts collections ONLY from the data-dictionary section (not pages/enums)", () => {
    expect(extractCollections(SAMPLE)).toEqual(["familyAccount", "familyProfiles"]);
    // channel/day are §14 enums, not collections
    expect(extractCollections(SAMPLE)).not.toContain("channel");
  });

  it("returns empty collections when no data-dictionary section exists", () => {
    expect(extractCollections("## 1. Intro\nnothing numbered here")).toEqual([]);
  });

  it("tolerates a backfilled trailing id after the endpoint path (regression)", () => {
    const eps = extractApiEndpoints("#### POST `/api/v1/auth/login` · API-002\n");
    expect(eps).toContain("POST /api/v1/auth/login");
  });

  it("extractPrdInventory aggregates all three", () => {
    const inv = extractPrdInventory(SAMPLE);
    expect(inv.routes.length).toBe(2);
    expect(inv.collections.length).toBe(2);
    expect(inv.apiEndpoints.length).toBeGreaterThanOrEqual(6);
  });
});
