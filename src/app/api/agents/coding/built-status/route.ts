/**
 * POST /api/agents/coding/built-status
 *
 * Reports which tasks are already built ON DISK — a task counts as built when
 * every file in its `files.creates` exists under the code-output root. Lets the
 * coding UI's task picker show real completion even when there is no live
 * session or checkpoint (e.g. after a dev-server restart / crash), so
 * "select unfinished tasks to re-run" doesn't sweep in already-generated tasks.
 */

import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";

interface TaskFilesShape {
  creates?: string[];
  modifies?: string[];
  reads?: string[];
}
interface IncomingTask {
  id: string;
  files?: string[] | TaskFilesShape | null;
}

function createsOf(files: IncomingTask["files"]): string[] {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return files.creates ?? [];
}

export async function POST(req: Request) {
  let body: { tasks?: IncomingTask[]; codeOutputDir?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  const outputRoot = resolveCodeOutputRoot(process.cwd(), body.codeOutputDir);

  const builtIds: string[] = [];
  await Promise.all(
    tasks.map(async (t) => {
      if (!t || typeof t.id !== "string") return;
      const creates = createsOf(t.files);
      // No declared creates → can't prove built from disk; leave it out so the
      // UI keeps whatever live/pending status it already has.
      if (creates.length === 0) return;
      const allExist = (
        await Promise.all(
          creates.map(async (rel) => {
            try {
              await fs.access(path.join(outputRoot, rel));
              return true;
            } catch {
              return false;
            }
          }),
        )
      ).every(Boolean);
      if (allExist) builtIds.push(t.id);
    }),
  );

  return NextResponse.json({ builtIds });
}
