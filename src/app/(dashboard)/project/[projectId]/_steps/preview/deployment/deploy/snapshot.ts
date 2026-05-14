import type { StepSnapshot } from "../../../_shared/types";

export const deploySnapshot: StepSnapshot = {
  async load() { return null; },
  async save() {},
  getContextFromPrevious() { return {}; },
};
