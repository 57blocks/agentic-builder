/**
 * Coding speed/cost preference selected by the user for the coding stage.
 */
export type CodingMode = "fast" | "normal" | "cost";

// Default to cost-saving: the coding inner loop then runs on DeepSeek direct
// (cheaper) unless the user explicitly picks Fast/Normal.
export const DEFAULT_CODING_MODE: CodingMode = "cost";

export function normalizeCodingMode(raw: unknown): CodingMode {
  if (typeof raw !== "string") return DEFAULT_CODING_MODE;
  const v = raw.trim().toLowerCase();
  if (v === "fast") return "fast";
  if (v === "normal") return "normal";
  if (v === "cost" || v === "cheap" || v === "economy") return "cost";
  return DEFAULT_CODING_MODE;
}
