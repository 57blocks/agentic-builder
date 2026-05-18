import path from "path";
import fs from "fs/promises";

/**
 * Deterministic text utilities used by the e2e_verify node when triaging
 * Playwright failures. They are pure (apart from `writeTriageReport`'s
 * filesystem write) and contain no LangGraph-specific state.
 */

/**
 * Extract the most-uniquely-identifying segment of a Playwright test name.
 * Tests are typically written as `<spec>:<line>:<col> › <suite> › <title>`
 * or in error-context.md form `<spec> >> <suite> >> <title>`. The final
 * segment is the test title, which uniquely identifies the test within a
 * single run. We use it to match across the two formats.
 */
export function lastTestNameSegment(name: string): string {
  const parts = name
    .split(/\s*(?:›|>>)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] ?? name;
  return last.replace(/\s+/g, " ").trim();
}

export function errorContextMatchesAny(
  errorContextMd: string,
  deterministicNames: Set<string>,
): boolean {
  // Find the `- Name: ...` line in the markdown header.
  const m = /^-\s*Name:\s*(.+)$/m.exec(errorContextMd);
  if (!m) return false;
  const ctxTitle = lastTestNameSegment(m[1]);
  for (const det of deterministicNames) {
    const detTitle = lastTestNameSegment(det);
    if (detTitle && ctxTitle === detTitle) return true;
    // Fuzzy fallback: PRD ids like "E2E-002" must appear in both.
    const prdId = (/\bE2E-\d+\b/i.exec(detTitle) ?? [])[0];
    if (prdId && ctxTitle.includes(prdId)) return true;
  }
  return false;
}

export async function writeTriageReport(
  outputDir: string,
  attempt: number,
  report: string,
): Promise<void> {
  try {
    const ralphDir = path.join(outputDir, ".ralph");
    await fs.mkdir(ralphDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `e2e-triage-attempt-${attempt}-${timestamp}.md`;
    await fs.writeFile(path.join(ralphDir, filename), report, "utf-8");
    // Also write/overwrite the "latest" pointer for quick access.
    await fs.writeFile(path.join(ralphDir, "e2e-triage.md"), report, "utf-8");
  } catch (err) {
    console.warn(
      `[Supervisor] writeTriageReport failed (ignored):`,
      err instanceof Error ? err.message : err,
    );
  }
}
