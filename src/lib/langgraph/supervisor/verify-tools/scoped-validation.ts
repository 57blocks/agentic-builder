import type {
  RouteRegistrationAudit,
  ContractCompletenessResult,
} from "../audits/route-registration";

export type ScopedValidationKind =
  | "frontend_tsc"
  | "frontend_build"
  | "backend_tsc"
  | "backend_smoke";

export function isSuccessfulSupervisorToolResult(result: string): boolean {
  return /^exit_code:\s*0\b/m.test(result);
}

export function stripSupervisorExitCodePrefix(result: string): string {
  return result.replace(/^exit_code:\s*\d+\s*\n?/m, "").trim();
}

export interface ScopedValidationIssueMetrics {
  files: number;
  errors: number;
}

export function extractScopedValidationIssueMetrics(
  kind: ScopedValidationKind,
  result: string,
): ScopedValidationIssueMetrics | null {
  if (isSuccessfulSupervisorToolResult(result)) {
    return { files: 0, errors: 0 };
  }
  const body = stripSupervisorExitCodePrefix(result);
  if (!body) return null;
  if (kind === "backend_smoke") {
    return { files: 1, errors: 1 };
  }

  const filePathPattern =
    /(^|\n)\s*((?:\.{0,2}\/)?(?:[A-Za-z0-9@_\-.]+\/)*[A-Za-z0-9@_\-.]+\.(?:[cm]?[jt]sx?|vue|svelte))(?:[:(]| - )/gm;
  const files = new Set<string>();
  let fileMatch: RegExpExecArray | null;
  while ((fileMatch = filePathPattern.exec(body)) !== null) {
    files.add(fileMatch[2]);
  }

  const tsMatches = body.match(/\berror TS\d+:/g);
  const fileScopedErrors = body.match(/^\S+:\d+:\d+\s+-\s+error\b/gm);
  const genericErrors = body.match(/^\s*(?:error|Error:)\b/gm);
  const errors = Math.max(
    tsMatches?.length ?? 0,
    fileScopedErrors?.length ?? 0,
    genericErrors?.length ?? 0,
    1,
  );

  return {
    files: Math.max(files.size, errors > 0 ? 1 : 0),
    errors,
  };
}

export function isValidationIssueMetricsImproved(
  current: ScopedValidationIssueMetrics,
  previousBest: ScopedValidationIssueMetrics,
): boolean {
  return (
    current.files < previousBest.files ||
    (current.files === previousBest.files &&
      current.errors < previousBest.errors)
  );
}

export function countRouteAuditIssues(audit: RouteRegistrationAudit): number {
  return (
    audit.unregisteredModules.length +
    audit.unresolvedRegistrations.length +
    audit.missingContractEndpoints.length
  );
}

export function countContractCompletenessIssues(
  result: ContractCompletenessResult,
): number {
  return result.missingScopedEndpoints.length;
}
