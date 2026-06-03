import { describe, expect, it } from "vitest";

import { backfillPrdIds } from "../prd-id-backfill";
import { runPrdIdGate } from "../prd-id-gate";

const UNTAGGED = `## 7.1 路由
| 路径 | 说明 |
|---|---|
| \`/family/cart\` | 购物车 |
| \`/admin/users\` | 用户 |

## 26. API
#### POST \`/api/v1/auth/login\`
body...
#### GET \`/api/v1/courses\`
`;

describe("backfillPrdIds", () => {
  it("makes a previously-failing PRD pass the strict gate", () => {
    expect(runPrdIdGate(UNTAGGED).passed).toBe(false);
    const { prd, addedPages, addedEndpoints } = backfillPrdIds(UNTAGGED);
    expect(addedPages).toBe(2);
    expect(addedEndpoints).toBe(2);
    expect(runPrdIdGate(prd).passed).toBe(true);
  });

  it("is idempotent — a second pass adds nothing and keeps the gate green", () => {
    const once = backfillPrdIds(UNTAGGED).prd;
    const twice = backfillPrdIds(once);
    expect(twice.addedPages).toBe(0);
    expect(twice.addedEndpoints).toBe(0);
    expect(twice.prd).toBe(once);
    expect(runPrdIdGate(twice.prd).passed).toBe(true);
  });

  it("continues numbering from existing ids (no collision)", () => {
    const withExisting = `| \`/a\` | x PAGE-005 |\n| \`/b\` | y |\n`;
    const { prd } = backfillPrdIds(withExisting);
    expect(prd).toMatch(/\/b`.*PAGE-006/);
  });

  it("preserves table column count (id goes inside the last cell)", () => {
    const before = "| \`/a\` | desc |";
    const { prd } = backfillPrdIds(before + "\n");
    const row = prd.trim();
    // a 2-column row has 3 pipes; backfill must not change the pipe count
    expect((row.match(/\|/g) || []).length).toBe((before.match(/\|/g) || []).length);
    expect(row).toMatch(/PAGE-001/);
  });
});
