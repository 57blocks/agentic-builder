/**
 * Render a persisted AuthDecision as an authoritative prompt block for the
 * TRD agent. Kept in its own file so the TRD prompt body stays focused on
 * structure rules; this module owns the auth-mode → prompt mapping.
 *
 * The block is appended to TRDAgent's user-message context. The system
 * prompt's "Auth Decision Contract" section (see
 * `trd-generation-contracts.ts`) already instructs the model to honor this
 * authoritative block over any auth heuristic it might infer from the PRD
 * text — this file just supplies the contents.
 */

import type { AuthDecision } from "./auth-decision-types";

export function renderAuthoritativeAuthDecisionBlock(
  decision: AuthDecision | null | undefined,
): string {
  if (!decision) return "";

  const lines: string[] = [
    "## Auth Decision (AUTHORITATIVE)",
    "",
    "The following authentication decision was persisted to",
    "`.blueprint/auth-decision.json` and is the SINGLE SOURCE OF TRUTH for",
    "auth-related TRD sections (§4 Security, §3.1 Services, §3.3 API",
    "Specification, §1 Technology Stack auth row, and the Auth Decision",
    "Contract under §3 / §5).",
    "",
    "You MUST honor this decision verbatim. Do NOT silently propose a",
    "different mode (e.g. choosing Magic Link because the PRD mentions",
    "passwordless email — if this block says `password-rbac`, the TRD's",
    "Security and Stack sections describe password+RBAC).",
    "",
    `- mode: \`${decision.mode}\``,
    `- scaffold: \`${decision.scaffold}\``,
    `- confidence: ${decision.confidence}`,
    `- userOverridden: ${decision.userOverridden}`,
    `- rationale: ${decision.rationale}`,
    "",
    `### RBAC roles (mode = ${decision.mode})`,
    decision.rbacRoles.length > 0
      ? decision.rbacRoles.map((r) => `- \`${r}\``).join("\n")
      : "- (none — role-less mode)",
    "",
    "### Seed accounts",
    decision.seedAccounts.length > 0
      ? decision.seedAccounts
          .map(
            (s) =>
              `- ${s.email} → role \`${s.role}\`` +
              (s.password ? ` (initial password \`${s.password}\`)` : ""),
          )
          .join("\n")
      : "- (none)",
    "",
    "### Required env keys for this auth mode",
    decision.requiredEnvKeys.length > 0
      ? decision.requiredEnvKeys.map((k) => `- \`${k}\``).join("\n")
      : "- (none — mode has no external auth dependencies)",
    "",
    "Constraints derived from this block (NON-NEGOTIABLE):",
    `- The TRD's §1 Technology Stack auth row MUST describe the \`${decision.mode}\` mechanism.`,
    "- The TRD's §4 Security table MUST describe RBAC enforcement using exactly the role names above when present.",
    "- The TRD's Environment Variables Contract MUST include every key listed under \"Required env keys for this auth mode\" verbatim.",
    "- The TRD's Auth Decision Contract section MUST cite `.blueprint/auth-decision.json` as the source of truth.",
    "- If `userOverridden` is true, do not suggest changing the mode — surface it as locked.",
  ];

  return lines.join("\n");
}
