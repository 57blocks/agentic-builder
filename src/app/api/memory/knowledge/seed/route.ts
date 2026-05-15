/**
 * POST /api/memory/knowledge/seed
 *
 * Seeds the 57B design knowledge library into L1 memory as `design-knowledge`
 * records. This is an idempotent operation — existing records for the same
 * industry + source:57b-guidelines are not duplicated.
 *
 * Intended to be called once after deployment or whenever the library is
 * updated. Safe to call multiple times.
 */

import { NextResponse } from "next/server";

import { getSystemMemory } from "@/lib/memory";
import { memoryEnabled } from "@/lib/memory/env";
import { LIBRARY_57B, type DesignIndustry } from "@/lib/memory/knowledge/57b-library";

interface SeedResult {
  industry: DesignIndustry;
  action: "created" | "skipped";
  id?: string;
}

export async function POST() {
  if (!memoryEnabled()) {
    return NextResponse.json({ ok: false, reason: "memory_disabled" }, { status: 200 });
  }

  try {
    const store = getSystemMemory();
    const results: SeedResult[] = [];

    for (const record of LIBRARY_57B) {
      const existing = await store.list({ kind: "design-knowledge" });
      const alreadySeeded = existing.some(
        (r) =>
          r.tags.includes(`industry:${record.industry}`) &&
          r.tags.includes("source:57b-guidelines"),
      );

      if (alreadySeeded) {
        results.push({ industry: record.industry, action: "skipped" });
        continue;
      }

      const saved = await store.save({
        id: `DK-57b-${record.industry}`,
        layer: "L1",
        kind: "design-knowledge",
        title: record.title,
        body: record.body,
        tags: record.tags,
        source: "manual",
        refs: {},
        metrics: { score: 0.85, hits: 0 },
      });

      results.push({ industry: record.industry, action: "created", id: saved.id });
    }

    const created = results.filter((r) => r.action === "created").length;
    const skipped = results.filter((r) => r.action === "skipped").length;

    return NextResponse.json({
      ok: true,
      summary: { created, skipped, total: results.length },
      results,
    });
  } catch (err) {
    console.error("[memory/knowledge/seed] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
