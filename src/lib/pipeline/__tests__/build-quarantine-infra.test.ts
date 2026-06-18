import { describe, expect, it } from "vitest";
import { isInfraDominatedFailure } from "../build-quarantine";

describe("isInfraDominatedFailure", () => {
  it("is true: failed + infra signal + all real code gates pass (don't quarantine)", () => {
    expect(
      isInfraDominatedFailure({
        finalStatusFail: true,
        infraSignalPresent: true,
        realCodeGatesPass: true,
      }),
    ).toBe(true);
  });

  it("is FALSE when a real code/structural gate also failed — must quarantine", () => {
    // The precision fix: an infra signal in the summary must NOT mask a genuine
    // route/contract/tsc failure.
    expect(
      isInfraDominatedFailure({
        finalStatusFail: true,
        infraSignalPresent: true,
        realCodeGatesPass: false,
      }),
    ).toBe(false);
  });

  it("is false when there is no infra signal (a real failure)", () => {
    expect(
      isInfraDominatedFailure({
        finalStatusFail: true,
        infraSignalPresent: false,
        realCodeGatesPass: true,
      }),
    ).toBe(false);
  });

  it("is false when the build did not fail at all", () => {
    expect(
      isInfraDominatedFailure({
        finalStatusFail: false,
        infraSignalPresent: true,
        realCodeGatesPass: true,
      }),
    ).toBe(false);
  });
});
