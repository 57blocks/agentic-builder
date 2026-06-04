import { NextRequest } from "next/server";
import path from "path";
import { listFiles } from "@/lib/langgraph/tools";
import { analyzeBugReport } from "@/lib/pipeline/bug-fix-analysis";
import type { BugReport } from "@/lib/pipeline/bug-fix-session";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json() as { bug: BugReport; outputDir?: string };
  const { bug, outputDir: rawOutputDir } = body;

  if (!bug?.id || !bug?.title) {
    return Response.json({ error: "bug.id and bug.title are required" }, { status: 400 });
  }

  const outputDir = rawOutputDir ?? path.resolve(process.cwd(), "generated-code");

  try {
    const fileList = await listFiles(".", outputDir);
    const result = await analyzeBugReport(bug, fileList);
    return Response.json(result);
  } catch (err) {
    console.warn("[bug-fix-analysis] Failed:", err instanceof Error ? err.message : err);
    return Response.json({ likelyFiles: [], role: "backend" });
  }
}
