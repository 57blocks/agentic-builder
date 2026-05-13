// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No `any`. ISO 8601 strings for timestamps.

export type ProjectId = string;
export type CalculatorSessionId = string;
export type KeypadButtonId = string;

export type CalculatorStatus = "ready" | "evaluated" | "error";
export type ActionSource = "button" | "keyboard" | "system";
export type Operator = "+" | "-" | "*" | "/";
export type ButtonKind = "digit" | "operator" | "decimal" | "equals" | "clear" | "delete";
export type ErrorCode = "DIVIDE_BY_ZERO" | "INVALID_EXPRESSION";

export interface Project {
  id: ProjectId;
  name: string;
  status: "active" | "archived";
  createdAt: string;
}

export interface CalculatorError {
  code: ErrorCode;
  title: string;
  message: string;
  recoverable: boolean;
  createdAt: string;
}

export interface KeypadButton {
  id: KeypadButtonId;
  label: string;
  value: string;
  kind: ButtonKind;
  ariaLabel: string;
  keyboardKeys: string[];
}

export interface EvaluationResult {
  ok: boolean;
  value: string | null;
  normalizedExpression: string;
  error: CalculatorError | null;
  evaluatedAt: string;
}

export interface CalculatorState {
  sessionId: CalculatorSessionId;
  expression: string;
  result: string | null;
  status: CalculatorStatus;
  error: CalculatorError | null;
  lastActionSource: ActionSource | null;
  updatedAt: string;
}

export interface InputAction {
  type:
    | "APPEND_DIGIT"
    | "APPEND_OPERATOR"
    | "APPEND_DECIMAL"
    | "DELETE_LAST"
    | "CLEAR_ALL"
    | "EVALUATE"
    | "DISMISS_ERROR"
    | "CLEAR_AND_CONTINUE"
    | "GET_STATE";
  digit?: string;
  operator?: Operator;
  source: ActionSource;
  issuedAt: string;
}

export interface AppendDigitRequest {
  sessionId: CalculatorSessionId;
  digit: string;
  source: ActionSource;
}
export interface AppendDigitResponse {
  state: CalculatorState;
}

export interface AppendOperatorRequest {
  sessionId: CalculatorSessionId;
  operator: Operator;
  source: ActionSource;
}
export interface AppendOperatorResponse {
  state: CalculatorState;
}

export interface AppendDecimalRequest {
  sessionId: CalculatorSessionId;
  source: ActionSource;
}
export interface AppendDecimalResponse {
  state: CalculatorState;
}

export interface DeleteLastRequest {
  sessionId: CalculatorSessionId;
  source: ActionSource;
}
export interface DeleteLastResponse {
  state: CalculatorState;
}

export interface ClearCalculatorRequest {
  sessionId: CalculatorSessionId;
  source: ActionSource;
}
export interface ClearCalculatorResponse {
  state: CalculatorState;
}

export interface EvaluateExpressionRequest {
  sessionId: CalculatorSessionId;
  source: ActionSource;
}
export interface EvaluateExpressionResponse {
  state: CalculatorState;
  evaluation: EvaluationResult;
}

export interface DismissErrorRequest {
  sessionId: CalculatorSessionId;
  source: ActionSource;
}
export interface DismissErrorResponse {
  state: CalculatorState;
}

export interface ClearAndContinueRequest {
  sessionId: CalculatorSessionId;
  source: ActionSource;
}
export interface ClearAndContinueResponse {
  state: CalculatorState;
}

export interface GetCalculatorStateRequest {
  sessionId: CalculatorSessionId;
}
export interface GetCalculatorStateResponse {
  state: CalculatorState;
}

export interface CreateProjectRequest {
  name: string;
}
export interface CreateProjectResponse {
  project: Project;
}