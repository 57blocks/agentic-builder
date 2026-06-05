import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { maybeExtractAndPersistPlan } from "@/lib/agentic-build";

const DOC_FILENAME: Record<string, string> = {
  prd: "PRD.md",
  trd: "TRD.md",
  sysdesign: "SystemDesign.md",
  implguide: "ImplementationGuide.md",
  design: "DesignSpec.md",
  pencil: "PencilDesign.md",
  qa: "QATestCases.md",
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { docId, content, codeOutputDir } = body as {
    docId: string;
    content: string;
    codeOutputDir?: string;
  };

  if (!docId || content === undefined) {
    return Response.json(
      { error: "docId and content are required" },
      { status: 400 },
    );
  }

  const filename = DOC_FILENAME[docId];
  if (!filename) {
    return Response.json({ error: `Unknown docId: ${docId}` }, { status: 400 });
  }

  const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);
  const filePath = path.join(outputRoot, filename);

  try {
    await fs.mkdir(outputRoot, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");

    // Goal-mode gate: when a PRD is saved, conservatively detect whether it
    // carries a runnable milestone+acceptance plan and, if so, extract +
    // persist `.blueprint/build-plan.json`. This arms goal mode at the coding
    // stage. Best-effort: detection is a cheap regex, so ordinary PRDs incur
    // zero LLM cost, and any failure never blocks the save.
    let planPersisted = false;
    if (docId === "prd") {
      try {
        const gate = await maybeExtractAndPersistPlan({
          projectRoot: outputRoot,
          specMarkdown: content,
        });
        planPersisted = gate.persisted;
        console.log(`[SaveDoc] PRD plan gate: ${gate.reason}`);
      } catch (e) {
        console.warn(
          `[SaveDoc] plan gate failed (ignored): ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    return Response.json({ ok: true, filename, planPersisted });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Write failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
