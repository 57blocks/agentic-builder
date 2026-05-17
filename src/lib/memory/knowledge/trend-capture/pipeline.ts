/**
 * Trend Capture pipeline.
 *
 *   discover URLs (LLM)  →  screenshot each (Microlink)  →  vision analyse
 *   (StyleSpec)  →  persist as `design-knowledge` record with both the
 *   Markdown summary and the full HTML visualisation document.
 *
 * The shape of the resulting record is intentionally identical to a
 * user-uploaded Style Spec — the only differentiators are the extra tags
 * (`source:trend-capture`, `site:<host>`, `url:<full-url>`) so the UI can
 * label captured records and prune them on the next refresh.
 */

import path from "path";
import { promises as fs } from "fs";

import { getSystemMemory } from "@/lib/memory";
import { analyseImageToStyleSpec } from "@/lib/memory/knowledge/style-spec/vision-analyser";
import {
  composeStyleSpecRecordBody,
  styleSpecRecordId,
} from "@/lib/memory/knowledge/style-spec/compose-body";
import type { DesignIndustry } from "@/lib/memory/knowledge/57b-library";

import { discoverTrendUrls, type DiscoveredSite } from "./discover";
import { captureScreenshot } from "./screenshot";

const KNOWLEDGE_REFS_DIR = path.join(process.cwd(), "public", "knowledge-refs");
const KNOWLEDGE_REFS_URL_PREFIX = "/knowledge-refs/";

/** Tag used to mark and prune trend-capture records. */
export const TREND_CAPTURE_TAG = "source:trend-capture";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface CapturedSiteResult {
  site: DiscoveredSite;
  status: "ok" | "screenshot_failed" | "analysis_failed";
  recordId?: string;
  imagePath?: string;
  error?: string;
}

export interface RefreshByCaptureResult {
  industry: DesignIndustry;
  discovered: number;
  captured: number;
  failed: number;
  pruned: number;
  results: CapturedSiteResult[];
}

interface RefreshByCaptureOptions {
  /** Number of sites to ask the LLM for. Defaults to 5. */
  siteCount?: number;
  /** Override the discovery model. */
  discoveryModel?: string;
}

/**
 * End-to-end refresh for a single industry. Each captured site becomes one
 * design-knowledge record with body identical to a manual upload (so the
 * UI renders it as a Style Spec card automatically).
 */
export async function refreshIndustryByCapture(
  industry: DesignIndustry,
  year: number,
  opts: RefreshByCaptureOptions = {},
): Promise<RefreshByCaptureResult> {
  const dateLabel = new Date().toISOString().slice(0, 10);

  // 1. Prune obsolete trend-capture records for this industry first so the
  //    UI does not show stale screenshots from previous refreshes.
  const pruned = await pruneOldCaptures(industry);

  // 2. Discover candidate URLs.
  let sites: DiscoveredSite[] = [];
  try {
    sites = await discoverTrendUrls(industry, year, {
      count: opts.siteCount ?? 5,
      modelAlias: opts.discoveryModel,
    });
  } catch (err) {
    console.warn(
      `[trend-capture] discoverTrendUrls failed for ${industry}:`,
      (err as Error).message,
    );
    return {
      industry,
      discovered: 0,
      captured: 0,
      failed: 0,
      pruned,
      results: [],
    };
  }

  await fs.mkdir(KNOWLEDGE_REFS_DIR, { recursive: true });

  const results: CapturedSiteResult[] = [];

  for (const [idx, site] of sites.entries()) {
    try {
      const safeName = sanitiseName(site.name);
      const filenameStem = `auto-${industry}-${dateLabel}-${idx + 1}-${safeName}`;
      const shot = await captureScreenshot(site.url, { type: "png" });
      const filename = `${filenameStem}${shot.ext}`;
      const diskPath = path.join(KNOWLEDGE_REFS_DIR, filename);
      await fs.writeFile(diskPath, shot.bytes);

      const imagePath = path.posix.join(KNOWLEDGE_REFS_URL_PREFIX, filename);
      const imageBase64DataUrl = `data:${shot.mime};base64,${shot.bytes.toString("base64")}`;

      let recordId: string;
      try {
        const spec = await analyseImageToStyleSpec({
          imagePath,
          imageName: filename,
          industryHint: industry,
          imageBase64DataUrl,
        });

        const body = composeStyleSpecRecordBody(spec);
        recordId = styleSpecRecordId(filename);
        const host = safeHost(site.url);

        await getSystemMemory().save({
          id: recordId,
          layer: "L1",
          kind: "design-knowledge",
          title: `Trend Capture — ${site.name} (${industry})`,
          body,
          tags: [
            `industry:${spec.industry}`,
            TREND_CAPTURE_TAG,
            `image:${filename}`,
            host ? `site:${host}` : `site:unknown`,
            `url:${site.url}`,
            `captured:${dateLabel}`,
            `manual:approved`,
          ],
          source: "distill",
          refs: {},
          metrics: { score: 0.78, hits: 0 },
        });
      } catch (err) {
        results.push({
          site,
          status: "analysis_failed",
          imagePath,
          error: (err as Error).message,
        });
        continue;
      }

      results.push({ site, status: "ok", recordId, imagePath });
    } catch (err) {
      console.warn(
        `[trend-capture] capture failed for ${site.url}:`,
        (err as Error).message,
      );
      results.push({
        site,
        status: "screenshot_failed",
        error: (err as Error).message,
      });
    }
  }

  const captured = results.filter((r) => r.status === "ok").length;
  const failed = results.length - captured;

  return {
    industry,
    discovered: sites.length,
    captured,
    failed,
    pruned,
    results,
  };
}

async function pruneOldCaptures(industry: DesignIndustry): Promise<number> {
  const store = getSystemMemory();
  const all = await store.list({ kind: "design-knowledge" });
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const stale = all.filter(
    (r) =>
      r.tags.includes(TREND_CAPTURE_TAG) &&
      r.tags.includes(`industry:${industry}`) &&
      r.createdAt < cutoff,
  );

  let count = 0;
  for (const r of stale) {
    try {
      await store.delete(r.id);
      // Best-effort: also remove the image file so disk does not grow.
      const imageTag = r.tags.find((t) => t.startsWith("image:"));
      if (imageTag) {
        const imageName = imageTag.slice("image:".length);
        const diskPath = path.join(KNOWLEDGE_REFS_DIR, imageName);
        await fs.unlink(diskPath).catch(() => {});
      }
      count++;
    } catch {
      // swallow — pruning must never abort the refresh
    }
  }
  return count;
}

function sanitiseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "site";
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
