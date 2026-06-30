/**
 * Human-in-the-loop decision mechanism for the integration verify/fix stage.
 *
 * When the worker stagnates and cannot determine the right action autonomously,
 * the pipeline pauses and sends a `human_decision_needed` SSE event to the
 * browser. The human picks one of the pre-defined options, which are sent back
 * via POST /api/agents/coding/decide. The waiting Promise resolves and the
 * supervisor injects the decision as a system correction message to resume.
 *
 * The pause is async-safe: only the current coding session is blocked; other
 * sessions continue running normally.
 */

export interface HumanDecisionOption {
  /** Machine-readable key sent back as the decision value. */
  id: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** One-sentence explanation of what the system will do if this is chosen. */
  description: string;
  /**
   * When true, the UI shows a free-text box and the human's `directive` is
   * REQUIRED before submitting. The directive is the authoritative correction
   * fed back into the next fix attempt (e.g. "the test is wrong: a completed
   * checkout's status is 'paid' per AC-074 — fix the assertion"). This is what
   * lets HITL achieve "get the code actually fixed", not just unblock the flow.
   */
  requiresDirective?: boolean;
}

/** What a resolved human decision carries back to the waiting pipeline node. */
export interface HumanDecisionResult {
  /** Chosen option id, or "timeout" when auto-resolved with no response. */
  optionId: string;
  /** Free-text corrective guidance the human typed (authoritative; fed into the
   *  next fix attempt's prompt). Undefined when the option needs none. */
  directive?: string;
}

export interface PendingDecision {
  options: HumanDecisionOption[];
  /** Short summary of what the worker is stuck on. */
  context: string;
  /** ISO timestamp when this decision will auto-resolve if no response. */
  expiresAt: string;
  resolve: (result: HumanDecisionResult) => void;
  reject: (reason?: unknown) => void;
}

/**
 * How long a pending decision waits before auto-resolving to "timeout".
 * Infra/setup escalations (start a DB, fix creds, install a dep) need real time,
 * so this is deliberately long and overridable per call via `requestHumanDecision`.
 */
const DECISION_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(
    (process.env.HUMAN_DECISION_TIMEOUT_MS ?? "1800000").trim(), // 30 min default
    10,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 30 * 60 * 1000;
})();

const _pending = new Map<string, PendingDecision>();

/**
 * Pause the current async execution and wait for a human to choose one of
 * `options`. Returns the chosen option's `id`, or `"timeout"` after 5 min
 * with no response.
 */
export function requestHumanDecision(
  sessionId: string,
  options: HumanDecisionOption[],
  context: string,
  timeoutMs: number = DECISION_TIMEOUT_MS,
): Promise<HumanDecisionResult> {
  // Cancel any prior pending decision for this session before registering a
  // new one (defensive — only one should ever be in-flight at a time).
  clearHumanDecision(sessionId);

  return new Promise<HumanDecisionResult>((resolve, reject) => {
    const expiresAt = new Date(Date.now() + timeoutMs).toISOString();
    _pending.set(sessionId, { options, context, expiresAt, resolve, reject });

    const timer = setTimeout(() => {
      if (_pending.has(sessionId)) {
        _pending.delete(sessionId);
        resolve({ optionId: "timeout" });
      }
    }, timeoutMs);

    // Don't let the timer prevent clean process exit.
    if (typeof timer === "object" && timer !== null && "unref" in timer) {
      (timer as NodeJS.Timeout).unref();
    }
  });
}

/**
 * Resolve a pending decision for `sessionId` with the chosen option id.
 * Returns `true` when a pending decision existed; `false` when not found
 * (e.g. already timed out or the session ended).
 */
export function resolveHumanDecision(
  sessionId: string,
  decisionId: string,
  directive?: string,
): boolean {
  const pending = _pending.get(sessionId);
  if (!pending) return false;
  _pending.delete(sessionId);
  pending.resolve({
    optionId: decisionId,
    directive: directive?.trim() ? directive.trim() : undefined,
  });
  return true;
}

/** Remove a pending decision without resolving it (used on session cleanup). */
export function clearHumanDecision(sessionId: string): void {
  const pending = _pending.get(sessionId);
  if (!pending) return;
  _pending.delete(sessionId);
  pending.reject(new Error("session_cleared"));
}

/** Returns the public (non-resolve/reject) shape for a pending decision. */
export function getPendingDecision(
  sessionId: string,
): Omit<PendingDecision, "resolve" | "reject"> | null {
  const entry = _pending.get(sessionId);
  if (!entry) return null;
  const { resolve: _r, reject: _j, ...rest } = entry;
  return rest;
}

/**
 * Infra / environment escalation — the LLM cannot fix these by editing code
 * (DB unreachable, wrong credentials, missing API key, dependency/native build
 * failed, port clash). A human fixes the environment, then chooses retry.
 */
export const INFRA_DECISION_OPTIONS: HumanDecisionOption[] = [
  {
    id: "retry",
    label: "I fixed the environment — retry",
    description:
      "You started the DB / fixed credentials / installed the dependency / freed the port. Re-run this gate against the now-healthy environment.",
  },
  {
    id: "skip",
    label: "Skip this gate and continue",
    description:
      "Proceed without this gate, recording a known infrastructure gap. Use when the environment cannot be provided right now.",
  },
  {
    id: "abort",
    label: "Abort the session",
    description: "Stop the run; the environment problem must be resolved first.",
  },
];

/**
 * TDD / E2E exhaustion adjudication. Anchored on one rule: the PRD is the
 * absolute standard, the tests encode it, and the CODE must conform. So the
 * DEFAULT action is "fix the program" — the human is asked to diagnose why the
 * code isn't converging and supply a concrete, PRD-grounded code-fix strategy
 * that is fed back as authoritative guidance. Editing the test is the EXCEPTION,
 * allowed only when the test itself contradicts the PRD. The point of stopping
 * is to get the code FIXED CORRECTLY, not merely to unblock the flow.
 */
export const CODE_FIX_DECISION_OPTIONS: HumanDecisionOption[] = [
  {
    id: "fix_code",
    label: "Fix the code — here's the strategy",
    description:
      "DEFAULT. The implementation must satisfy the PRD-derived test. Diagnose why it isn't converging and give the concrete code-fix strategy (grounded in the PRD); the loop retries the CODE fix with your guidance. The test is kept.",
    requiresDirective: true,
  },
  {
    id: "test_contradicts_prd",
    label: "The test contradicts the PRD — fix the test",
    description:
      "EXCEPTION. Use only when the test asserts something the PRD does NOT require. State what the PRD actually says; the test is corrected to match the PRD, then the code is verified against the corrected test.",
    requiresDirective: true,
  },
  {
    id: "manual_done",
    label: "I edited the files on disk — re-verify",
    description:
      "You changed the code (or test) directly. Re-run the gate to verify your edit.",
  },
  {
    id: "skip",
    label: "Defer as a known-issue",
    description:
      "Record this failure as tracked debt and continue. Last resort, when it genuinely cannot be resolved now.",
  },
  {
    id: "abort",
    label: "Abort the session",
    description: "Stop the run with this failure unresolved.",
  },
];

/** The pre-defined options for the 4-quadrant + abort decision. */
export const INTEGRATION_DECISION_OPTIONS: HumanDecisionOption[] = [
  {
    id: "wire_frontend",
    label: "Wire frontend",
    description:
      "The frontend is missing an API call. Add the apiClient call and UI hookup for the endpoint shown in context.",
  },
  {
    id: "prune_contract",
    label: "Prune contract",
    description:
      "This contract entry is surplus — the feature does not need a backend endpoint. Remove it from API_CONTRACTS.json.",
  },
  {
    id: "add_and_implement",
    label: "Add to contract + implement backend",
    description:
      "The frontend already calls an undeclared endpoint that the PRD justifies. Add it to API_CONTRACTS.json and implement the backend route.",
  },
  {
    id: "remove_rogue_call",
    label: "Remove rogue frontend call",
    description:
      "The frontend calls an endpoint with no contract entry and no PRD justification. Delete or replace the call.",
  },
  {
    id: "abort",
    label: "Abort integration fix",
    description:
      "This issue cannot be resolved automatically. Mark the integration stage as failed and proceed to the report.",
  },
];
