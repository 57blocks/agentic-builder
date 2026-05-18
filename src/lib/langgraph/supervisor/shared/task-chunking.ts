import type { CodingTask } from "@/lib/pipeline/types";

/**
 * Conflict-aware task chunking utilities.
 *
 * Two tasks land in the same chunk when ANY of these holds:
 *   1. one declares the other (transitively) in `dependencies`
 *   2. task A's `files.creates` overlaps task B's `files.reads | modifies`
 *      (i.e. B consumes a file that A is about to produce)
 *   3. they declare overlapping `files.modifies` paths (write-write conflict)
 *
 * Tasks inside a group MUST execute serially within the same worker so the
 * "incremental context sync" invariant is preserved for true dependencies.
 * Different groups are guaranteed file-disjoint and dependency-disjoint, so
 * they can be fanned out to separate workers.
 */

export function hasOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  for (const x of b) if (set.has(x)) return true;
  return false;
}

export function chunkTasks<T>(tasks: T[], chunks: number): T[][] {
  if (chunks <= 1) return [tasks];
  const result: T[][] = Array.from({ length: chunks }, () => []);
  tasks.forEach((t, i) => result[i % chunks].push(t));
  return result.filter((c) => c.length > 0);
}

export function collectTaskFiles(task: CodingTask): {
  creates: string[];
  modifies: string[];
  reads: string[];
} {
  const out = {
    creates: [] as string[],
    modifies: [] as string[],
    reads: [] as string[],
  };
  const files = task.files;
  if (!files) return out;
  if (Array.isArray(files)) {
    // Legacy flat shape: treat as "creates" so we err on the side of caution.
    for (const f of files) {
      if (typeof f === "string" && f.trim()) out.creates.push(f.trim());
    }
    return out;
  }
  const rec = files as unknown as Record<string, unknown>;
  for (const key of ["creates", "modifies", "reads"] as const) {
    const arr = rec[key];
    if (Array.isArray(arr)) {
      for (const f of arr) {
        if (typeof f === "string" && f.trim()) out[key].push(f.trim());
      }
    }
  }
  return out;
}

export function chunkTasksByFileConflict(
  tasks: CodingTask[],
  maxChunks: number,
): CodingTask[][] {
  if (tasks.length === 0) return [];
  if (maxChunks <= 1) return [tasks];

  // Union-find over task indices.
  const parent = tasks.map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const idByTaskId = new Map<string, number>();
  tasks.forEach((t, i) => idByTaskId.set(t.id, i));

  const fileSets = tasks.map(collectTaskFiles);

  // 1. Dependency edges keep dependents on the same chunk as their parents.
  tasks.forEach((t, i) => {
    if (!t.dependencies) return;
    for (const dep of t.dependencies) {
      const j = idByTaskId.get(dep);
      if (j !== undefined) union(i, j);
    }
  });

  // 2 & 3. File-overlap edges (creates vs reads/modifies, modifies vs modifies).
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const a = fileSets[i];
      const b = fileSets[j];
      const overlap =
        hasOverlap(a.creates, b.reads) ||
        hasOverlap(a.creates, b.modifies) ||
        hasOverlap(b.creates, a.reads) ||
        hasOverlap(b.creates, a.modifies) ||
        hasOverlap(a.modifies, b.modifies);
      if (overlap) union(i, j);
    }
  }

  // Bucket by component root, preserving the original task order inside each
  // group so dependency execution order is naturally maintained.
  const groups = new Map<number, CodingTask[]>();
  tasks.forEach((t, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(t);
  });

  let chunks = Array.from(groups.values());

  // Cap to maxChunks: merge the smallest chunks together so we never exceed
  // the operator-configured worker budget. Merging cannot violate safety
  // because every chunk is already self-contained.
  if (chunks.length > maxChunks) {
    chunks.sort((a, b) => a.length - b.length);
    while (chunks.length > maxChunks) {
      const a = chunks.shift()!;
      const b = chunks.shift()!;
      chunks.unshift([...a, ...b]);
      chunks.sort((x, y) => x.length - y.length);
    }
  }

  return chunks;
}
