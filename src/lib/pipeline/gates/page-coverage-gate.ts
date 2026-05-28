/**
 * Page-coverage gate.
 *
 * Compares PRD pages (from prdSpec.pages) against the current task list and
 * reports which pages have no corresponding frontend task. The result drives
 * the supplementary-task injection in `page-coverage-repair.ts`.
 *
 * A page is considered "covered" when at least one task satisfies ANY of:
 *   1. `coversRequirementIds` contains the page's id (e.g. PAGE-001)
 *   2. The task title or description contains the page name (normalised)
 *   3. The task's `files.creates` contains a file path whose basename stem
 *      includes the normalised page name (e.g. DashboardPage.tsx → "dashboard")
 *
 * Only tasks that would be classified as "frontend" role are considered, so a
 * backend "Dashboard data API" task does not falsely satisfy the Dashboard page.
 */

import type { KickoffWorkItem } from "@/lib/pipeline/types";
import type { PrdPage } from "@/lib/requirements/prd-spec-types";

export interface PageCoverageGateResult {
  passed: boolean;
  /** Page IDs (PAGE-001, etc.) with no covering frontend task. */
  missingPageIds: string[];
  /** Human-readable page names for missing pages. */
  missingPageNames: string[];
  /** "PAGE-001: Dashboard (route: /dashboard)" strings for the repair prompt. */
  missingPageDescriptions: string[];
  coveredCount: number;
  totalPages: number;
}

const FRONTEND_PHASE_RE =
  /^(frontend)$/i;
const FRONTEND_KEYWORD_RE =
  /frontend|react|component|page|ui|css|tailwind|hook|store|vite/i;

function isFrontendTask(task: KickoffWorkItem): boolean {
  if (FRONTEND_PHASE_RE.test(task.phase)) return true;
  return FRONTEND_KEYWORD_RE.test(`${task.phase} ${task.title} ${task.description ?? ""}`);
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractCreates(task: KickoffWorkItem): string[] {
  const plan = task.files;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return [];
  const creates = (plan as unknown as Record<string, unknown>).creates;
  if (!Array.isArray(creates)) return [];
  return creates.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
}

function isPageCovered(page: PrdPage, frontendTasks: KickoffWorkItem[]): boolean {
  const pageIdNorm = page.id.toLowerCase();
  const pageNameNorm = normalizeName(page.name);

  for (const task of frontendTasks) {
    // 1. Explicit coversRequirementIds match
    if (task.coversRequirementIds?.some((id) => id.toLowerCase() === pageIdNorm)) {
      return true;
    }

    // 2. Title / description text match (need at least 4 chars to avoid false positives)
    if (pageNameNorm.length >= 4) {
      const taskTextNorm = normalizeName(`${task.title} ${task.description ?? ""}`);
      if (taskTextNorm.includes(pageNameNorm)) return true;
    }

    // 3. files.creates path match (e.g. DashboardPage.tsx stem contains "dashboard")
    if (pageNameNorm.length >= 4) {
      const creates = extractCreates(task);
      for (const filePath of creates) {
        const slash = filePath.lastIndexOf("/");
        const base = slash >= 0 ? filePath.slice(slash + 1) : filePath;
        const dot = base.lastIndexOf(".");
        const stem = normalizeName(dot > 0 ? base.slice(0, dot) : base);
        if (stem.includes(pageNameNorm) || pageNameNorm.includes(stem.slice(0, Math.max(4, stem.length - 4)))) {
          return true;
        }
      }
    }
  }

  return false;
}

export function runPageCoverageGate(
  pages: PrdPage[],
  tasks: KickoffWorkItem[],
): PageCoverageGateResult {
  if (pages.length === 0) {
    return {
      passed: true,
      missingPageIds: [],
      missingPageNames: [],
      missingPageDescriptions: [],
      coveredCount: 0,
      totalPages: 0,
    };
  }

  const frontendTasks = tasks.filter(isFrontendTask);

  const missingPageIds: string[] = [];
  const missingPageNames: string[] = [];
  const missingPageDescriptions: string[] = [];

  for (const page of pages) {
    if (isPageCovered(page, frontendTasks)) continue;
    missingPageIds.push(page.id);
    missingPageNames.push(page.name);
    missingPageDescriptions.push(
      `${page.id}: ${page.name}${page.route ? ` (route: ${page.route})` : ""}`,
    );
  }

  return {
    passed: missingPageIds.length === 0,
    missingPageIds,
    missingPageNames,
    missingPageDescriptions,
    coveredCount: pages.length - missingPageIds.length,
    totalPages: pages.length,
  };
}
