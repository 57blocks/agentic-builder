import { NextRequest, NextResponse } from "next/server";
import { addDesignReference } from "@/lib/pipeline/design-references";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
}

/**
 * Persists a URL-captured screenshot to .blueprint/design-references/ immediately.
 *
 * The client captures the screenshot (via Electron renderReferenceUrl or similar),
 * then POSTs here so the asset is on disk before auto-match runs.
 *
 * Body:
 *   url               – original source URL (stored as label)
 *   screenshotDataUrl – base64 data: URL of the screenshot (required)
 *   cssToken?         – CSS custom-property map from the page
 *   pageHint?         – if provided, binds directly as manual (skips Vision match)
 */
export async function POST(request: NextRequest) {
  let body: {
    url?: string;
    screenshotDataUrl?: string;
    cssToken?: Record<string, string>;
    pageHint?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url, screenshotDataUrl, cssToken, pageHint } = body;

  if (!screenshotDataUrl || typeof screenshotDataUrl !== "string") {
    return NextResponse.json(
      { error: "screenshotDataUrl is required." },
      { status: 400 },
    );
  }

  // Parse data URL: data:<mime>;base64,<data>
  const dataUrlMatch = screenshotDataUrl.match(
    /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/,
  );
  if (!dataUrlMatch) {
    return NextResponse.json(
      { error: "screenshotDataUrl must be a base64 PNG, JPEG, or WebP data URL." },
      { status: 400 },
    );
  }

  const mime = dataUrlMatch[1]!;
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const buffer = Buffer.from(dataUrlMatch[2]!, "base64");
  const fileName = `url-capture.${ext}`;
  const isManual = typeof pageHint === "string" && pageHint.trim().length > 0;

  const result = await addDesignReference(projectRoot(), {
    fileName,
    mime,
    bytes: buffer,
    label: typeof url === "string" ? url.trim().slice(0, 200) : "",
    pageHint: isManual ? pageHint!.trim() : "",
    source: "url",
    matchedBy: isManual ? "manual" : "auto",
    cssToken: cssToken && typeof cssToken === "object" ? cssToken : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    referenceId: result.entry.id,
    pageHint: result.entry.pageHint || null,
    hasCssToken: result.entry.cssToken !== undefined,
    references: result.manifest,
  });
}
