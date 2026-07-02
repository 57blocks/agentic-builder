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
import {
  projectHasDemoUrl,
  planPrototypePages,
  keepPagesWithExistingFiles,
  type PlannedPage,
} from "@/lib/pipeline/prototype-page-plan";
import { writePrototypeRouter, type PrototypeRoutePage } from "@/lib/pipeline/prototype-router";
import {
  buildPortMessage,
  extractDemoCss,
  extractThemeScopeClass,
} from "@/lib/agents/prototype/build-port-message";
import { buildFreegenMessage } from "@/lib/agents/prototype/build-freegen-message";
import { ensureDemoCssImport, PROTOTYPE_DEMO_CSS_REL } from "@/lib/pipeline/prototype-demo-css";
import {
  ensureAnchorNavWired,
  PROTOTYPE_ANCHOR_NAV_REL,
  PROTOTYPE_ANCHOR_NAV_SOURCE,
} from "@/lib/pipeline/prototype-anchor-nav";
import { scopeCss, PROTOTYPE_ROOT_CLASS } from "@/lib/pipeline/scope-css";
import { listScaffoldUiComponents } from "@/lib/pipeline/scaffold-ui-components";
import {
  deriveDemoOrigin,
  relativizeDemoHrefs,
  rewriteNextImageUrls,
  collectDemoImageUrls,
  demoAssetLocalPath,
} from "@/lib/pipeline/prototype-links";
import { extractTsxFromLlmOutput, isTsxComplete } from "@/lib/agents/prototype/extract-tsx";
import { validateUiImports, buildImportRepairMessage } from "@/lib/agents/prototype/validate-ui-imports";
import { PrototypeAgent } from "@/lib/agents/prototype/prototype-agent";
import {
  readPrototypeMarker,
  writePrototypeMarker,
  prototypeMarkerPath,
  type PrototypeMarker,
  type PrototypeMarkerPage,
} from "@/lib/pipeline/prototype-marker";
import { buildFrontendDesignContextForCodegen } from "@/lib/pipeline/frontend-design-context";

export const maxDuration = 600;

/** Page-count budget for ONE run (bounded so a single request stays under
 *  maxDuration=600s; any remainder is reported as `truncated` and picked up on
 *  the next resume run — the UI auto-continues until nothing is left). */
const PROTOTYPE_PAGE_CAP = 50;
/** Pages generated concurrently per batch. */
const BATCH_SIZE = 4;

/**
 * Marker status for hydration. The prototype step UI keeps generation progress in
 * React state only; on remount (Fast Refresh, page reload, tab switch) that resets
 * even though the pages are still on disk. This lets the UI restore the "already
 * generated" state by reading `.blueprint/prototype.json`. Returns `{ exists:false }`
 * when no prototype was generated — the UI then shows its normal empty state.
 */
export async function GET(request: NextRequest) {
  const codeOutputDir = request.nextUrl.searchParams.get("codeOutputDir") ?? undefined;
  const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);
  const marker = await readPrototypeMarker(outputRoot);
  const body = marker
    ? {
        exists: true,
        scaffoldTier: marker.scaffoldTier,
        generatedAt: marker.generatedAt,
        pages: marker.pages.map((p) => ({
          pageId: p.pageId,
          route: p.route,
          source: p.source,
          file: p.file,
        })),
      }
    : { exists: false };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prdContent = "", projectId, codeOutputDir, tier, pageId, sessionId, force = false } = body as {
    prdContent?: string; projectId?: string; codeOutputDir?: string;
    tier?: string; pageId?: string; sessionId?: string; force?: boolean;
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

        // Plan pages. `force` = full regenerate: discard the marker + delete its
        // generated view files so every page is rebuilt fresh (no resume-skip, no
        // stale/orphan views). Otherwise resume against the existing marker, first
        // reconciling it with disk: pages whose view file was deleted must be
        // regenerated (not skipped) and must not be imported by the router.
        const existingRaw = await readPrototypeMarker(outputRoot);
        let existing = existingRaw;
        if (force && existingRaw) {
          let removed = 0;
          for (const pg of existingRaw.pages) {
            try { await fs.rm(path.join(frontendDir, pg.file), { force: true }); removed++; } catch { /* ignore */ }
          }
          await fs.rm(prototypeMarkerPath(outputRoot), { force: true }).catch(() => {});
          existing = null;
          send({ type: "log", message: `Force regenerate: cleared marker + ${removed} previously generated view(s).` });
        } else if (existingRaw && existingRaw.pages.length > 0) {
          let present = new Set<string>();
          try {
            const files = await fs.readdir(path.join(frontendDir, "src", "views"));
            present = new Set(files.map((f) => path.join("src", "views", f)));
          } catch { /* views dir missing → treat all as absent */ }
          const kept = keepPagesWithExistingFiles(existingRaw.pages, (f) => present.has(f));
          if (kept.length !== existingRaw.pages.length) {
            send({ type: "log", message: `Marker reconcile: ${existingRaw.pages.length - kept.length} page(s) missing on disk — regenerating.` });
          }
          existing = { ...existingRaw, pages: kept };
        }
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
        // Demo origin → rewrite absolutised nav hrefs back to relative paths so the
        // ported pages navigate their OWN routes (capture absolutises URLs).
        const demoOrigin = deriveDemoOrigin(manifest);

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

        // Localize demo images into public/ so pages don't hotlink the live demo
        // (cross-site requests get rate-limited/blocked by the demo's CDN and by
        // browsers). Deduped across pages; best-effort (a failed download keeps the
        // absolute URL). Map value = the download's success promise.
        const assetCache = new Map<string, Promise<boolean>>();
        async function downloadDemoAsset(url: string, absDest: string): Promise<boolean> {
          try {
            const resp = await fetch(encodeURI(url), { redirect: "follow", signal: AbortSignal.timeout(20000) });
            if (!resp.ok) return false;
            const buf = Buffer.from(await resp.arrayBuffer());
            await fs.mkdir(path.dirname(absDest), { recursive: true });
            await fs.writeFile(absDest, buf);
            return true;
          } catch {
            return false;
          }
        }
        async function localizeImages(tsx: string): Promise<string> {
          if (!demoOrigin) return tsx;
          let out = tsx;
          let localized = 0;
          for (const url of collectDemoImageUrls(out, demoOrigin)) {
            const localRel = demoAssetLocalPath(url, demoOrigin);
            const absDest = path.join(frontendDir, "public", decodeURIComponent(localRel));
            let pending = assetCache.get(url);
            if (!pending) {
              pending = downloadDemoAsset(url, absDest);
              assetCache.set(url, pending);
            }
            if (await pending) {
              out = out.split(url).join(localRel);
              localized++;
            }
          }
          if (localized > 0) send({ type: "log", message: `Localized ${localized} image(s) into public/.` });
          return out;
        }

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
          let tsx = extractTsxFromLlmOutput(result.content);

          // Post-gen safety net: if the file imports uninstalled @/components/ui/*
          // components, do ONE targeted repair pass; warn if it's still unresolved.
          if (availableComponents.length > 0) {
            let invalid = validateUiImports(tsx, availableComponents);
            if (invalid.length > 0) {
              send({ type: "page_repair", index, pageId: p.pageId, invalid });
              const repairMsg = buildImportRepairMessage(tsx, invalid, availableComponents);
              const repaired = await new PrototypeAgent().portPage(repairMsg, "", sessionId);
              tsx = extractTsxFromLlmOutput(repaired.content);
              invalid = validateUiImports(tsx, availableComponents);
              if (invalid.length > 0) {
                send({ type: "page_warning", index, pageId: p.pageId, message: `Unresolved component import(s) after repair: ${invalid.join(", ")}` });
              }
            }
          }

          // Rewrite absolutised demo-origin nav hrefs → relative, so links navigate
          // this prototype's own routes (and the anchor-nav delegate can intercept them).
          tsx = relativizeDemoHrefs(tsx, demoOrigin);
          // Unwrap Next.js image-optimizer URLs → direct demo assets (relative srcSet
          // 404s on the dev server; the optimizer endpoint is unreliable cross-origin).
          tsx = rewriteNextImageUrls(tsx, demoOrigin);
          // Download demo images into public/ and point src/srcSet at the local copy —
          // no cross-origin hotlinking (works in any browser, offline, demo-independent).
          tsx = await localizeImages(tsx);

          // Reject truncated/incomplete output (e.g. hit max_tokens) BEFORE writing:
          // a malformed view breaks the Vite build and would be silently skipped by
          // resume (file "exists"). Throwing routes it to page_error → not written →
          // regenerated on the next run.
          if (!isTsxComplete(tsx)) {
            throw new Error(
              `generated view for ${p.pageId} (${p.name}) looks truncated/incomplete — likely hit the output-token limit`,
            );
          }

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

        // Make the demo's verbatim `<a href="/…">` anchors navigate client-side, so
        // the multi-page prototype is clickable for review (ported markup keeps raw
        // anchors, not react-router <Link>). Writes the delegate component + wires it
        // into main.tsx once (idempotent).
        try {
          const navAbs = path.join(frontendDir, PROTOTYPE_ANCHOR_NAV_REL);
          await fs.mkdir(path.dirname(navAbs), { recursive: true });
          await fs.writeFile(navAbs, PROTOTYPE_ANCHOR_NAV_SOURCE, "utf-8");
          generatedFiles.push(path.join(frontendRel, PROTOTYPE_ANCHOR_NAV_REL));
          const mainAbs = path.join(frontendDir, "src", "main.tsx");
          const main = await fs.readFile(mainAbs, "utf-8");
          const wiredMain = ensureAnchorNavWired(main);
          if (wiredMain !== main) {
            await fs.writeFile(mainAbs, wiredMain, "utf-8");
            generatedFiles.push(path.join(frontendRel, "src", "main.tsx"));
          }
        } catch { /* main.tsx should exist from the scaffold; skip if not */ }

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
