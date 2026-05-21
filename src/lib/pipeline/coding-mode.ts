/**
 * Coding speed/cost preference selected by the user for the coding stage.
 */
export type CodingMode = "fast" | "normal" | "cost";

export const DEFAULT_CODING_MODE: CodingMode = "normal";

export function normalizeCodingMode(raw: unknown): CodingMode {
  if (typeof raw !== "string") return DEFAULT_CODING_MODE;
  const v = raw.trim().toLowerCase();
  if (v === "fast") return "fast";
  if (v === "cost" || v === "cheap" || v === "economy") return "cost";
  return "normal";
}
