// src/app/api/agents/prototype/route.ts
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { readManifest, designReferenceDirAbs } from "@/lib/pipeline/design-references";
import { extractPrdPageHints } from "@/lib/requirements/prd-page-hints";
import {
  resolvePrototypeTier,
  resolveFrontendDir,
  copyBaseScaffoldForPrototype,
} from "@/lib/pipeline/prototype-scaffold";
import { selectPageSource } from "@/lib/pipeline/prototype-page-source";
import { toViewComponentName, writePrototypeRouter } from "@/lib/pipeline/prototype-router";
import { buildPortMessage } from "@/lib/agents/prototype/build-port-message";
import { extractTsxFromLlmOutput } from "@/lib/agents/prototype/extract-tsx";
import { PrototypeAgent } from "@/lib/agents/prototype/prototype-agent";
import { writePrototypeMarker } from "@/lib/pipeline/prototype-marker";
import { buildFrontendDesignContextForCodegen } from "@/lib/pipeline/frontend-design-context";
import { isSafeProjectId } from "@/lib/pipeline/prototype-route-guards";

export const maxDuration = 600;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    prdContent = "",
    projectId,
    codeOutputDir,
    tier,
    pageId,
    sessionId,
  } = body as {
    prdContent?: string;
    projectId?: string;
    codeOutputDir?: string;
    tier?: string;
    pageId?: string;
    sessionId?: string;
  };

  if (!isSafeProjectId(projectId)) {
    return new Response(JSON.stringify({ error: "Invalid projectId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        send({ type: "prototype_start" });

        const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);
        const { scopeTier, scaffoldTier } = resolvePrototypeTier(prdContent, tier);
        if (scaffoldTier === "S") {
          send({
            type: "error",
            error:
              "Prototype vertical slice supports M/L tier scaffolds only; S-tier router wiring is deferred to the full step.",
          });
          controller.close();
          return;
        }
        send({ type: "scaffold_copy_start", scaffoldTier, scopeTier });
        await copyBaseScaffoldForPrototype(scaffoldTier, outputRoot);
        const frontendDir = resolveFrontendDir(outputRoot, scaffoldTier);
        send({ type: "scaffold_copy_complete" });

        const hints = extractPrdPageHints(prdContent);
        const hint = pageId ? hints.find((h) => h.id === pageId) : hints[0];
        if (!hint) {
          send({ type: "error", error: `No PRD page hint found${pageId ? ` for ${pageId}` : ""}` });
          controller.close();
          return;
        }

        const manifest = await readManifest(process.cwd(), projectId);
        const sel = selectPageSource(hint, manifest);
        if (sel.source === "design-spec" || !sel.entry) {
          send({
            type: "error",
            error: `Page ${hint.id} (${hint.name}) has no captured HTML; this slice supports demo-html/url pages only.`,
          });
          controller.close();
          return;
        }
        send({ type: "page_selected", pageId: hint.id, name: hint.name, source: sel.source });

        const storedName = sel.entry.storedFileName;
        if (storedName.includes("/") || storedName.includes("\\") || storedName.includes("..")) {
          send({ type: "error", error: `Unsafe reference filename: ${storedName}` });
          controller.close();
          return;
        }
        const htmlPath = path.join(designReferenceDirAbs(process.cwd(), projectId), storedName);
        const capturedHtml = await fs.readFile(htmlPath, "utf-8");

        let designSpecDoc = "";
        try {
          designSpecDoc = await fs.readFile(path.join(outputRoot, "DesignSpec.md"), "utf-8");
        } catch {
          // best-effort
        }
        const designContext = await buildFrontendDesignContextForCodegen(
          outputRoot,
          designSpecDoc,
          "",
          undefined,
          process.cwd(),
          projectId ?? undefined,
        );

        const componentName = toViewComponentName(hint.name);
        const route = hint.route ?? `/${slugify(hint.name)}`;
        const message = buildPortMessage({
          componentName,
          pageName: hint.name,
          route,
          capturedHtml,
          designContext,
          prdExcerpt: prdContent,
        });
        send({ type: "port_start", componentName, route });
        // designContext is already embedded in `message` by buildPortMessage; don't send it twice.
        const result = await new PrototypeAgent().portPage(message, "", sessionId);
        const tsx = extractTsxFromLlmOutput(result.content);

        const viewRelFromFrontend = path.join("src", "views", `${componentName}.tsx`);
        await fs.mkdir(path.join(frontendDir, "src", "views"), { recursive: true });
        await fs.writeFile(path.join(frontendDir, viewRelFromFrontend), tsx, "utf-8");
        await writePrototypeRouter(frontendDir, [{ componentName, route }]);

        const frontendRelFromRoot = path.relative(outputRoot, frontendDir);
        const generatedFiles = [
          path.join(frontendRelFromRoot, viewRelFromFrontend),
          path.join(frontendRelFromRoot, "src", "router.tsx"),
        ];
        // marker.pages[].file is frontend-relative; generatedFiles is output-root-relative.
        await writePrototypeMarker(outputRoot, {
          generatedAt: new Date().toISOString(),
          scaffoldTier,
          scopeTier,
          baseScaffoldCopied: true,
          pages: [{ pageId: hint.id, route, source: sel.source, file: viewRelFromFrontend }],
          generatedFiles,
        });

        send({
          type: "prototype_complete",
          route,
          file: viewRelFromFrontend,
          costUsd: result.costUsd,
          durationMs: result.durationMs,
          model: result.model,
        });
        controller.close();
      } catch (err) {
        send({ type: "error", error: err instanceof Error ? err.message : "Unknown error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
