/**
 * Post-processing: split any Frontend task that creates 2+ view files
 * into separate single-page tasks, then re-sequence all task IDs.
 *
 * Why: the LLM regularly merges "closely related" pages (lecture + camp,
 * teacher schedule + students, etc.) despite prompt rules. A file-based
 * deterministic split is more reliable than any prompt instruction.
 *
 * Split rules:
 *   - Only Frontend-phase tasks are split.
 *   - The trigger is 2+ files matching `frontend/src/views/*.tsx?` in
 *     `files.creates`. Non-view creates (tests, hooks) stay on the first
 *     split task.
 *   - Page name is derived from the view filename (CamelCase → spaced title,
 *     "Page" suffix stripped). Title becomes "Implement <PageName> page".
 *   - estimatedHours is divided evenly across split tasks.
 *   - All other fields (dependencies, priority, coversRequirementIds,
 *     acceptanceCriteria, tddPlan) are copied to every split task so no
 *     coverage metadata is lost.
 *   - After splitting, all task IDs and dependency references are
 *     re-sequenced T-001, T-002, … to restore a clean sequence.
 */

import type { KickoffWorkItem, TaskFilePlan } from "./types";

export function splitMultiPageFrontendTasks(
  tasks: KickoffWorkItem[],
): KickoffWorkItem[] {
  const expanded: KickoffWorkItem[] = [];
  let didSplit = false;

  for (const task of tasks) {
    if (task.phase !== "Frontend") {
      expanded.push(task);
      continue;
    }

    const viewFiles = getViewFiles(task);
    if (viewFiles.length <= 1) {
      expanded.push(task);
      continue;
    }

    didSplit = true;
    const creates = getCreates(task);
    const nonViewCreates = creates.filter((f) => !viewFiles.includes(f));
    const modifies = getModifies(task);
    const reads = getReads(task);
    const hoursEach = +(task.estimatedHours / viewFiles.length).toFixed(1);

    viewFiles.forEach((viewFile, idx) => {
      const pageName = derivePageName(viewFile);
      const isFirst = idx === 0;

      expanded.push({
        ...task,
        // Temporary ID suffix — renumberTaskIds() will replace these.
        id: `${task.id}${String.fromCharCode(97 + idx)}`,
        title: `Implement ${pageName} page`,
        estimatedHours: hoursEach,
        files: {
          creates: isFirst ? [viewFile, ...nonViewCreates] : [viewFile],
          modifies: isFirst ? modifies : [],
          reads,
        },
        // tddPlan tests often reference both pages; keep on first task only
        // so the test file appears in its `files.creates`.
        tddPlan: isFirst ? task.tddPlan : undefined,
      });
    });

    console.info(
      `[split-multipage] "${task.id}" → ${viewFiles.length} tasks (${viewFiles.map(derivePageName).join(", ")})`,
    );
  }

  if (!didSplit) return tasks;
  return renumberTaskIds(expanded);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getCreates(t: KickoffWorkItem): string[] {
  if (!t.files) return [];
  if (Array.isArray(t.files)) return t.files;
  return (t.files as TaskFilePlan).creates ?? [];
}

function getModifies(t: KickoffWorkItem): string[] {
  if (!t.files || Array.isArray(t.files)) return [];
  return (t.files as TaskFilePlan).modifies ?? [];
}

function getReads(t: KickoffWorkItem): string[] {
  if (!t.files || Array.isArray(t.files)) return [];
  return (t.files as TaskFilePlan).reads ?? [];
}

function getViewFiles(t: KickoffWorkItem): string[] {
  return getCreates(t).filter((f) =>
    /^frontend\/src\/views\/[^/]+\.(tsx?|jsx?)$/.test(f),
  );
}

/** "frontend/src/views/FamilyProfilePage.tsx" → "Family Profile" */
function derivePageName(viewFilePath: string): string {
  const filename = viewFilePath.split("/").pop() ?? viewFilePath;
  const stem = filename.replace(/\.(tsx?|jsx?)$/, "").replace(/Page$/, "");
  return stem
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Re-assign sequential IDs (T-001, T-002, …) and patch every
 * `dependencies[]` reference to match the new IDs.
 */
function renumberTaskIds(tasks: KickoffWorkItem[]): KickoffWorkItem[] {
  const oldToNew = new Map<string, string>();
  tasks.forEach((t, i) => {
    oldToNew.set(t.id, `T-${String(i + 1).padStart(3, "0")}`);
  });

  return tasks.map((t) => ({
    ...t,
    id: oldToNew.get(t.id) ?? t.id,
    dependencies: (t.dependencies ?? []).map((d) => oldToNew.get(d) ?? d),
  }));
}
