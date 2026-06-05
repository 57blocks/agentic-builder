import { NextRequest } from "next/server";
import path from "path";
import { readBugFixCheckpoint, writeBugFixCheckpoint, type BugFixCheckpointEntry } from "@/lib/pipeline/bug-fix-checkpoint";

export async function GET(req: NextRequest) {
  const outputDir = req.nextUrl.searchParams.get("outputDir")
    ?? path.resolve(process.cwd(), "generated-code");

  const checkpoint = await readBugFixCheckpoint(outputDir);
  return Response.json({ checkpoint });
}

export async function POST(req: NextRequest) {
  const { outputDir: rawOutputDir, entries, sessionId } = await req.json() as {
    outputDir?: string;
    sessionId?: string;
    entries: BugFixCheckpointEntry[];
  };

  const outputDir = rawOutputDir ?? path.resolve(process.cwd(), "generated-code");
  await writeBugFixCheckpoint(outputDir, sessionId ?? "draft", entries);
  return Response.json({ ok: true });
}
