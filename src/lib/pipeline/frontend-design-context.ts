import fs from "fs/promises";
import path from "path";
import { fetchStitchScreenHtml } from "@/lib/stitch-api";
import {
  readManifest,
  buildVisionDescriptionsForReferences,
  buildVisionDescriptionsFromDir,
  formatVisionDescriptionsBlock,
} from "@/lib/pipeline/design-references";

const TOOL_TRANSCRIPT_MARKER = "## Tool Transcript";
const MAX_PENCIL_SUMMARY_CHARS = 12_000;

/**
 * PencilDesign.md is mostly MCP tool dumps. Codegen models attend to the summary
 * and layout hints at the top; the transcript dilutes the prompt and hides DesignSpec.
 */
export function preparePencilDesignForCodegen(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const idx = trimmed.indexOf(TOOL_TRANSCRIPT_MARKER);
  const withoutTranscript =
    idx >= 0 ? trimmed.slice(0, idx).trim() : trimmed;

  const note =
    idx >= 0
      ? "\n\n_(Full Pencil MCP tool transcript omitted from codegen context to reduce noise.)_"
      : "";

  const body = withoutTranscript + note;
  if (body.length <= MAX_PENCIL_SUMMARY_CHARS) return body;
  return `${body.slice(0, MAX_PENCIL_SUMMARY_CHARS)}\n\n[PencilDesign summary truncated for codegen]`;
}

/**
 * Vite serves `frontend/public/` at URL `/`. Exported PNGs must live under
 * `frontend/public/design/` so the app can use `src="/design/..."`.
 * Legacy path `generated-code/public/design/` is still listed if present.
 */
export async function buildPublicDesignAssetsBlock(
  outputRoot: string,
): Promise<string> {
  const dirs: Array<{ abs: string; urlPrefix: string }> = [
    {
      abs: path.join(outputRoot, "frontend", "public", "design"),
      urlPrefix: "/design",
    },
    {
      abs: path.join(outputRoot, "public", "design"),
      urlPrefix: "/design",
    },
  ];

  const seen = new Set<string>();
  const files: string[] = [];

  for (const { abs, urlPrefix } of dirs) {
    try {
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat?.isDirectory()) continue;

      async function walk(dir: string, prefix: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const ent of entries) {
          const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            await walk(full, rel);
          } else {
            const url = `${urlPrefix}/${rel.replace(/\\/g, "/")}`;
            if (!seen.has(url)) {
              seen.add(url);
              files.push(url);
            }
          }
        }
      }
      await walk(abs, "");
    } catch {
      /* skip */
    }
  }

  if (files.length === 0) return "";

  const lines = files.slice(0, 80).map((u) => `- \`${u}\``);
  const more =
    files.length > 80
      ? `\n- _…and ${files.length - 80} more file(s)_`
      : "";
  return [
    "## Design assets on disk (Pencil / exports)",
    "",
    "Vite serves `frontend/public/` at the site root. Use `src=\"/design/...\"` for files listed below.",
    "Match layout and visual hierarchy from the Stitch UI Design reference above.",
    "",
    ...lines,
    more,
  ].join("\n");
}

/** Read Stitch-exported HTML from outputRoot/StitchDesign.html (written by kickoff). */
export async function readStitchDesignHtml(outputRoot: string): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(outputRoot, "StitchDesign.html"), "utf-8");
    return raw.trim();
  } catch {
    return "";
  }
}

export interface StitchDesignMeta {
  projectId: string;
  screenId: string;
  projectUrl: string;
  screenshotUrl?: string | null;
}

/** Read Pencil markdown from root (canonical) or legacy nested paths. */
export async function readPencilDesignDoc(outputRoot: string): Promise<string> {
  const candidates = [
    "PencilDesign.md",
    path.join("frontend", "public", "design", "PencilDesign.md"),
    path.join("public", "design", "PencilDesign.md"),
  ];
  for (const rel of candidates) {
    try {
      const raw = await fs.readFile(path.join(outputRoot, rel), "utf-8");
      if (raw.trim()) return raw;
    } catch {
      /* try next */
    }
  }
  return "";
}

const MAX_STITCH_HTML_CHARS = 40_000;

/**
 * Prepare Stitch-exported HTML for injection into the coding context.
 * Strips scripts, styles, and inline event handlers but PRESERVES
 * HTML structure (tags with class names, attributes) so the model can
 * understand DOM hierarchy, flex layout, and Tailwind classes.
 */
function prepareStitchHtmlForCodegen(raw: string): string {
  if (!raw.trim()) return "";
  const cleaned = raw
    // Remove <style> blocks and their content
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Remove <script> blocks and their content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Remove inline event handlers
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Collapse whitespace within text nodes (but keep HTML tags intact)
    .replace(/>\s+</g, ">\n<")
    .replace(/\s{3,}/g, "  ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= MAX_STITCH_HTML_CHARS) return cleaned;
  return `${cleaned.slice(0, MAX_STITCH_HTML_CHARS)}\n\n[Stitch design HTML truncated for codegen]`;
}

/**
 * Single place to assemble what the supervisor passes as `frontendDesignContext`:
 * Stitch UI design (primary) + DesignSpec (secondary) + optional public/design assets.
 *
 * Priority:
 *   1. Stitch UI Design — the MCP-generated high-fidelity design is the PRIMARY
 *      reference for reproducing the UI. Coding agents must match the Stitch
 *      output exactly (layout, colors, spacing, component hierarchy).
 *   2. Design Specification — used as supplementary reference only when the
 *      Stitch design lacks sufficient detail.
 */
export async function buildFrontendDesignContextForCodegen(
  outputRoot: string,
  designSpecDoc: string,
  pencilDesignRaw: string,
  stitchMeta?: StitchDesignMeta,
  projectRoot?: string,
): Promise<string> {
  console.log("[FrontendDesignContext] ── building frontend coding context ──");
  console.log(`[FrontendDesignContext] outputRoot = ${outputRoot}`);
  console.log(`[FrontendDesignContext] projectRoot = ${projectRoot ?? process.cwd()}`);
  console.log(
    `[FrontendDesignContext] designSpecDoc = ${designSpecDoc.trim() ? `${designSpecDoc.length} chars` : "(empty)"}`,
  );
  console.log(
    `[FrontendDesignContext] pencilDesignRaw = ${pencilDesignRaw.trim() ? `${pencilDesignRaw.length} chars` : "(empty)"}`,
  );
  // ── Fetch fresh Stitch design at coding time ──────────────────────────────
  // The user may have modified the design in Stitch after kickoff, so the
  // cached StitchDesign.html is stale. Call Stitch MCP get_screen to get
  // the latest HTML + screenshot URL, then overwrite the cache.
  const freshScreenshotUrl = stitchMeta?.screenshotUrl ?? null;
  if (stitchMeta?.projectId && stitchMeta?.screenId) {
    try {
      const freshHtml = await fetchStitchScreenHtml(stitchMeta.projectId, stitchMeta.screenId);
      if (freshHtml) {
        await fs.writeFile(path.join(outputRoot, "StitchDesign.html"), freshHtml, "utf-8");
        console.log("[FrontendDesignContext] Fresh Stitch HTML fetched via MCP get_screen, cache overwritten.");
      }
    } catch (e) {
      console.warn("[FrontendDesignContext] Failed to fetch fresh Stitch HTML, falling back to cached:", e);
    }
  }

  const stitchRaw = await readStitchDesignHtml(outputRoot);
  const stitchText = prepareStitchHtmlForCodegen(stitchRaw);
  console.log(
    `[FrontendDesignContext] StitchDesign.html = ${path.join(outputRoot, "StitchDesign.html")} ${stitchRaw ? `(${stitchRaw.length} chars)` : "(missing)"}`,
  );
  const assets = await buildPublicDesignAssetsBlock(outputRoot);

  // Log the Stitch project URL for debugging
  if (stitchMeta?.projectUrl) {
    console.log(`[FrontendDesignContext] Stitch UI Design available at: ${stitchMeta.projectUrl}`);
  } else if (stitchText) {
    console.log("[FrontendDesignContext] StitchDesign.html found on disk but no project URL in metadata (legacy session).");
  }

  const stitchBlock = stitchText
    ? [
        "## (PRIMARY) Stitch UI Design — source of truth for visual layout",
        "",
        "The following is the HTML structure from a high-fidelity UI design exported from Google Stitch. " +
        "The HTML tags, class names (Tailwind), and DOM hierarchy are preserved so you can reproduce " +
        "the exact layout, component structure, and styling.",
        stitchMeta?.projectUrl
          ? `Stitch project URL: ${stitchMeta.projectUrl}`
          : "",
        freshScreenshotUrl
          ? `Stitch design screenshot reference URL: ${freshScreenshotUrl}`
          : "",
        "",
        "**THIS IS THE PRIMARY DESIGN REFERENCE.** You MUST reproduce the UI exactly as shown in the Stitch design.",
        "For every component, layout section, color, spacing, and design token: FIRST use the matching semantic token utility; only fall back to a Tailwind arbitrary value when no token matches.",
        "Do NOT deviate from the Stitch design unless the Design Specification explicitly contradicts it.",
        "",
        stitchText,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const designSpecBlock = designSpecDoc.trim()
    ? `## (SECONDARY) Design Specification\n\nUse as supplementary reference only when the Stitch design lacks sufficient detail. Component behavior specifications, data-display logic, and edge cases described here should be applied on top of the Stitch visual layout.\n\n${designSpecDoc}`
    : "";

  const pencil = preparePencilDesignForCodegen(pencilDesignRaw);
  const pencilBlock = (!stitchText && pencil)
    ? `## Pencil design (implementation summary) — fallback when no Stitch design\n\n${pencil}`
    : "";

  // ── Vision descriptions from per-page screenshots ─────────────────────────
  // When the user has uploaded per-page screenshots during the design step,
  // generate AI descriptions of each screenshot so coding agents can replicate
  // the exact layout, colors, and components.
  let visionBlock = "";
  const rootForVision = projectRoot ?? process.cwd();
  const canonicalDir = path.join(rootForVision, ".blueprint", "design-references");
  const fallbackDir = path.join(outputRoot, ".design-references");
  try {
    let refEntries = await readManifest(rootForVision);
    let resolvedDir = canonicalDir;
    let usedFallback = false;

    if (refEntries.length === 0) {
      // Fallback: coding mirrors .blueprint/design-references → outputRoot/.design-references.
      // If the canonical source is missing (cleaned/moved), read from the mirror.
      try {
        const raw = await fs.readFile(path.join(fallbackDir, "manifest.json"), "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          refEntries = parsed.filter(
            (x: unknown): x is { kind?: string; storedFileName?: string } =>
              typeof x === "object" && x !== null &&
              typeof (x as { storedFileName?: unknown }).storedFileName === "string",
          ) as typeof refEntries;
          resolvedDir = fallbackDir;
          usedFallback = true;
        }
      } catch {
        /* no fallback either */
      }
    }

    console.log(
      `[FrontendDesignContext] design-references manifest = ${path.join(resolvedDir, "manifest.json")} (${refEntries.length} entr${refEntries.length === 1 ? "y" : "ies"})${usedFallback ? " [fallback: outputRoot/.design-references]" : ""}`,
    );

    const imageRefs = refEntries.filter((e) => e.kind === "image");
    if (imageRefs.length > 0) {
      console.log(
        `[FrontendDesignContext] image references (${imageRefs.length}):`,
      );
      for (const r of imageRefs) {
        const pageHint = r.pageHint ? ` [${r.pageHint}]` : "";
        console.log(
          `  - ${path.join(resolvedDir, r.storedFileName)} (orig: ${r.fileName})${pageHint}`,
        );
      }
      const descriptions = usedFallback
        ? await buildVisionDescriptionsFromDir(resolvedDir, imageRefs)
        : await buildVisionDescriptionsForReferences(rootForVision, imageRefs);
      visionBlock = formatVisionDescriptionsBlock(imageRefs, descriptions);
    } else {
      console.log("[FrontendDesignContext] no image references in manifest.");
    }
  } catch (err) {
    console.warn("[FrontendDesignContext] Failed to build vision descriptions (ignored):", err instanceof Error ? err.message : err);
  }

  // ── (REQUIRED) Fidelity + component-system rule ───────────────────────────
  // Two goals that must BOTH hold — they are not a trade-off:
  //   (1) faithfully reproduce the reference (layout, background incl. gradients,
  //       type scale, radius, shadow, spacing), and
  //   (2) implement it by composing the pre-installed shadcn-ui components + tokens.
  // Earlier wording ("references define the target, NOT the markup") was read as
  // permission to simplify/deviate from the layout — removed.
  const componentSystemBlock = [
    "## (REQUIRED) Reproduce the design faithfully — built from shadcn + tokens",
    "",
    "Two requirements that BOTH must hold (not a trade-off):",
    "",
    "**A. Visual fidelity — match the design reference closely.**",
    "Reproduce the reference's layout, section structure, page background,",
    "typography scale, border-radius, shadows and spacing as faithfully as you",
    "can. Do NOT simplify, genericise, or drop sections. Specifically:",
    "- Keep the page's real title / headings exactly as the reference shows them;",
    "  do NOT substitute a generic placeholder (e.g. relabelling the page",
    "  \"Dashboard\"/\"Home\" when the reference shows a specific title).",
    "- Apply the page-level BACKGROUND from the design. If a gradient token exists",
    "  (`--page-gradient`, `--*-gradient`) use it via",
    "  `style={{ background: \"var(--page-gradient)\" }}`; never leave a page on a",
    "  bare white background when the reference has a tinted/gradient backdrop.",
    "- Match the reference's radius (rounded-xl/2xl if cards are soft), shadow",
    "  depth, and type scale — use the `--radius-*`, `--shadow-*`, `--text-*` tokens.",
    "- Reproduce filters/tabs/tables with their real options/columns and wire them",
    "  up; do not render an empty or non-functional version.",
    "",
    "**B. Build it from the pre-installed shadcn-ui components.**",
    "This project ships shadcn-ui components in `@/components/ui` (Button, Card,",
    "Input, Textarea, Label, Select, Dropdown-menu, Checkbox, Tabs, Tooltip,",
    "Dialog, Badge, Table, Form, Sonner). Compose them to hit the target above:",
    "- Interactive elements → the matching shadcn component; do NOT hand-roll raw",
    "  `<button>`/`<input>`/`<select>`/`<textarea>`.",
    "- Tab bars → `<Tabs>`/`<TabsList>`/`<TabsTrigger>` (not a row of plain buttons).",
    "- Status pills, tags, labels, chips → `<Badge>` (closest variant), not a",
    "  styled `<span>`.",
    "- Tabular data → `<Table>` (TableHeader/TableRow/TableHead/TableCell), not a",
    "  raw `<table>`.",
    "- Drop to a plain `<div>`/`<span>`/`<section>` ONLY for layout structure no",
    "  component covers. Missing a component? add it under `components/ui/` (or",
    "  `npx shadcn@latest add <name>`) instead of hand-rolling.",
    "",
    "### Styling: tokens first, NO inlined design values",
    "- `tokens.css` encodes the design's exact palette/scale: `--color-*`",
    "  (→ bg-primary, text-muted, border-input …), `--radius-*`, `--spacing-*`",
    "  (→ p-4, gap-6), `--text-*`, `--shadow-*` (→ shadow-sm), `--leading-*`, plus",
    "  passthrough gradients (`--page-gradient`, `--*-gradient`). ALWAYS use the",
    "  matching token; do not approximate with `text-gray-500` etc.",
    "- Gradient/background with a token → apply via the token",
    "  (`style={{ background: \"var(--<name>-gradient)\" }}` or",
    "  `bg-[image:var(--<name>-gradient)]`); NEVER paste the literal",
    "  `linear-gradient(... #hex ...)`.",
    "- Only when NO token matches may you use a Tailwind arbitrary value",
    "  (`bg-[#1e293b]`). Never paste raw hex that a token already covers.",
  ].join("\n");

  const referenceBlocks = [visionBlock, stitchBlock, designSpecBlock, pencilBlock, assets].filter(Boolean);
  // Preserve original "nothing to inject" semantics: only emit the component-system
  // rule when there is at least one design reference to frame.
  if (referenceBlocks.length === 0) return "";

  return [componentSystemBlock, ...referenceBlocks].join("\n\n---\n\n");
}
