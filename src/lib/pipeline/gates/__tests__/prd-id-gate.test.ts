import { describe, expect, it } from "vitest";

import { runPrdIdGate, summarizePrdIdGate } from "../prd-id-gate";

const TAGGED = `
## 7.1 路由
| 路径 | ID | 说明 |
|---|---|---|
| \`/family/cart\` | PAGE-014 | 购物车 |
| \`/admin/users\` | PAGE-020 | 用户 |

## 26. API
#### POST \`/api/v1/auth/login\` · API-002
#### GET \`/api/v1/courses\` (API-010)
`;

const UNTAGGED = `
## 7.1 路由
| 路径 | 说明 |
|---|---|
| \`/family/cart\` | 购物车 |

## 26. API
#### POST \`/api/v1/auth/login\`
`;

describe("runPrdIdGate", () => {
  it("passes when every route row has PAGE-NNN and every endpoint heading has API-NNN", () => {
    const r = runPrdIdGate(TAGGED);
    expect(r.passed).toBe(true);
    expect(r.totalPages).toBe(2);
    expect(r.taggedPages).toBe(2);
    expect(r.totalEndpoints).toBe(2);
    expect(r.taggedEndpoints).toBe(2);
  });

  it("fails and lists untagged pages + endpoints", () => {
    const r = runPrdIdGate(UNTAGGED);
    expect(r.passed).toBe(false);
    expect(r.untaggedPages).toEqual(["/family/cart"]);
    expect(r.untaggedEndpoints).toEqual(["POST /api/v1/auth/login"]);
  });

  it("ignores /api rows in the route table (those are endpoints, not pages)", () => {
    const r = runPrdIdGate("| \`/api/v1/x\` | desc |\n");
    expect(r.totalPages).toBe(0);
  });

  it("summary reflects pass/fail", () => {
    expect(summarizePrdIdGate(runPrdIdGate(TAGGED))).toMatch(/PASS/);
    expect(summarizePrdIdGate(runPrdIdGate(UNTAGGED))).toMatch(/FAIL/);
  });
});
