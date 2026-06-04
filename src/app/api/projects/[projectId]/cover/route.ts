/**
 * POST /api/projects/[projectId]/cover — store a captured preview screenshot
 * as the project's cover image.
 *
 * Body: { dataUrl: "data:image/jpeg;base64,..." }
 *
 * The bytes are decoded and written to public/project-covers/<id>.jpg so they
 * are served statically at /project-covers/<id>.jpg; the public path is then
 * persisted on the project row. A cache-busting `?v=<ts>` is appended so the
 * UI refreshes when a cover is re-captured.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProjectBySlug, updateProjectCover } from "@/lib/project-store";

const COVERS_DIR = path.join(process.cwd(), "public", "project-covers");

// Accept jpeg/png data URLs; cap the decoded size to avoid runaway writes.
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

async function resolveProjectId(idOrSlug: string): Promise<string | null> {
  const byId = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, idOrSlug))
    .limit(1);
  if (byId[0]) return byId[0].id;
  const bySlug = await getProjectBySlug(idOrSlug);
  return bySlug?.id ?? null;
}

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { dataUrl?: unknown };

    if (typeof body.dataUrl !== "string") {
      return NextResponse.json({ message: "dataUrl is required." }, { status: 400 });
    }

    const match = DATA_URL_RE.exec(body.dataUrl);
    if (!match) {
      return NextResponse.json(
        { message: "dataUrl must be a base64 JPEG or PNG image." },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length === 0 || bytes.length > MAX_BYTES) {
      return NextResponse.json(
        { message: "Image is empty or exceeds the size limit." },
        { status: 400 },
      );
    }

    const id = await resolveProjectId(projectId);
    if (!id) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    // Always store as .jpg (the capture pipeline produces JPEG); a PNG upload
    // is still written under the .jpg name and served fine by content sniffing.
    await fs.mkdir(COVERS_DIR, { recursive: true });
    const fileName = `${id}.jpg`;
    await fs.writeFile(path.join(COVERS_DIR, fileName), bytes);

    const coverImagePath = `/project-covers/${fileName}?v=${bytes.length}`;
    await updateProjectCover(id, coverImagePath);

    return NextResponse.json({ ok: true, coverImagePath });
  } catch (err) {
    console.error("[api/projects/[projectId]/cover] POST error:", err);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
