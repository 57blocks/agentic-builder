/**
 * POST /api/memory/knowledge/refresh
 *
 * Refreshes the design-knowledge base for one or all industry verticals by
 * running the **trend capture pipeline**:
 *
 *   LLM-discovered URLs  →  Microlink screenshot  →  vision analyser
 *   (StyleSpec)  →  persisted as `design-knowledge` record with
 *   `source:trend-capture` tag (auto-pruned after 30 days).
 *
 * Query params:
 *   industry=ai|fintech-web3|saas   (omit to refresh all three)
 *   count=N                         (sites per industry, 1-10, default 5)
 *
 * Each captured screenshot becomes one Style Spec record so the existing
 * Knowledge UI renders it under "Generated Style Specs" with both Markdown
 * summary and HTML preview, ready to be recalled into DesignAgent.
 */

import { NextRequest, NextResponse } from "next/server";

import { memoryEnabled } from "@/lib/memory/env";
import {
  ALL_INDUSTRIES,
  type DesignIndustry,
} from "@/lib/memory/knowledge/57b-library";
import {
  refreshIndustryByCapture,
  type RefreshByCaptureResult,
} from "@/lib/memory/knowledge/trend-capture/pipeline";

export async function POST(req: NextRequest) {
  if (!memoryEnabled()) {
    return NextResponse.json({ ok: false, reason: "memory_disabled" });
  }

  const { searchParams } = new URL(req.url);
  const industryParam = searchParams.get("industry") as DesignIndustry | null;
  const countParam = Number.parseInt(searchParams.get("count") ?? "", 10);
  const siteCount =
    Number.isFinite(countParam) && countParam > 0
      ? Math.min(countParam, 10)
      : undefined;

  const industries: DesignIndustry[] =
    industryParam && ALL_INDUSTRIES.includes(industryParam)
      ? [industryParam]
      : [...ALL_INDUSTRIES];

  const year = new Date().getFullYear();
  const dateTag = `refreshed:${new Date().toISOString().slice(0, 10)}`;

  const results: RefreshByCaptureResult[] = [];

  for (const industry of industries) {
    try {
      const r = await refreshIndustryByCapture(industry, year, { siteCount });
      results.push(r);
    } catch (err) {
      console.error(
        `[memory/knowledge/refresh] capture pipeline failed for industry=${industry}:`,
        err,
      );
      results.push({
        industry,
        discovered: 0,
        captured: 0,
        failed: 0,
        pruned: 0,
        results: [],
      });
    }
  }

  const totalCaptured = results.reduce((s, r) => s + r.captured, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  const totalPruned = results.reduce((s, r) => s + r.pruned, 0);

  return NextResponse.json({
    ok: totalCaptured > 0,
    year,
    date: dateTag,
    summary: {
      captured: totalCaptured,
      failed: totalFailed,
      pruned: totalPruned,
    },
    results,
  });
}
