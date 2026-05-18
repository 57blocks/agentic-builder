/**
 * Microlink-backed screenshot client.
 *
 * Uses the Microlink REST API (https://microlink.io/docs/api) to capture a
 * full-viewport screenshot of an arbitrary URL. The free tier is sufficient
 * for the ~5 sites/run we do; if `MICROLINK_API_KEY` is set it is used as
 * the `x-api-key` header to lift the per-IP rate limit.
 *
 * Two-step protocol:
 *   1. Hit the JSON endpoint with screenshot=true → returns a temporary CDN
 *      URL of the rendered PNG.
 *   2. Download the binary from that URL.
 */

const MICROLINK_API_URL = "https://api.microlink.io/";

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

const DEFAULT_TIMEOUT_MS = 60_000;

export interface ScreenshotOptions {
  /** Image type — Microlink supports png / jpeg / webp. */
  type?: "png" | "jpeg" | "webp";
  /** Viewport width in CSS pixels. */
  viewportWidth?: number;
  /** Viewport height in CSS pixels. */
  viewportHeight?: number;
  /** Full-page screenshot (stitched). Defaults to false (above-the-fold only). */
  fullPage?: boolean;
  /** Per-request timeout override (ms). */
  timeoutMs?: number;
}

export interface ScreenshotResult {
  /** Raw image bytes ready to write to disk. */
  bytes: Buffer;
  /** Final mime type ("image/png", etc.). */
  mime: string;
  /** Suggested file extension (".png" etc.). */
  ext: string;
  /** Microlink CDN URL where the image was hosted (kept for debugging). */
  cdnUrl: string;
  /** Original page title returned by Microlink, if any. */
  title?: string;
}

/**
 * Capture a screenshot of `url`. Throws on any transport / Microlink error.
 */
export async function captureScreenshot(
  url: string,
  opts: ScreenshotOptions = {},
): Promise<ScreenshotResult> {
  const type = opts.type ?? "png";
  const viewportWidth = opts.viewportWidth ?? DEFAULT_VIEWPORT.width;
  const viewportHeight = opts.viewportHeight ?? DEFAULT_VIEWPORT.height;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const apiUrl = new URL(MICROLINK_API_URL);
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("screenshot", "true");
  apiUrl.searchParams.set("meta", "false");
  apiUrl.searchParams.set("waitUntil", "networkidle0");
  apiUrl.searchParams.set("type", type);
  apiUrl.searchParams.set("viewport.width", String(viewportWidth));
  apiUrl.searchParams.set("viewport.height", String(viewportHeight));
  if (opts.fullPage) apiUrl.searchParams.set("fullPage", "true");

  const headers: Record<string, string> = {
    accept: "application/json",
  };
  const apiKey = process.env.MICROLINK_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;

  // ── 1. Ask Microlink to render the page ────────────────────────────────
  const jsonResp = await fetchWithTimeout(apiUrl.toString(), { headers }, timeoutMs);
  if (!jsonResp.ok) {
    throw new Error(
      `Microlink HTTP ${jsonResp.status} for ${url}: ${await safeText(jsonResp)}`,
    );
  }
  const payload = (await jsonResp.json()) as MicrolinkResponse;
  if (payload.status !== "success") {
    throw new Error(
      `Microlink status=${payload.status} for ${url}: ${payload.message ?? "(no message)"}`,
    );
  }

  const screenshotUrl = payload.data?.screenshot?.url;
  if (!screenshotUrl) {
    throw new Error(`Microlink returned no screenshot.url for ${url}`);
  }

  // ── 2. Download the rendered image ─────────────────────────────────────
  const imgResp = await fetchWithTimeout(screenshotUrl, {}, timeoutMs);
  if (!imgResp.ok) {
    throw new Error(
      `screenshot fetch HTTP ${imgResp.status} for ${url} (cdn=${screenshotUrl})`,
    );
  }
  const ab = await imgResp.arrayBuffer();
  if (!ab.byteLength) {
    throw new Error(`screenshot fetch returned empty body for ${url}`);
  }

  return {
    bytes: Buffer.from(ab),
    mime: mimeForType(type),
    ext: extForType(type),
    cdnUrl: screenshotUrl,
    title: payload.data?.title,
  };
}

// ─── helpers ────────────────────────────────────────────────────────────────

interface MicrolinkResponse {
  status: "success" | "fail";
  message?: string;
  data?: {
    screenshot?: { url?: string; size_pretty?: string };
    title?: string;
  };
}

function mimeForType(t: ScreenshotOptions["type"]): string {
  switch (t) {
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

function extForType(t: ScreenshotOptions["type"]): string {
  switch (t) {
    case "jpeg":
      return ".jpg";
    case "webp":
      return ".webp";
    default:
      return ".png";
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      throw new Error(`request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function safeText(r: Response): Promise<string> {
  try {
    return (await r.text()).slice(0, 200);
  } catch {
    return "";
  }
}
