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
import { isSafeProjectId } from "@/lib/pipeline/prototype-route-guards";
import { projectHasDemoUrl, planPrototypePages, type PlannedPage } from "@/lib/pipeline/prototype-page-plan";
import { writePrototypeRouter, type PrototypeRoutePage } from "@/lib/pipeline/prototype-router";
import {
  buildPortMessage,
  extractDemoCss,
  extractThemeScopeClass,
} from "@/lib/agents/prototype/build-port-message";
import { buildFreegenMessage } from "@/lib/agents/prototype/build-freegen-message";
import { ensureDemoCssImport, PROTOTYPE_DEMO_CSS_REL } from "@/lib/pipeline/prototype-demo-css";
import { scopeCss, PROTOTYPE_ROOT_CLASS } from "@/lib/pipeline/scope-css";
import { listScaffoldUiComponents } from "@/lib/pipeline/scaffold-ui-components";
import { extractTsxFromLlmOutput } from "@/lib/agents/prototype/extract-tsx";
import { PrototypeAgent } from "@/lib/agents/prototype/prototype-agent";
import {
  readPrototypeMarker,
  writePrototypeMarker,
  type PrototypeMarker,
  type PrototypeMarkerPage,
} from "@/lib/pipeline/prototype-marker";
import { buildFrontendDesignContextForCodegen } from "@/lib/pipeline/frontend-design-context";

export const maxDuration = 600;

/** Page-count budget for ONE run (kept small to stay well under maxDuration=600s;
 *  the remainder is reported as `truncated` and picked up on the next resume run). */
const PROTOTYPE_PAGE_CAP = 16;
/** Pages generated concurrently per batch. */
const BATCH_SIZE = 4;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prdContent = "", projectId, codeOutputDir, tier, pageId, sessionId } = body as {
    prdContent?: string; projectId?: string; codeOutputDir?: string;
    tier?: string; pageId?: string; sessionId?: string;
  };

  if (!isSafeProjectId(projectId)) {
    return new Response(JSON.stringify({ error: "Invalid projectId" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (d: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(d)}\n\n`));
      const fail = (error: string) => { send({ type: "error", error }); controller.close(); };

      try {
        send({ type: "prototype_start" });

        // Gate: demo URL must be on record.
        const manifest = await readManifest(process.cwd(), projectId);
        if (!projectHasDemoUrl(manifest)) {
          send({ type: "prototype_skipped", reason: "no-demo-url" });
          controller.close();
          return;
        }

        const { scopeTier, scaffoldTier } = resolvePrototypeTier(prdContent, tier);
        if (scaffoldTier === "S") {
          return fail("Prototype supports M/L tier scaffolds only; S-tier wiring is deferred.");
        }

        const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);
        send({ type: "scaffold_copy_start", scaffoldTier, scopeTier });
        await copyBaseScaffoldForPrototype(scaffoldTier, outputRoot);
        const frontendDir = resolveFrontendDir(outputRoot, scaffoldTier);
        send({ type: "scaffold_copy_complete" });

        // Plan pages (resume against any existing marker).
        const existing = await readPrototypeMarker(outputRoot);
        const allHints = extractPrdPageHints(prdContent);
        const hints = pageId ? allHints.filter((h) => h.id === pageId) : allHints;
        const { pages, truncated } = planPrototypePages(hints, manifest, existing, PROTOTYPE_PAGE_CAP);
        send({ type: "plan_ready", total: pages.length, truncated });
        if (truncated > 0) {
          send({ type: "log", message: `Page cap ${PROTOTYPE_PAGE_CAP} reached; ${truncated} page(s) deferred to a re-run.` });
        }

        // Shared design-system context (read DesignSpec.md best-effort).
        let designSpecDoc = "";
        try { designSpecDoc = await fs.readFile(path.join(outputRoot, "DesignSpec.md"), "utf-8"); } catch { /* best-effort */ }
        const designContext = await buildFrontendDesignContextForCodegen(
          outputRoot, designSpecDoc, "", undefined, process.cwd(), projectId ?? undefined,
        );

        // Constrain generated imports to the shadcn components actually installed
        // in the scaffold (avoids `@/components/ui/<x>` import errors at dev-server time).
        const availableComponents = await listScaffoldUiComponents(frontendDir);

        const refDir = designReferenceDirAbs(process.cwd(), projectId);
        const viewsDir = path.join(frontendDir, "src", "views");
        await fs.mkdir(viewsDir, { recursive: true });
        const frontendRel = path.relative(outputRoot, frontendDir);

        const generatedPages: PrototypeMarkerPage[] = [];
        const generatedFiles: string[] = [];
        // FULL compiled CSS carried from each ported page's captured <style>, deduped
        // by exact text (same-origin SPA → identical bundle per page collapses to one).
        // Scoped under `.prototype-root` before writing so it can't pollute the shell.
        const demoCssChunks = new Set<string>();

        async function generateOne(p: PlannedPage, index: number): Promise<void> {
          send({ type: "page_start", index, total: pages.length, pageId: p.pageId, name: p.name, source: p.source });
          let message: string;
          if (p.entry && (p.source === "demo-html" || p.source === "url")) {
            const storedName = p.entry.storedFileName;
            if (storedName.includes("/") || storedName.includes("\\") || storedName.includes("..")) {
              throw new Error(`Unsafe reference filename: ${storedName}`);
            }
            const capturedHtml = await fs.readFile(path.join(refDir, storedName), "utf-8");
            // Carry the demo's FULL compiled CSS (utilities + custom classes + vars)
            // so the verbatim ported classes render exactly as the demo — no
            // reconstruction, no hallucinated tokens. It is scoped after the loop.
            const demoCss = extractDemoCss(capturedHtml);
            if (demoCss) demoCssChunks.add(demoCss);
            const themeScopeClass = extractThemeScopeClass(capturedHtml) ?? undefined;
            message = buildPortMessage({
              componentName: p.componentName, pageName: p.name, route: p.route,
              capturedHtml, designContext, prdExcerpt: prdContent, themeScopeClass,
              availableComponents,
            });
          } else {
            message = buildFreegenMessage({
              componentName: p.componentName,
              hint: { id: p.pageId, name: p.name, route: p.route },
              prdContent, designContext, availableComponents,
            });
          }
          const result = await new PrototypeAgent().portPage(message, "", sessionId);
          const tsx = extractTsxFromLlmOutput(result.content);
          const viewRel = path.join("src", "views", `${p.componentName}.tsx`);
          await fs.writeFile(path.join(frontendDir, viewRel), tsx, "utf-8");
          generatedPages.push({ pageId: p.pageId, route: p.route, source: p.source, file: viewRel });
          generatedFiles.push(path.join(frontendRel, viewRel));
          send({ type: "page_complete", index, pageId: p.pageId, file: viewRel });
        }

        // Bounded-parallel batches; a failed page is logged, others continue.
        let failed = 0;
        for (let i = 0; i < pages.length; i += BATCH_SIZE) {
          const batch = pages.slice(i, i + BATCH_SIZE);
          const settled = await Promise.allSettled(batch.map((p, j) => generateOne(p, i + j)));
          settled.forEach((s, j) => {
            if (s.status === "rejected") {
              failed++;
              const p = batch[j];
              send({ type: "page_error", index: i + j, pageId: p.pageId, error: String(s.reason) });
            }
          });
        }

        // Carry the demo's full CSS into the scaffold, scoped under .prototype-root so
        // the verbatim ported classes resolve without polluting the scaffold shell.
        if (demoCssChunks.size > 0) {
          const scoped = [...demoCssChunks]
            .map((css) => scopeCss(css, `.${PROTOTYPE_ROOT_CLASS}`))
            .filter(Boolean)
            .join("\n");
          const demoCss =
            `/* Prototype: demo CSS carried verbatim and scoped under .${PROTOTYPE_ROOT_CLASS}. Generated; do not edit. */\n` +
            `${scoped}\n`;
          const demoCssAbs = path.join(frontendDir, PROTOTYPE_DEMO_CSS_REL);
          await fs.mkdir(path.dirname(demoCssAbs), { recursive: true });
          await fs.writeFile(demoCssAbs, demoCss, "utf-8");
          const indexCssAbs = path.join(frontendDir, "src", "index.css");
          try {
            const idx = await fs.readFile(indexCssAbs, "utf-8");
            const updated = ensureDemoCssImport(idx);
            if (updated !== idx) await fs.writeFile(indexCssAbs, updated, "utf-8");
            generatedFiles.push(path.join(frontendRel, "src", "index.css"));
          } catch { /* index.css should exist from the scaffold; skip if not */ }
          generatedFiles.push(path.join(frontendRel, PROTOTYPE_DEMO_CSS_REL));
          send({ type: "log", message: `Carried ${demoCssChunks.size} demo stylesheet(s), scoped under .${PROTOTYPE_ROOT_CLASS}.` });
        }

        // Merge marker (resume-aware) + regenerate router from ALL pages.
        const mergedPages: PrototypeMarkerPage[] = [...(existing?.pages ?? []), ...generatedPages];
        const mergedFiles = Array.from(new Set([
          ...(existing?.generatedFiles ?? []),
          ...generatedFiles,
          path.join(frontendRel, "src", "router.tsx"),
        ]));
        const routerPages: PrototypeRoutePage[] = mergedPages.map((mp) => ({
          componentName: path.basename(mp.file).replace(/\.tsx$/, ""),
          route: mp.route,
        }));
        await writePrototypeRouter(frontendDir, routerPages);

        const marker: PrototypeMarker = {
          generatedAt: new Date().toISOString(),
          scaffoldTier, scopeTier, baseScaffoldCopied: true,
          pages: mergedPages, generatedFiles: mergedFiles,
        };
        await writePrototypeMarker(outputRoot, marker);

        send({ type: "prototype_complete", generated: generatedPages.length, failed, truncated, totalPages: mergedPages.length });
        controller.close();
      } catch (err) {
        fail(err instanceof Error ? err.message : "Unknown error");
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
