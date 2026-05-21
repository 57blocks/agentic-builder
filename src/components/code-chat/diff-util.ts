export type DiffLine =
  | { kind: "ctx"; before: number; after: number; text: string }
  | { kind: "add"; after: number; text: string }
  | { kind: "del"; before: number; text: string }
  | { kind: "hunk-gap" };

/**
 * Minimal LCS-based line diff. Optimised for clarity over raw speed; OK for
 * the file sizes (<~5k lines) we expect in generated apps.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const m = a.length;
  const n = b.length;
  // Build LCS table (rolling rows would be fine for memory, but full table
  // makes the backtrack pass simple to read).
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      lines.push({ kind: "ctx", before: i + 1, after: j + 1, text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ kind: "del", before: i + 1, text: a[i] });
      i++;
    } else {
      lines.push({ kind: "add", after: j + 1, text: b[j] });
      j++;
    }
  }
  while (i < m) lines.push({ kind: "del", before: i + 1, text: a[i++] });
  while (j < n) lines.push({ kind: "add", after: j + 1, text: b[j++] });
  return lines;
}

/**
 * Collapse long stretches of unchanged context to N lines of padding on each side
 * of each hunk, replacing the middle with a "hunk-gap" marker.
 */
export function compactDiff(diff: DiffLine[], context = 2): DiffLine[] {
  const interesting = new Set<number>();
  diff.forEach((l, idx) => {
    if (l.kind !== "ctx") interesting.add(idx);
  });
  if (interesting.size === 0) return diff;
  const keep = new Set<number>();
  for (const idx of interesting) {
    for (let k = -context; k <= context; k++) {
      const t = idx + k;
      if (t >= 0 && t < diff.length) keep.add(t);
    }
  }
  const out: DiffLine[] = [];
  let lastKept = -2;
  for (let idx = 0; idx < diff.length; idx++) {
    if (!keep.has(idx)) continue;
    if (idx > lastKept + 1) out.push({ kind: "hunk-gap" });
    out.push(diff[idx]);
    lastKept = idx;
  }
  return out;
}
