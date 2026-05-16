/**
 * Server-side proxy that fetches a reference URL and returns its cleaned HTML.
 * Used by the Design Spec Custom Upload to accept a website URL as design reference.
 */
import { NextRequest, NextResponse } from "next/server";

/** Naive URL validation — must be http(s) and a valid URL object. */
function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Strip script tags, style tags, and heavy attributes from raw HTML so we
 * don't blow up the LLM context window with irrelevant content.
 */
function cleanHtml(raw: string): string {
  return raw
    // Remove <script> blocks
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Remove <style> blocks
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Remove inline event handlers
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/\s+on\w+='[^']*'/gi, "")
    // Remove SVG blobs (data: URLs) to save tokens
    .replace(/data:[^;]+;base64,[A-Za-z0-9+/=]+/g, "[base64-omitted]")
    // Collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: NextRequest) {
  let url: string;
  try {
    const body = await request.json() as { url?: unknown };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url || !isValidHttpUrl(url)) {
    return NextResponse.json({ error: "A valid http(s) URL is required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AgenticBuilder/1.0; +https://github.com/57blocks)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
      },
      // 10-second timeout via AbortSignal
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Remote returned ${upstream.status} ${upstream.statusText}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: `URL does not return HTML (content-type: ${contentType})` },
        { status: 422 },
      );
    }

    const raw = await upstream.text();
    const cleaned = cleanHtml(raw);
    // Cap at ~60 KB to stay within LLM context budgets
    const capped = cleaned.length > 60_000 ? cleaned.slice(0, 60_000) + "\n<!-- [truncated] -->" : cleaned;

    return NextResponse.json({ html: capped, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch URL: ${message}` }, { status: 502 });
  }
}
