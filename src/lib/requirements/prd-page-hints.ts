/**
 * Lightweight, client-safe utility to extract page/screen names from PRD markdown.
 * Uses pattern matching only — no LLM required.
 */

export interface PrdPageHint {
  id: string;   // e.g. "PAGE-001"
  name: string; // e.g. "Dashboard"
}

/** Section headings that mean "here come the pages" */
const PAGE_SECTION_PATTERNS = [
  /^#+\s+(?:\d+\.\s+)?(?:key\s+)?(?:pages?|screens?|views?|ui\s+(?:pages?|screens?|views?)|interfaces?|routes?)\b/i,
  /^#+\s+(?:\d+\.\s+)?(?:functional\s+requirements?|feature\s+specs?|user\s+interface)\b/i,
];

/** Headers that should be excluded (non-page top-level sections) */
const SKIP_HEADERS = new Set([
  "overview", "introduction", "background", "summary", "executive summary",
  "goals", "objectives", "success criteria", "out of scope", "non-goals",
  "technical requirements", "technical stack", "tech stack",
  "non-functional requirements", "nfr", "api", "database", "backend",
  "timeline", "milestones", "appendix", "glossary", "references",
  "user stories", "acceptance criteria", "analytics", "monitoring",
  "security", "privacy", "accessibility", "performance", "infrastructure",
  "deployment", "testing", "future work", "changelog",
]);

/** Looks like a page header: "Login Page", "Dashboard", "User Profile", etc. */
function looksLikePage(title: string): boolean {
  const lower = title.toLowerCase();
  // Skip generic section headings
  const cleaned = lower.replace(/^\d+(\.\d+)*\s*/, "").replace(/[:-]\s*.*$/, "").trim();
  if (SKIP_HEADERS.has(cleaned)) return false;
  // Skip very long lines (likely prose, not headings)
  if (title.length > 80) return false;
  // Positive signals
  if (/\bpage\b|\bscreen\b|\bview\b|\bpanel\b|\bdashboard\b|\bmodal\b|\bdrawer\b/i.test(title)) return true;
  // Looks like a route: contains "/" or starts with "/"
  if (/\/[a-z]/.test(title)) return true;
  return false;
}

/**
 * Extract candidate page names from PRD markdown.
 *
 * Strategy:
 * 1. Find H2 sections that signal "here are pages" → treat all H3 under them as pages
 * 2. Look for H2/H3 headers that explicitly mention "page" or "screen"
 * 3. Find FR-xxx style headers and treat them as page candidates if they sound page-like
 */
export function extractPrdPageHints(markdown: string): PrdPageHint[] {
  if (!markdown.trim()) return [];

  const lines = markdown.split("\n");
  const seen = new Set<string>();
  const results: PrdPageHint[] = [];

  let inPageSection = false;
  let pageSectionDepth = 0; // depth of the header that triggered inPageSection

  const addPage = (rawTitle: string) => {
    // Strip leading number prefixes (e.g. "3.1 " or "FR-001: ")
    const name = rawTitle
      .replace(/^[\d.]+\s+/, "")
      .replace(/^(?:FR|US|AC|SC|PG|PAGE)-\d+[:.]\s*/i, "")
      .replace(/\s*\(.*?\)\s*/g, "") // strip parenthesised notes
      .trim();
    if (!name || name.length < 2) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const id = `PAGE-${String(results.length + 1).padStart(3, "0")}`;
    results.push({ id, name });
  };

  for (const line of lines) {
    const h2m = line.match(/^##\s+(.+)/);
    const h3m = line.match(/^###\s+(.+)/);
    const h4m = line.match(/^####\s+(.+)/);

    if (h2m) {
      pageSectionDepth = 2;
      inPageSection = PAGE_SECTION_PATTERNS.some((re) => re.test(line));
      // H2 itself might be a page (e.g. "## Dashboard Page")
      if (!inPageSection && looksLikePage(h2m[1])) addPage(h2m[1]);
    } else if (h3m) {
      if (inPageSection && pageSectionDepth === 2) {
        // Any H3 under a page-section heading is a page candidate
        addPage(h3m[1]);
      } else if (looksLikePage(h3m[1])) {
        addPage(h3m[1]);
      } else if (/^(?:FR|PG|SC)-\d+/i.test(h3m[1].trim())) {
        // Functional requirement header — include if it sounds page-like
        const stripped = h3m[1].replace(/^(?:FR|PG|SC)-\d+[:.]\s*/i, "").trim();
        if (looksLikePage(stripped)) addPage(h3m[1]);
      }
      // Reset page section if H3 starts a different section
      if (inPageSection && pageSectionDepth === 2) {
        // keep inPageSection true until next H2
      }
    } else if (h4m) {
      if (inPageSection && pageSectionDepth <= 3) {
        addPage(h4m[1]);
      }
    }
  }

  return results.slice(0, 20); // cap at 20 pages
}
