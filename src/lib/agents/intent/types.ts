export type IntentStage = "prd" | "trd";

export type CoverageStatus =
  | "asked"
  | "answered_in_input"
  | "not_applicable";

export type QuestionType =
  | "single_select"
  | "multi_select"
  | "text"
  | "yes_no";

export interface QuestionOption {
  value: string;
  label: string;
  isDefault?: boolean;
  followUpLabel?: string;
}

export interface ClarificationQuestion {
  id: string;
  dimensionId?: string;
  category: string;
  question: string;
  type: QuestionType;
  options?: QuestionOption[];
  defaultValue?: string | string[];
  required?: boolean;
  rationale?: string;
}

export interface DimensionCoverage {
  dimensionId: string;
  status: CoverageStatus;
  rationale?: string;
  question?: ClarificationQuestion;
}

export interface IntentResult {
  stage: IntentStage;
  coverage: DimensionCoverage[];
  extras: ClarificationQuestion[];
  costUsd: number;
  durationMs: number;
  model: string;
  promptVersion: string;
}

export interface ClarificationAnswer {
  questionId: string;
  value: string | string[];
  followUp?: string;
  usedDefault?: boolean;
}

export interface IntentStepState {
  status: "pending" | "awaiting_user" | "completed" | "skipped";
  pass: 1 | 2;
  result?: IntentResult;
  answers?: ClarificationAnswer[];
}

export function collectQuestions(
  result: IntentResult,
): ClarificationQuestion[] {
  const fromCoverage = result.coverage
    .filter((c) => c.status === "asked" && c.question)
    .map((c) => c.question as ClarificationQuestion);
  return [...fromCoverage, ...result.extras];
}
