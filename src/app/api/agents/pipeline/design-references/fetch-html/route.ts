import { NextRequest, NextResponse } from "next/server";
import { addDesignReference } from "@/lib/pipeline/design-references";
import { urlToFileSlug } from "../_url-slug";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
}

/**
 * Persists a captured self-contained HTML snapshot to the design-reference
 * store as a `kind:"html"` entry, bound to the page's PAGE-id (manual). Sibling
 * to `fetch-url` (which stores the screenshot). Both share one PAGE-id, so they
 * land on the same Route-Mapping card.
 *
 * Body: { url, html, pageHint?, projectId? }
 */
export async function POST(request: NextRequest) {
  let body: { url?: string; html?: string; pageHint?: string; projectId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url, html, pageHint } = body;
  const projectId =
    new URL(request.url).searchParams.get("projectId") ||
    (typeof body.projectId === "string" && body.projectId ? body.projectId : undefined);

  if (!html || typeof html !== "string" || html.trim().length === 0) {
    return NextResponse.json({ error: "html is required." }, { status: 400 });
  }

  const buffer = Buffer.from(html, "utf-8");
  const fileName = `${urlToFileSlug(url)}.html`;
  const isManual = typeof pageHint === "string" && pageHint.trim().length > 0;

  const result = await addDesignReference(projectRoot(), {
    fileName,
    mime: "text/html",
    bytes: buffer,
    label: typeof url === "string" ? url.trim().slice(0, 200) : "",
    pageHint: isManual ? pageHint!.trim() : "",
    source: "url",
    matchedBy: isManual ? "manual" : "auto",
    projectId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    referenceId: result.entry.id,
    pageHint: result.entry.pageHint || null,
    references: result.manifest,
  });
}
