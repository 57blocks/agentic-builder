/**
 * Trend URL discovery.
 *
 * Ask the LLM to recommend a small set of currently-trending product / brand
 * websites whose landing pages reflect the visual direction of the target
 * industry. The returned URLs feed the screenshot stage in `pipeline.ts`.
 *
 * The model is instructed to:
 *   - return only product / brand sites with rich landing-page heroes
 *   - prefer recently launched (last 12-24 months) products
 *   - skip aggregator sites (awwwards, dribbble, behance) so the visuals
 *     we capture are real shipped UI, not curated case-study thumbnails
 *   - skip sites known to block bots or require auth
 *
 * Output is strict JSON ({ "sites": [...] }) for deterministic parsing.
 */

import { chatCompletion, resolveModel, type ChatMessage } from "@/lib/openrouter";
import { MODEL_CONFIG } from "@/lib/model-config";

import type { DesignIndustry } from "@/lib/memory/knowledge/57b-library";

const INDUSTRY_PROMPT_LABEL: Record<DesignIndustry, string> = {
  ai: "AI / LLM / agent products",
  "fintech-web3": "FinTech, Web3, crypto and DeFi products",
  saas: "SaaS dashboards and B2B enterprise tools",
};

export interface DiscoveredSite {
  name: string;
  url: string;
  reason: string;
}

interface DiscoverOptions {
  count?: number;
  /** Override the model alias used for discovery. */
  modelAlias?: string;
}

const DEFAULT_COUNT = 5;

export async function discoverTrendUrls(
  industry: DesignIndustry,
  year: number,
  opts: DiscoverOptions = {},
): Promise<DiscoveredSite[]> {
  const count = Math.max(1, Math.min(opts.count ?? DEFAULT_COUNT, 10));
  const label = INDUSTRY_PROMPT_LABEL[industry];

  const prompt = `You are a UI/UX research assistant compiling visual references for a design knowledge base.

List ${count} websites that represent the BEST currently-trending design for ${label} in ${year}.

For each site provide:
- "name": brand or product name (short, no marketing fluff)
- "url": full https:// URL of a publicly-accessible landing page with a strong visual hero
- "reason": 1 short sentence (max 18 words) on why this site is design-worthy for the industry

HARD RULES — strictly follow:
- Pick actual product / brand sites (the page you would land on after a Product Hunt link).
- DO NOT pick aggregators or galleries (skip awwwards.com, dribbble.com, behance.net, lapa.ninja, godly.website, land-book.com, mobbin.com, siteinspire.com).
- DO NOT pick sites that require login or are known to block bots (skip linkedin.com, x.com, twitter.com, facebook.com, instagram.com).
- Prefer products launched or redesigned in the last 12-24 months.
- All URLs must be publicly accessible (HTTP 200 from a normal browser).

Return ONLY one valid JSON object — no prose, no markdown fences:

{
  "sites": [
    { "name": "...", "url": "https://...", "reason": "..." }
  ]
}`;

  const messages: ChatMessage[] = [{ role: "user", content: prompt }];

  const model = resolveModel(opts.modelAlias ?? MODEL_CONFIG.qa);
  const response = await chatCompletion(messages, {
    model,
    temperature: 0.7,
    max_tokens: 1200,
  });

  const raw = response.choices?.[0]?.message?.content?.trim() ?? "";
  return parseSites(raw, count);
}

function parseSites(raw: string, count: number): DiscoveredSite[] {
  if (!raw) return [];
  let cleaned = raw.trim();
  const fenceMatch =
    cleaned.match(/^```(?:json)?\r?\n([\s\S]*?)\r?\n```\s*$/) ??
    cleaned.match(/^```(?:json)?\r?\n([\s\S]*?)```\s*$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      throw new Error(
        `discoverTrendUrls: LLM did not return JSON. First 200 chars: ${cleaned.slice(0, 200)}`,
      );
    }
    parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  const sites = (parsed as { sites?: unknown })?.sites;
  if (!Array.isArray(sites)) {
    throw new Error("discoverTrendUrls: payload missing 'sites' array");
  }

  const out: DiscoveredSite[] = [];
  const seenHosts = new Set<string>();
  for (const entry of sites) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === "string" ? e.name.trim() : "";
    const url = typeof e.url === "string" ? e.url.trim() : "";
    const reason = typeof e.reason === "string" ? e.reason.trim() : "";
    if (!name || !isLikelyValidHttpsUrl(url)) continue;
    const host = safeHost(url);
    if (!host || seenHosts.has(host)) continue;
    seenHosts.add(host);
    out.push({ name, url, reason });
    if (out.length >= count) break;
  }
  return out;
}

function isLikelyValidHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && Boolean(u.host);
  } catch {
    return false;
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
