import { describe, expect, it } from "vitest";

import {
  MAX_E2E_NO_PROGRESS_STREAK,
  nextE2eNoProgressStreak,
} from "../config";

describe("nextE2eNoProgressStreak — E2E stagnation guard", () => {
  it("treats the first attempt (no prior count) as progress", () => {
    expect(nextE2eNoProgressStreak(-1, 5, 0)).toBe(0);
  });

  it("resets the streak when the deterministic failing-set shrinks", () => {
    expect(nextE2eNoProgressStreak(5, 3, 1)).toBe(0);
    expect(nextE2eNoProgressStreak(5, 0, 4)).toBe(0);
  });

  it("increments the streak when the count is unchanged (no progress)", () => {
    expect(nextE2eNoProgressStreak(5, 5, 0)).toBe(1);
    expect(nextE2eNoProgressStreak(5, 5, 1)).toBe(2);
  });

  it("increments the streak when failures grow (regression = no progress)", () => {
    expect(nextE2eNoProgressStreak(3, 4, 1)).toBe(2);
  });

  it("reaches the abort threshold after consecutive no-progress attempts", () => {
    // Simulate a stuck loop: det count never drops from 5.
    let streak = 0;
    let prev = -1;
    const det = 5;
    const attempts: number[] = [];
    for (let i = 0; i < 5; i++) {
      streak = nextE2eNoProgressStreak(prev, det, streak);
      attempts.push(streak);
      prev = det;
    }
    // attempt 1 = progress (prev<0) → 0; then 1, 2, 3, 4
    expect(attempts).toEqual([0, 1, 2, 3, 4]);
    // With the default threshold the loop aborts well before the flat cap.
    const abortAt = attempts.findIndex((s) => s >= MAX_E2E_NO_PROGRESS_STREAK);
    expect(abortAt).toBeGreaterThanOrEqual(0);
    expect(abortAt).toBeLessThan(attempts.length);
  });

  it("a converging loop never trips the guard", () => {
    // Failures drop every attempt: 8 → 5 → 2 → 0.
    let streak = 0;
    let prev = -1;
    for (const det of [8, 5, 2, 0]) {
      streak = nextE2eNoProgressStreak(prev, det, streak);
      expect(streak).toBe(0);
      prev = det;
    }
  });
});
