import type { StepSnapshot } from "../../../_shared/types";

export const bugFixSnapshot: StepSnapshot = {
  async load() { return null; },
  async save() {},
  getContextFromPrevious() { return {}; },
};
