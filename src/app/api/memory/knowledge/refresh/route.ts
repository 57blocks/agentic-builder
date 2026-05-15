/**
 * POST /api/memory/knowledge/refresh
 *
 * Generates fresh design trend insights for one or all industry verticals
 * using an LLM call, stores them as `design-knowledge` records tagged with
 * `source:daily-refresh`, and prunes refresh records older than 30 days.
 *
 * Query params:
 *   industry=ai|fintech-web3|saas  (omit to refresh all three)
 *
 * Intended use: call manually or via a scheduled cron job (e.g. Vercel cron,
 * GitHub Actions schedule, or any HTTP scheduler).
 */

import { NextRequest, NextResponse } from "next/server";

import { chatCompletion, resolveModel, type ChatMessage } from "@/lib/openrouter";
import { MODEL_CONFIG } from "@/lib/model-config";
import { getSystemMemory } from "@/lib/memory";
import { memoryEnabled } from "@/lib/memory/env";
import {
  ALL_INDUSTRIES,
  type DesignIndustry,
} from "@/lib/memory/knowledge/57b-library";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const INDUSTRY_LABELS: Record<DesignIndustry, string> = {
  ai: "AI / Machine Learning products",
  "fintech-web3": "FinTech, Web3 and Blockchain products",
  saas: "SaaS and Enterprise applications",
};

function buildRefreshPrompt(industry: DesignIndustry, year: number): string {
  return `You are a senior UI/UX design expert specialising in ${INDUSTRY_LABELS[industry]}.

Generate a concise (300-500 word) markdown reference note covering the most relevant **current design trends and best practices** for ${INDUSTRY_LABELS[industry]} in ${year}.

Structure your response with these exact sections:

### Trending Visual Styles
2-4 bullet points describing dominant aesthetics and visual directions.

### Component & Interaction Patterns
2-4 bullet points on UI component trends (micro-interactions, states, animation).

### Typography & Color Trends
2-3 bullet points on typography choices and color palette directions.

### What to Avoid
2-3 bullet points on patterns that look dated or that harm UX for this industry.

Write as actionable guidance a UI designer would follow when starting a new project. Be specific — name real patterns (e.g. "bento grid layouts", "soft skeuomorphism", "neobrutalism"). Avoid vague generalities.`;
}

async function generateTrendNote(
  industry: DesignIndustry,
  year: number,
): Promise<string | null> {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: buildRefreshPrompt(industry, year),
    },
  ];

  try {
    const model = resolveModel(MODEL_CONFIG.qa);
    const response = await chatCompletion(messages, {
      model,
      temperature: 0.4,
      max_tokens: 700,
    });
    return response.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.warn(
      `[memory/knowledge/refresh] LLM call failed for industry=${industry}:`,
      (err as Error).message,
    );
    return null;
  }
}

async function pruneOldRefreshRecords(industry: DesignIndustry): Promise<number> {
  const store = getSystemMemory();
  const all = await store.list({ kind: "design-knowledge" });
  const cutoff = Date.now() - THIRTY_DAYS_MS;

  const stale = all.filter(
    (r) =>
      r.tags.includes(`industry:${industry}`) &&
      r.tags.includes("source:daily-refresh") &&
      r.createdAt < cutoff,
  );

  for (const r of stale) {
    try {
      await store.delete(r.id);
    } catch {
      // Swallow — pruning failure should not abort the refresh
    }
  }
  return stale.length;
}

export async function POST(req: NextRequest) {
  if (!memoryEnabled()) {
    return NextResponse.json({ ok: false, reason: "memory_disabled" });
  }

  const { searchParams } = new URL(req.url);
  const industryParam = searchParams.get("industry") as DesignIndustry | null;

  const industries: DesignIndustry[] =
    industryParam && ALL_INDUSTRIES.includes(industryParam)
      ? [industryParam]
      : ALL_INDUSTRIES;

  const year = new Date().getFullYear();
  const dateTag = `refreshed:${new Date().toISOString().slice(0, 10)}`;

  const results: Array<{
    industry: DesignIndustry;
    status: "ok" | "failed";
    id?: string;
    pruned?: number;
  }> = [];

  const store = getSystemMemory();

  for (const industry of industries) {
    try {
      const pruned = await pruneOldRefreshRecords(industry);
      const trendNote = await generateTrendNote(industry, year);

      if (!trendNote) {
        results.push({ industry, status: "failed", pruned });
        continue;
      }

      const body = [
        `## Design Trend Insights — ${INDUSTRY_LABELS[industry]} (${year})`,
        "",
        trendNote,
      ].join("\n");

      const saved = await store.save({
        id: `DK-refresh-${industry}-${Date.now()}`,
        layer: "L1",
        kind: "design-knowledge",
        title: `Design Trends ${year} — ${INDUSTRY_LABELS[industry]}`,
        body,
        tags: [
          `industry:${industry}`,
          "source:daily-refresh",
          dateTag,
          "manual:approved",
        ],
        source: "distill",
        refs: {},
        metrics: { score: 0.75, hits: 0 },
      });

      results.push({ industry, status: "ok", id: saved.id, pruned });
    } catch (err) {
      console.error(
        `[memory/knowledge/refresh] failed for industry=${industry}:`,
        err,
      );
      results.push({ industry, status: "failed" });
    }
  }

  const succeeded = results.filter((r) => r.status === "ok").length;
  return NextResponse.json({
    ok: succeeded > 0,
    year,
    date: dateTag,
    results,
  });
}
