import { NextRequest, NextResponse } from "next/server";
import {
  deleteDesignReference,
  updateDesignReference,
} from "@/lib/pipeline/design-references";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const projectId =
    new URL(request.url).searchParams.get("projectId") || undefined;
  let body: {
    label?: string;
    pageHint?: string;
    matchedBy?: "auto" | "manual";
    matchConfidence?: "high" | "medium" | "low" | null;
    cssToken?: Record<string, string>;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }
  const updated = await updateDesignReference(
    projectRoot(),
    id,
    {
      label: body.label,
      pageHint: body.pageHint,
      matchedBy: body.matchedBy,
      matchConfidence: body.matchConfidence ?? undefined,
      cssToken: body.cssToken,
    },
    projectId,
  );
  if (!updated) {
    return NextResponse.json(
      { error: `No reference found with id "${id}".` },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, reference: updated });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const projectId =
    new URL(request.url).searchParams.get("projectId") || undefined;
  const references = await deleteDesignReference(projectRoot(), id, projectId);
  return NextResponse.json({ ok: true, references });
}
