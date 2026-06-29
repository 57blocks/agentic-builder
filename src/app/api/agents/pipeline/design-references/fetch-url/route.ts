import { NextRequest, NextResponse } from "next/server";
import { addDesignReference } from "@/lib/pipeline/design-references";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
}

/**
 * Stable, filesystem-safe slug from a capture URL (host + path). Distinct URLs
 * → distinct fileNames (distinct manifest entries); the SAME URL re-captured →
 * same fileName → `addDesignReference` replaces it in place. Falls back to
 * "url-capture" for empty/unparseable input.
 */
function urlToFileSlug(url: string | undefined): string {
  const raw = (url ?? "").trim();
  let base = raw;
  try {
    const u = new URL(raw);
    base = `${u.host}${u.pathname}`;
  } catch {
    // not a parseable URL — slug the raw string
  }
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || "url-capture";
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
    projectId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url, screenshotDataUrl, cssToken, pageHint } = body;
  const projectId =
    new URL(request.url).searchParams.get("projectId") ||
    (typeof body.projectId === "string" && body.projectId
      ? body.projectId
      : undefined);

  // References are stored per-project under
  // `.blueprint/projects/<projectId>/design-references/`; reject early when no
  // projectId so we never fall back to the shared root and pollute other builds.
  if (!projectId) {
    return NextResponse.json(
      {
        error:
          "projectId is required (pass ?projectId=… or a `projectId` body field). " +
          "Design references are stored per project; the shared root is not a valid target.",
      },
      { status: 400 },
    );
  }

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
  // Node.js Buffer.from() is permissive with base64 — malformed input produces garbage bytes
  // rather than throwing. Corrupted files will be rejected by the Vision LLM downstream.
  const buffer = Buffer.from(dataUrlMatch[2]!, "base64");
  // Derive a UNIQUE fileName from the source URL. `addDesignReference` dedups by
  // fileName (re-capturing the same URL updates it in place), so a constant
  // "url-capture.jpg" made EVERY page capture collapse onto a single manifest
  // entry — fetch N pages → N image files but 1 entry → only one card ever bound
  // and the rest were orphaned. Host+path slug keeps distinct URLs distinct while
  // still replacing a re-capture of the same URL.
  const fileName = `${urlToFileSlug(url)}.${ext}`;
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
    projectId,
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
