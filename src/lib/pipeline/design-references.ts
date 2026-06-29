import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { openRouterVisionChatCompletion } from "@/lib/openrouter";

/**
 * Design references — user-supplied screenshots that guide the coding phase.
 *
 * Layout on disk:
 *   .blueprint/design-references/
 *     manifest.json            — array of DesignReferenceEntry
 *     <id>.<ext>               — image binary
 *
 * At kickoff time, `copyDesignReferencesToOutput` mirrors the whole folder
 * into `<outputRoot>/.design-references/` so coding workers (and humans)
 * can consult the files from inside the generated project.
 */

/**
 * "image" — static screenshot/mockup. Coding agents only see it via the
 * label/target hint (no vision pass yet) but humans can browse it from
 * the dialog and the file lives in `<output>/.design-references/`.
 *
 * "html" — a self-contained HTML file the user uploaded as a complete
 * page reference (layout + interactions + CSS, possibly inline JS).
 * Agents are instructed to open it from `<output>/.design-references/`
 * to study the structure before generating the matching page.
 */
export type DesignReferenceKind = "image" | "html";

export interface DesignReferenceEntry {
  /** Stable random id used for filenames and API routes. */
  id: string;
  /** Original filename supplied by the uploader (display only). */
  fileName: string;
  /** Filename on disk (`<id>.<ext>`); always lives under the references dir. */
  storedFileName: string;
  /** MIME type, e.g. `image/png` or `text/html`. */
  mime: string;
  bytes: number;
  /**
   * What kind of artifact this reference is. Defaults to `"image"` when a
   * legacy manifest entry (written before HTML support) is read back.
   */
  kind: DesignReferenceKind;
  /** Human-readable label. For URL sources, stores the source URL. */
  label: string;
  /**
   * Optional hint binding this reference to a page/route or PRD section,
   * e.g. `/login`, `FR-AU01`, `PAGE-01`. Empty string when unspecified.
   */
  pageHint: string;
  /** ISO timestamp. */
  uploadedAt: string;
  /** Where this asset came from. Defaults to "upload" for legacy entries. */
  source: "upload" | "url";
  /** How pageHint was set. "manual" entries are never overwritten by auto-match. */
  matchedBy: "auto" | "manual";
  /** Present only when matchedBy === "auto". */
  matchConfidence?: "high" | "medium" | "low";
  /** CSS custom-property map extracted from the source page. URL sources only. */
  cssToken?: Record<string, string>;
}

const REFERENCE_DIR_REL = path.join(".blueprint", "design-references");
const MANIFEST_FILE = "manifest.json";

const MAX_BYTES_IMAGE = 6 * 1024 * 1024;
// HTML often inlines base64 assets and CSS; allow more room than images.
const MAX_BYTES_HTML = 8 * 1024 * 1024;
// Upper bound on total references per project. Sized to comfortably cover a
// large multi-page PRD (one screenshot per route + a few modal/state variants)
// — e.g. a 40+ route platform. This is a UX/storage guardrail only: auto-match
// runs ONE Vision call per image (see autoMatchReferencesToPages), so a higher
// cap means more sequential calls, never a larger single-request payload.
const MAX_TOTAL_REFERENCES = 64;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "text/html": "html",
  "application/xhtml+xml": "html",
};

const HTML_EXTS = new Set([".html", ".htm", ".xhtml"]);

export const ACCEPTED_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];
export const ACCEPTED_HTML_MIMES = ["text/html", "application/xhtml+xml"];
export const ACCEPTED_REFERENCE_MIMES = [
  ...ACCEPTED_IMAGE_MIMES,
  ...ACCEPTED_HTML_MIMES,
];

function inferHtmlFromFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  for (const ext of HTML_EXTS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function resolveKindAndMime(
  rawMime: string,
  fileName: string,
): { mime: string; kind: DesignReferenceKind; ext: string } | null {
  const mime = (rawMime || "").toLowerCase();
  if (EXT_BY_MIME[mime]) {
    const ext = EXT_BY_MIME[mime]!;
    const kind: DesignReferenceKind = ACCEPTED_HTML_MIMES.includes(mime)
      ? "html"
      : "image";
    return { mime, kind, ext };
  }
  // MIME is missing or generic (e.g. `application/octet-stream` from drag-drop
  // on some browsers). Fall back to filename sniffing for HTML, since that's
  // the only kind that commonly arrives with the wrong type.
  if (inferHtmlFromFileName(fileName)) {
    return { mime: "text/html", kind: "html", ext: "html" };
  }
  return null;
}

export function designReferenceDirAbs(
  projectRoot: string,
  projectId?: string,
): string {
  return projectId
    ? path.join(projectRoot, ".blueprint", "projects", projectId, "design-references")
    : path.join(projectRoot, REFERENCE_DIR_REL);
}

/** A stored reference image, decoded to a vision-ready data URL. */
export interface ReferenceImageDataUrl {
  dataUrl: string;
  label?: string;
  pageHint?: string;
}

/**
 * Load this project's stored reference IMAGES as vision-ready data URLs (capped).
 * Shared by the PRD-intent and intent-recheck vision passes so they read the
 * same per-project set. Best-effort: returns [] on any failure.
 */
export async function loadReferenceImagesAsDataUrls(
  projectRoot: string,
  projectId?: string,
  max = 8,
): Promise<ReferenceImageDataUrl[]> {
  try {
    const refs = await readManifest(projectRoot, projectId);
    const imageRefs = refs.filter((r) => r.kind === "image").slice(0, max);
    const dir = designReferenceDirAbs(projectRoot, projectId);
    const out: ReferenceImageDataUrl[] = [];
    for (const ref of imageRefs) {
      try {
        const bytes = await fs.readFile(path.join(dir, ref.storedFileName));
        out.push({
          dataUrl: `data:${ref.mime};base64,${bytes.toString("base64")}`,
          label: ref.label || ref.fileName,
          pageHint: ref.pageHint || undefined,
        });
      } catch {
        // skip unreadable file
      }
    }
    return out;
  } catch {
    return [];
  }
}

function manifestPathAbs(projectRoot: string, projectId?: string): string {
  return path.join(designReferenceDirAbs(projectRoot, projectId), MANIFEST_FILE);
}

async function ensureDir(projectRoot: string, projectId?: string): Promise<void> {
  await fs.mkdir(designReferenceDirAbs(projectRoot, projectId), { recursive: true });
}

export async function readManifest(
  projectRoot: string,
  projectId?: string,
): Promise<DesignReferenceEntry[]> {
  try {
    const raw = await fs.readFile(manifestPathAbs(projectRoot, projectId), "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is Partial<DesignReferenceEntry> =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as DesignReferenceEntry).id === "string" &&
          typeof (x as DesignReferenceEntry).storedFileName === "string",
      )
      .map((x): DesignReferenceEntry => {
        // Backfill `kind` for entries written before HTML support landed.
        const explicitKind = (x as DesignReferenceEntry).kind;
        const mime = (x as DesignReferenceEntry).mime ?? "";
        const inferredKind: DesignReferenceKind = ACCEPTED_HTML_MIMES.includes(
          mime.toLowerCase(),
        )
          ? "html"
          : "image";
        return {
          id: (x as DesignReferenceEntry).id,
          fileName: (x as DesignReferenceEntry).fileName ?? "",
          storedFileName: (x as DesignReferenceEntry).storedFileName,
          mime,
          bytes: (x as DesignReferenceEntry).bytes ?? 0,
          kind: explicitKind ?? inferredKind,
          label: (x as DesignReferenceEntry).label ?? "",
          pageHint: (x as DesignReferenceEntry).pageHint ?? "",
          uploadedAt:
            (x as DesignReferenceEntry).uploadedAt ?? new Date(0).toISOString(),
          // Backfill new fields for entries written before this feature landed.
          source: (x as DesignReferenceEntry).source ?? "upload",
          matchedBy: (x as DesignReferenceEntry).matchedBy ?? "auto",
          ...((x as DesignReferenceEntry).matchConfidence !== undefined && {
            matchConfidence: (x as DesignReferenceEntry).matchConfidence,
          }),
          ...((x as DesignReferenceEntry).cssToken !== undefined && {
            cssToken: (x as DesignReferenceEntry).cssToken,
          }),
        };
      });
  } catch {
    return [];
  }
}

async function writeManifest(
  projectRoot: string,
  entries: DesignReferenceEntry[],
  projectId?: string,
): Promise<void> {
  await ensureDir(projectRoot, projectId);
  await fs.writeFile(
    manifestPathAbs(projectRoot, projectId),
    JSON.stringify(entries, null, 2),
    "utf-8",
  );
}

export interface AddDesignReferenceInput {
  fileName: string;
  mime: string;
  bytes: Buffer;
  label?: string;
  pageHint?: string;
  source?: "upload" | "url";
  matchedBy?: "auto" | "manual";
  matchConfidence?: "high" | "medium" | "low";
  cssToken?: Record<string, string>;
  /** When set, persists under `.blueprint/projects/<projectId>/design-references/`. */
  projectId?: string;
}

export interface AddDesignReferenceResult {
  ok: true;
  entry: DesignReferenceEntry;
  manifest: DesignReferenceEntry[];
}

export interface AddDesignReferenceFailure {
  ok: false;
  error: string;
  status: number;
}

/**
 * Persists a single uploaded reference (image or HTML page) and appends
 * it to the manifest.
 */
export async function addDesignReference(
  projectRoot: string,
  input: AddDesignReferenceInput,
): Promise<AddDesignReferenceResult | AddDesignReferenceFailure> {
  const projectId = input.projectId;
  const resolved = resolveKindAndMime(input.mime, input.fileName);
  if (!resolved) {
    return {
      ok: false,
      status: 415,
      error: `Unsupported reference type "${input.mime || "(none)"}". Allowed: ${ACCEPTED_REFERENCE_MIMES.join(", ")}.`,
    };
  }

  const limit =
    resolved.kind === "html" ? MAX_BYTES_HTML : MAX_BYTES_IMAGE;
  if (input.bytes.byteLength > limit) {
    return {
      ok: false,
      status: 413,
      error: `File is too large (${input.bytes.byteLength} bytes). Limit for ${resolved.kind}: ${limit} bytes.`,
    };
  }

  const existing = await readManifest(projectRoot, projectId);

  // Dedup by fileName: if the same filename is uploaded again, replace the
  // existing entry in-place so repeated uploads don't eat into the quota.
  const normalizedName = input.fileName.slice(0, 200) || "";
  const dupeIdx = normalizedName
    ? existing.findIndex((e) => e.fileName === normalizedName)
    : -1;

  if (dupeIdx === -1 && existing.length >= MAX_TOTAL_REFERENCES) {
    return {
      ok: false,
      status: 409,
      error: `Already at the ${MAX_TOTAL_REFERENCES}-reference limit. Remove an existing reference first.`,
    };
  }

  const id = crypto.randomBytes(8).toString("hex");
  const storedFileName = `${id}.${resolved.ext}`;
  const entry: DesignReferenceEntry = {
    id,
    fileName: normalizedName || `${id}.${resolved.ext}`,
    storedFileName,
    mime: resolved.mime,
    bytes: input.bytes.byteLength,
    kind: resolved.kind,
    label: (input.label ?? "").trim().slice(0, 200),
    // Keep the old pageHint when replacing so manual assignments survive re-uploads.
    pageHint: (input.pageHint ?? (dupeIdx >= 0 ? existing[dupeIdx]!.pageHint : "")).trim().slice(0, 80),
    uploadedAt: new Date().toISOString(),
    source: input.source ?? "upload",
    matchedBy: input.matchedBy ?? (dupeIdx >= 0 ? existing[dupeIdx]!.matchedBy : "auto"),
    ...(input.matchConfidence !== undefined && { matchConfidence: input.matchConfidence }),
    ...(input.cssToken !== undefined && { cssToken: input.cssToken }),
  };

  await ensureDir(projectRoot, projectId);
  await fs.writeFile(
    path.join(designReferenceDirAbs(projectRoot, projectId), storedFileName),
    input.bytes,
  );

  // Remove old stored file when replacing.
  if (dupeIdx >= 0) {
    const oldStored = existing[dupeIdx]!.storedFileName;
    try {
      await fs.unlink(path.join(designReferenceDirAbs(projectRoot, projectId), oldStored));
    } catch { /* best-effort */ }
  }

  const manifest =
    dupeIdx >= 0
      ? existing.map((e, i) => (i === dupeIdx ? entry : e))
      : [...existing, entry];
  await writeManifest(projectRoot, manifest, projectId);
  return { ok: true, entry, manifest };
}

export interface UpdateDesignReferenceInput {
  label?: string;
  pageHint?: string;
  matchedBy?: "auto" | "manual";
  matchConfidence?: "high" | "medium" | "low" | null;
  cssToken?: Record<string, string>;
}

export async function updateDesignReference(
  projectRoot: string,
  id: string,
  input: UpdateDesignReferenceInput,
  projectId?: string,
): Promise<DesignReferenceEntry | null> {
  const entries = await readManifest(projectRoot, projectId);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const current = entries[idx]!;
  const next: DesignReferenceEntry = {
    ...current,
    label:
      typeof input.label === "string"
        ? input.label.trim().slice(0, 200)
        : current.label,
    pageHint:
      typeof input.pageHint === "string"
        ? input.pageHint.trim().slice(0, 80)
        : current.pageHint,
    matchedBy: input.matchedBy ?? current.matchedBy,
    matchConfidence:
      input.matchConfidence === null
        ? undefined
        : input.matchConfidence ?? current.matchConfidence,
    cssToken: input.cssToken !== undefined ? input.cssToken : current.cssToken,
  };
  entries[idx] = next;
  await writeManifest(projectRoot, entries, projectId);
  return next;
}

export async function deleteDesignReference(
  projectRoot: string,
  id: string,
  projectId?: string,
): Promise<DesignReferenceEntry[]> {
  const entries = await readManifest(projectRoot, projectId);
  const target = entries.find((e) => e.id === id);
  if (!target) return entries;
  try {
    await fs.unlink(
      path.join(designReferenceDirAbs(projectRoot, projectId), target.storedFileName),
    );
  } catch {
    // best-effort
  }
  const next = entries.filter((e) => e.id !== id);
  await writeManifest(projectRoot, next, projectId);
  return next;
}

export async function clearAllDesignReferences(
  projectRoot: string,
  projectId?: string,
): Promise<void> {
  const entries = await readManifest(projectRoot, projectId);
  for (const entry of entries) {
    try {
      await fs.unlink(
        path.join(designReferenceDirAbs(projectRoot, projectId), entry.storedFileName),
      );
    } catch {
      // best-effort
    }
  }
  await writeManifest(projectRoot, [], projectId);
}

export async function readDesignReferenceFile(
  projectRoot: string,
  id: string,
  projectId?: string,
): Promise<{ entry: DesignReferenceEntry; data: Buffer } | null> {
  const entries = await readManifest(projectRoot, projectId);
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  try {
    const data = await fs.readFile(
      path.join(designReferenceDirAbs(projectRoot, projectId), entry.storedFileName),
    );
    return { entry, data };
  } catch {
    return null;
  }
}

/**
 * Mirrors `.blueprint/design-references/` into `<outputRoot>/.design-references/`
 * so that coding workers can read the files through their normal fs tooling.
 * Returns the manifest entries that were copied (empty when nothing exists).
 */
export async function copyDesignReferencesToOutput(
  projectRoot: string,
  outputRoot: string,
  projectId?: string,
): Promise<DesignReferenceEntry[]> {
  const entries = await readManifest(projectRoot, projectId);
  if (entries.length === 0) return [];

  const srcDir = designReferenceDirAbs(projectRoot, projectId);
  const destDir = path.join(outputRoot, ".design-references");
  await fs.mkdir(destDir, { recursive: true });

  for (const entry of entries) {
    const src = path.join(srcDir, entry.storedFileName);
    const dest = path.join(destDir, entry.storedFileName);
    try {
      await fs.copyFile(src, dest);
    } catch (err) {
      console.warn(
        `[DesignReferences] Failed to copy ${entry.storedFileName}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  try {
    await fs.writeFile(
      path.join(destDir, MANIFEST_FILE),
      JSON.stringify(entries, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.warn(
      "[DesignReferences] Failed to write output manifest:",
      err instanceof Error ? err.message : err,
    );
  }

  return entries;
}

/**
 * Reads the mirrored manifest from an output tree (written by
 * `copyDesignReferencesToOutput`). Returns an empty array on any failure.
 */
export async function readDesignReferencesFromOutput(
  outputRoot: string,
): Promise<DesignReferenceEntry[]> {
  try {
    const raw = await fs.readFile(
      path.join(outputRoot, ".design-references", MANIFEST_FILE),
      "utf-8",
    );
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is DesignReferenceEntry =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as DesignReferenceEntry).id === "string" &&
        typeof (x as DesignReferenceEntry).storedFileName === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Formats the manifest as a markdown block that can be injected into the
 * task-breakdown prompt and the coding-worker prompt. Returns an empty
 * string when no references exist (caller should skip the section).
 *
 * Image and HTML references are rendered as separate sub-sections because
 * agents need different instructions for each (HTML can be opened and
 * read with the `read_file` tool; images can only be described).
 */
export function formatDesignReferencesPromptBlock(
  entries: DesignReferenceEntry[],
): string {
  if (entries.length === 0) return "";

  const images = entries.filter((e) => e.kind === "image");
  const htmls = entries.filter((e) => e.kind === "html");

  const renderLine = (entry: DesignReferenceEntry, i: number): string => {
    const label = entry.label || "(no label)";
    const hint = entry.pageHint ? ` — target: \`${entry.pageHint}\`` : "";
    const base = `${i + 1}. \`.design-references/${entry.storedFileName}\` — **${label}**${hint} (original name: \`${entry.fileName}\`, ${entry.mime})`;
    const tokens = entry.cssToken ? Object.entries(entry.cssToken) : [];
    if (tokens.length === 0) return base;
    const tokenLines = tokens.map(([k, v]) => `   - \`${k}\`: \`${v}\``).join("\n");
    return `${base}\n   CSS tokens extracted from this page:\n${tokenLines}`;
  };

  const sections: string[] = [
    "## Design references (user-uploaded)",
    "",
    `The user attached **${entries.length}** reference(s) before coding (${images.length} image, ${htmls.length} HTML). They live under \`.design-references/\` inside the project root (mirrored from \`.blueprint/design-references/\` at kickoff).`,
    "",
  ];

  if (images.length > 0) {
    sections.push(
      "### Image references (screenshots / mockups)",
      "",
      images.map((e, i) => renderLine(e, i)).join("\n"),
      "",
      "Rules for agents:",
      "- Treat each screenshot as the **visual ground truth** for the page listed in its `target` hint. Match layout regions, component placement, colour palette, typography, spacing, and interactive states as closely as possible.",
      "- If a reference has no `target`, apply its aesthetic across the matching feature area (pick the best-fit page by label).",
      "- Do NOT rename, move, or delete files under `.design-references/` — leave them as-is so downstream tooling can consult them.",
      "- When pixel-matching is impossible (e.g. missing image tools), infer the user intent from the label/target and prioritize matching the structural composition.",
      "- **CSS tokens** (when listed under an entry above) are exact design-system values. FIRST reuse a matching semantic token if one already exists; if the value has no token yet, render it precisely with a Tailwind arbitrary value (e.g. `bg-[#6366f1]`, `gap-[8px]`) or CSS custom property. Do not approximate or substitute.",
      "",
    );
  }

  if (htmls.length > 0) {
    sections.push(
      "### HTML references (interactive page mockups)",
      "",
      htmls.map((e, i) => renderLine(e, i)).join("\n"),
      "",
      "Rules for agents:",
      "- HTML references are **fully-rendered, self-contained pages**. They show not just visual layout but also intended **interactions** (hover/active states, transitions, micro-animations, button click flows) and the **DOM structure** the user expects.",
      "- BEFORE generating the matching page, **open the HTML reference with `read_file`** (it lives at `.design-references/<storedFileName>`) and study: the section hierarchy, the CSS classes / Tailwind utilities, any inline `<style>` rules, any inline `<script>` behaviors, and the data shapes implied by example content.",
      "- Replicate **structure + behavior**, not necessarily the exact markup. Use the project's component framework (React/Vue/etc.) — translate the HTML's structure into idiomatic components, but keep the same visual hierarchy, spacing, and interaction model.",
      "- If the HTML uses utility CSS (Tailwind etc.), prefer porting the same utility classes. If it uses custom CSS, port the rule names into the project's styling solution.",
      "- Inline `<script>` behaviors are **specs, not code to copy verbatim**: re-implement the same UX (e.g. tab switching, modal open/close, form validation) using the project's idiomatic patterns (state hooks, controlled components, etc.).",
      "- When the HTML reference and an image reference cover the same `target`, the **HTML reference wins on interaction details**, the image wins on pixel-level visual nuance.",
      "- Do NOT serve the raw HTML at runtime; treat it strictly as a design spec.",
      "",
    );
  }

  return sections.join("\n");
}

// ─── Vision descriptions ──────────────────────────────────────────────────────

const VISION_CACHE_FILE = "design-reference-vision-cache.json";

interface VisionCacheEntry {
  storedFileName: string;
  bytes: number;
  description: string;
  generatedAt: string;
}

async function readVisionCacheFromDir(
  absDir: string,
): Promise<Map<string, VisionCacheEntry>> {
  try {
    const raw = await fs.readFile(path.join(absDir, VISION_CACHE_FILE), "utf-8");
    const arr = JSON.parse(raw) as VisionCacheEntry[];
    return new Map(arr.map((e) => [e.storedFileName, e]));
  } catch {
    return new Map();
  }
}

async function writeVisionCacheToDir(
  absDir: string,
  cache: Map<string, VisionCacheEntry>,
): Promise<void> {
  await fs.mkdir(absDir, { recursive: true });
  await fs.writeFile(
    path.join(absDir, VISION_CACHE_FILE),
    JSON.stringify([...cache.values()], null, 2),
    "utf-8",
  );
}

// ─── Auto-match ───────────────────────────────────────────────────────────────

export interface PageCandidate {
  id: string;   // e.g. "PAGE-001"
  name: string; // e.g. "Dashboard"
}

export interface AutoMatchResult {
  referenceId: string;
  storedFileName: string;
  assignedPageId: string | null;  // null if no confident match
  assignedPageName: string | null;
  confidence: "high" | "medium" | "low";
}

/**
 * Uses a vision LLM to determine which PRD page a screenshot most likely
 * corresponds to. The model is shown the image and the list of candidate
 * pages and must return the best-fit PAGE-xxx id.
 *
 * Returns null when no confident match can be determined.
 */
async function matchImageToPage(
  imageBase64DataUrl: string,
  candidates: PageCandidate[],
): Promise<{ pageId: string | null; confidence: "high" | "medium" | "low" }> {
  const pageList = candidates
    .map((p, i) => `${i + 1}. ${p.name} (${p.id})`)
    .join("\n");

  try {
    const resp = await openRouterVisionChatCompletion(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Look at this UI screenshot and determine which of the following pages it most likely shows.",
                "",
                "Pages:",
                pageList,
                "",
                "Instructions:",
                "- Respond with a JSON object: { \"pageId\": \"PAGE-xxx\", \"confidence\": \"high\" | \"medium\" | \"low\" }",
                "- Use \"high\" if the page content is clearly identifiable (e.g. login form → Login page)",
                "- Use \"medium\" if likely but some ambiguity",
                "- Use \"low\" if you cannot confidently tell",
                "- If none of the pages match, respond: { \"pageId\": null, \"confidence\": \"low\" }",
                "- Respond ONLY with the JSON — no markdown fences, no prose.",
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: { url: imageBase64DataUrl, detail: "low" },
            },
          ],
        },
      ],
      { model: "openai/gpt-4o", max_tokens: 80 },
    );

    const raw = resp.choices[0]?.message?.content;
    const text = typeof raw === "string" ? raw.trim() : "";
    // Strip markdown fences if model ignored the instruction
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned) as { pageId?: string | null; confidence?: string };
    const pageId = typeof parsed.pageId === "string" ? parsed.pageId : null;
    const confidence =
      parsed.confidence === "high" ? "high"
      : parsed.confidence === "medium" ? "medium"
      : "low";
    return { pageId, confidence };
  } catch {
    return { pageId: null, confidence: "low" };
  }
}

/**
 * Automatically matches image design references (those without a pageHint, or
 * all of them when `force` is true) to PRD pages using a vision LLM.
 *
 * Returns the list of match results. Callers should call `updateDesignReference`
 * to persist the assignments they want to keep.
 */
export async function autoMatchReferencesToPages(
  projectRoot: string,
  candidates: PageCandidate[],
  options?: { force?: boolean; minConfidence?: "high" | "medium" | "low" },
  projectId?: string,
): Promise<AutoMatchResult[]> {
  if (candidates.length === 0) return [];

  const entries = await readManifest(projectRoot, projectId);
  const imageEntries = entries.filter(
    (e) =>
      e.kind === "image" &&
      e.matchedBy !== "manual" &&
      (options?.force || !e.pageHint.trim()),
  );
  if (imageEntries.length === 0) return [];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const minConf = options?.minConfidence ?? "medium";
  const confRank: Record<string, number> = { high: 3, medium: 2, low: 1 };

  const results: AutoMatchResult[] = [];

  for (const entry of imageEntries) {
    let imageData: Buffer;
    try {
      imageData = await fs.readFile(
        path.join(designReferenceDirAbs(projectRoot, projectId), entry.storedFileName),
      );
    } catch {
      results.push({
        referenceId: entry.id,
        storedFileName: entry.storedFileName,
        assignedPageId: null,
        assignedPageName: null,
        confidence: "low",
      });
      continue;
    }

    const dataUrl = `data:${entry.mime};base64,${imageData.toString("base64")}`;
    const { pageId, confidence } = await matchImageToPage(dataUrl, candidates);

    const meetsMinConf = confRank[confidence] >= confRank[minConf];
    const matched = meetsMinConf ? candidates.find((c) => c.id === pageId) ?? null : null;

    results.push({
      referenceId: entry.id,
      storedFileName: entry.storedFileName,
      assignedPageId: matched?.id ?? null,
      assignedPageName: matched?.name ?? null,
      confidence,
    });
  }

  return results;
}

/**
 * For each image design reference, call a vision LLM to generate a detailed
 * layout description that coding agents can use to replicate the UI.
 *
 * Results are cached in `.blueprint/design-references/design-reference-vision-cache.json`
 * so we only re-call when an image changes.
 *
 * Returns a map from `storedFileName` → description text.
 */
export async function buildVisionDescriptionsForReferences(
  projectRoot: string,
  entries: DesignReferenceEntry[],
): Promise<Map<string, string>> {
  return buildVisionDescriptionsFromDir(
    designReferenceDirAbs(projectRoot),
    entries,
  );
}

/**
 * Same as `buildVisionDescriptionsForReferences`, but reads images and cache
 * from an arbitrary absolute directory. Used as a fallback when the canonical
 * `<projectRoot>/.blueprint/design-references/` is missing but the mirrored
 * copy at `<outputRoot>/.design-references/` is present.
 */
export async function buildVisionDescriptionsFromDir(
  absDir: string,
  entries: DesignReferenceEntry[],
): Promise<Map<string, string>> {
  const imageEntries = entries.filter((e) => e.kind === "image");
  if (imageEntries.length === 0) return new Map();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[DesignReferences] OPENROUTER_API_KEY not set — skipping vision descriptions");
    return new Map();
  }

  const cache = await readVisionCacheFromDir(absDir);
  const result = new Map<string, string>();
  let cacheUpdated = false;

  for (const entry of imageEntries) {
    const cached = cache.get(entry.storedFileName);
    if (cached && cached.bytes === entry.bytes) {
      result.set(entry.storedFileName, cached.description);
      continue;
    }

    let imageData: Buffer;
    try {
      imageData = await fs.readFile(path.join(absDir, entry.storedFileName));
    } catch {
      console.warn(`[DesignReferences] Could not read ${entry.storedFileName} for vision`);
      continue;
    }

    const base64 = `data:${entry.mime};base64,${imageData.toString("base64")}`;
    const pageHint = entry.pageHint || entry.label || entry.fileName;

    try {
      const resp = await openRouterVisionChatCompletion(
        [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `You are analyzing a UI screenshot for the page: "${pageHint}".`,
                  "Provide a detailed, structured description of this UI screenshot that a frontend developer can use to replicate it accurately.",
                  "Describe:",
                  "1. Overall layout (columns, panels, sidebars, header/footer structure)",
                  "2. Color scheme (background colors, primary/accent colors, text colors)",
                  "3. Typography (font weights, sizes, heading hierarchy)",
                  "4. Key UI components visible (tables, cards, forms, buttons, charts, navigation)",
                  "5. Spacing and visual density",
                  "6. Any notable design patterns or interactions visible",
                  "Be precise and specific — the developer will use this description to write matching code.",
                ].join("\n"),
              },
              {
                type: "image_url",
                image_url: { url: base64, detail: "high" },
              },
            ],
          },
        ],
        { model: "openai/gpt-4o", max_tokens: 1500 },
      );

      const description = resp.choices[0]?.message?.content;
      if (typeof description === "string" && description.trim()) {
        result.set(entry.storedFileName, description.trim());
        cache.set(entry.storedFileName, {
          storedFileName: entry.storedFileName,
          bytes: entry.bytes,
          description: description.trim(),
          generatedAt: new Date().toISOString(),
        });
        cacheUpdated = true;
      }
    } catch (err) {
      console.warn(
        `[DesignReferences] Vision description failed for ${entry.storedFileName}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (cacheUpdated) {
    await writeVisionCacheToDir(absDir, cache).catch((e) =>
      console.warn("[DesignReferences] Failed to persist vision cache:", e),
    );
  }

  return result;
}

/**
 * Formats vision descriptions for image references into a context block
 * that coding agents can use as per-page visual specifications.
 */
export function formatVisionDescriptionsBlock(
  entries: DesignReferenceEntry[],
  descriptions: Map<string, string>,
): string {
  const sections: string[] = [];

  for (const entry of entries) {
    if (entry.kind !== "image") continue;
    const desc = descriptions.get(entry.storedFileName);
    if (!desc) continue;
    const label = entry.pageHint || entry.label || entry.fileName;
    sections.push(`### ${label}\n\n${desc}`);
  }

  if (sections.length === 0) return "";

  return [
    "## Per-page UI screenshot descriptions",
    "",
    "The following are AI-generated descriptions of the user-uploaded screenshots. Use these as visual specifications when generating the frontend — implement the described layout, colors, and components exactly.",
    "",
    ...sections,
  ].join("\n");
}

// ─── Layout blueprint (focused, binding implementation spec) ────────────────

const BLUEPRINT_CACHE_FILE = "layout-blueprint-cache.json";

interface BlueprintCacheEntry {
  storedFileName: string;
  bytes: number;
  blueprint: string;
  generatedAt: string;
}

async function readBlueprintCache(
  absDir: string,
): Promise<Map<string, BlueprintCacheEntry>> {
  try {
    const raw = await fs.readFile(
      path.join(absDir, BLUEPRINT_CACHE_FILE),
      "utf-8",
    );
    const arr = JSON.parse(raw) as BlueprintCacheEntry[];
    return new Map(arr.map((e) => [e.storedFileName, e]));
  } catch {
    return new Map();
  }
}

async function writeBlueprintCache(
  absDir: string,
  cache: Map<string, BlueprintCacheEntry>,
): Promise<void> {
  await fs.mkdir(absDir, { recursive: true });
  await fs.writeFile(
    path.join(absDir, BLUEPRINT_CACHE_FILE),
    JSON.stringify([...cache.values()], null, 2),
    "utf-8",
  );
}

/**
 * Parse a reference screenshot into a BINDING implementation blueprint — a
 * concrete, structured spec the coding model can follow to reproduce the
 * page. Unlike `buildVisionDescriptionsForReferences` (a soft prose
 * description buried in projectContext), this is designed to be injected at
 * the TOP of the codegen user message as the authoritative layout contract
 * that OVERRIDES the task's sub-steps / file names / title — those are often
 * CRUD-table templates that contradict the actual (e.g. card-list) design.
 *
 * Result is cached by storedFileName+bytes in
 * `<dir>/layout-blueprint-cache.json` so repeated UI tasks referencing the
 * same image reuse one vision call. Returns null on any failure (caller must
 * degrade gracefully — never block the worker).
 */
export async function extractReferenceLayoutBlueprint(opts: {
  /** Directory holding the image + where the blueprint cache lives. */
  cacheDir: string;
  storedFileName: string;
  bytes: number;
  /** Pre-built `data:<mime>;base64,...` URL for the image. */
  imageDataUrl: string;
  label?: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn(
      `[LayoutBlueprint] ${opts.storedFileName}: OPENROUTER_API_KEY not set — cannot parse image, returning null.`,
    );
    return null;
  }

  const cache = await readBlueprintCache(opts.cacheDir);
  const cached = cache.get(opts.storedFileName);
  if (cached && cached.bytes === opts.bytes) {
    console.log(
      `[LayoutBlueprint] ${opts.storedFileName}: CACHE HIT (${cached.bytes}B) — reusing, no vision call.`,
    );
    return cached.blueprint;
  }
  console.log(
    `[LayoutBlueprint] ${opts.storedFileName}: cache miss (cached=${cached ? `${cached.bytes}B` : "none"}, want=${opts.bytes}B) — calling vision (gpt-4o)…`,
  );

  try {
    const resp = await openRouterVisionChatCompletion(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Analyze this UI screenshot${opts.label ? ` (page: "${opts.label}")` : ""} and produce a BINDING IMPLEMENTATION BLUEPRINT a frontend engineer must follow to reproduce it. Be concrete and decisive — this blueprint overrides any generic task description.`,
                "",
                "Output these sections, in this order:",
                "",
                "1. **Page layout type** — state the ONE dominant pattern explicitly: e.g. 'vertical list of cards', 'data table with column headers', 'KPI dashboard grid', 'split master-detail'. Do NOT hedge. If it is a list of rich cards, say cards (NOT a table).",
                "2. **Global chrome** — is there a top brand/logo, global nav bar (list the nav items verbatim), user menu, cart, notification badge? If none, say 'none'.",
                "3. **Page header** — the exact H1 text, any subtitle text, and any header-right controls (buttons/counts) with their exact labels.",
                "4. **Filter / toolbar row** — controls and their exact labels, if present.",
                "5. **Per-item anatomy** — for the repeating unit (card/row), list EVERY visible element in visual order: thumbnail/image, primary title, secondary metadata lines (verbatim label format, e.g. 'Buyer: <name>'), status pill (list the EXACT status strings seen), price/amount formatting, and the action buttons with their EXACT labels. Note if different states show different button sets.",
                "6. **Distinct states shown** — list each visually distinct state/variant visible in the screenshot.",
                "7. **Do NOT render** — list elements a generic CRUD template would add but that are ABSENT here (e.g. raw database IDs, Edit/Delete buttons, a New/Create button) so the engineer does not invent them.",
                "",
                "Keep it tight and factual. No code, no preamble.",
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: { url: opts.imageDataUrl, detail: "high" },
            },
          ],
        },
      ],
      { model: "openai/gpt-4o", max_tokens: 1600 },
    );

    const blueprint = resp.choices[0]?.message?.content;
    if (typeof blueprint === "string" && blueprint.trim()) {
      const text = blueprint.trim();
      cache.set(opts.storedFileName, {
        storedFileName: opts.storedFileName,
        bytes: opts.bytes,
        blueprint: text,
        generatedAt: new Date().toISOString(),
      });
      await writeBlueprintCache(opts.cacheDir, cache).catch(() => {});
      return text;
    }
  } catch (err) {
    console.warn(
      `[DesignReferences] Layout blueprint extraction failed for ${opts.storedFileName}:`,
      err instanceof Error ? err.message : err,
    );
  }
  return null;
}

/**
 * Build a compact, TEXT-ONLY per-page design digest block for the
 * task-breakdown stage. For each uploaded IMAGE reference it produces (and
 * caches) a layout blueprint via `extractReferenceLayoutBlueprint`, then
 * formats them into one markdown block.
 *
 * Why text, not images: a project can have many pages × large screenshots;
 * feeding raw images to task-breakdown would blow up input tokens AND repeat
 * the cost on every re-run. Instead each image is parsed to a ~compact digest
 * ONCE (cached in `<absDir>/layout-blueprint-cache.json` — the SAME cache the
 * coding stage reads), and task-breakdown receives only the text. The vision
 * call count equals the number of images, not the number of tasks or breakdown
 * re-runs.
 *
 * Graceful degradation:
 *   - No image references → returns "" (task-breakdown behaves exactly as
 *     before, decomposing from PRD text).
 *   - A page with no screenshot simply has no digest here — the prompt tells
 *     the model to decompose those from the PRD as usual. The "don't invent
 *     components" rule is scoped to pages that DO have a digest.
 *   - Any per-image extraction failure (no API key, read error) is skipped;
 *     never throws.
 */
export async function buildLayoutDigestBlock(
  absDir: string,
  entries: DesignReferenceEntry[],
): Promise<string> {
  const images = entries.filter((e) => e.kind === "image");
  console.log(
    `[LayoutDigest] ── building per-page design digests ──\n` +
      `  dir: ${absDir}\n` +
      `  manifest entries: ${entries.length} (images: ${images.length})` +
      (images.length
        ? `\n  images: ${images.map((e) => `${e.storedFileName}[${e.pageHint || e.label || e.fileName}]`).join(", ")}`
        : ""),
  );
  if (images.length === 0) {
    console.log(
      "[LayoutDigest] no image references → digest block is empty (task-breakdown will use PRD text only).",
    );
    return "";
  }

  const sections: string[] = [];
  for (const entry of images) {
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(path.join(absDir, entry.storedFileName));
    } catch (e) {
      console.warn(
        `[LayoutDigest] SKIP ${entry.storedFileName} — image file not readable at ${absDir} (${e instanceof Error ? e.message : e})`,
      );
      continue;
    }
    const dataUrl = `data:${entry.mime};base64,${bytes.toString("base64")}`;
    const label = entry.pageHint || entry.label || entry.fileName;
    console.log(
      `[LayoutDigest] parsing ${entry.storedFileName} (${(bytes.byteLength / 1024).toFixed(0)}KB, label="${label}") …`,
    );
    const t0 = Date.now();
    const blueprint = await extractReferenceLayoutBlueprint({
      cacheDir: absDir,
      storedFileName: entry.storedFileName,
      // Match the byte count the coding stage passes (actual file size) so the
      // cache key is identical and the blueprint is computed exactly once
      // across both stages.
      bytes: bytes.byteLength,
      imageDataUrl: dataUrl,
      label,
    });
    if (!blueprint) {
      console.warn(
        `[LayoutDigest] ✗ ${entry.storedFileName}: no blueprint produced (vision failed / no API key) — this page will NOT have a digest.`,
      );
      continue;
    }
    // First line of the blueprint is "1. **Page layout type** — …" — surface it
    // so you can confirm the parse direction at a glance.
    const layoutLine =
      blueprint
        .split("\n")
        .map((l) => l.trim())
        .find((l) => /layout type/i.test(l)) ?? "(layout line not found)";
    console.log(
      `[LayoutDigest] ✓ ${entry.storedFileName} digested in ${Date.now() - t0}ms (${blueprint.length} chars) → ${layoutLine}`,
    );
    sections.push(`### ${label}\n${blueprint}`);
  }

  if (sections.length === 0) {
    console.warn(
      "[LayoutDigest] no digests produced from any image → block empty.",
    );
    return "";
  }

  console.log(
    `[LayoutDigest] ✅ digest block ready: ${sections.length}/${images.length} image(s) digested.`,
  );

  return [
    "## Per-page design digests — AUTHORITATIVE for UI structure (parsed from the user's uploaded screenshots)",
    "",
    "These screenshots were uploaded by the user AFTER the PRD was written, and each is tied to a specific page. For UI STRUCTURE they OUTRANK the PRD: the PRD's prose about how a page looks may be stale or generic, while the screenshot is the user's latest, explicit intent.",
    "",
    "Rules:",
    "- For any page that HAS a digest below, the digest is the SOURCE OF TRUTH for that page's layout and components. Decompose its frontend task(s) to MATCH the digest EXACTLY: build only the components/regions it lists, with the labels it shows.",
    "- This OVERRIDES the PRD for that page. If the PRD describes summary/KPI cards, a stats dashboard, an invoice table, or modals that the digest does NOT show, DROP them — do not create tasks for them. Conversely, if the digest shows a 'vertical list of cards' with receipt actions, the task is a card list, NOT a dashboard. Keep the PRD only for non-visual functional requirements (data sources, validation, flows) that don't contradict the digest's structure.",
    "- Pages with NO digest below have no screenshot — decompose those from the PRD text as usual (a legitimate dashboard/table is fine there).",
    "",
    ...sections,
  ].join("\n");
}

/**
 * One-stop block for the task-breakdown stage: reads the manifest under
 * `projectRoot`, then returns the per-page design digests (image-derived,
 * cached) joined with the file-listing block. Returns "" when there are no
 * references. Use this anywhere task-breakdown is invoked so the breakdown
 * decomposes against the real designs — both the main engine path AND the
 * standalone `/api/agents/task-breakdown` regenerate path.
 */
export async function buildBreakdownDesignReferencesBlock(
  projectRoot: string,
  projectId?: string,
): Promise<string> {
  let entries: DesignReferenceEntry[];
  try {
    entries = await readManifest(projectRoot, projectId);
  } catch {
    return "";
  }
  if (entries.length === 0) return "";
  const dir = designReferenceDirAbs(projectRoot, projectId);
  const digest = await buildLayoutDigestBlock(dir, entries);
  const fileBlock = formatDesignReferencesPromptBlock(entries);
  return [digest, fileBlock].filter(Boolean).join("\n\n---\n\n");
}
