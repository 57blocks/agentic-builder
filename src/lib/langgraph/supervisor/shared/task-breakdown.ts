import type { CodingAgentRole, CodingTask } from "@/lib/pipeline/types";
import { fsWrite } from "../../tools";

/**
 * Renders the supervisor's per-run task-breakdown markdown report. This is
 * persisted to the project workspace so reviewers can audit how the kickoff
 * tasks were classified, batched and routed.
 */

export function formatTaskBreakdownMarkdown(
  title: string,
  tasks: CodingTask[],
  roleBuckets?: Record<CodingAgentRole, CodingTask[]>,
  notes?: string[],
): string {
  const lines: string[] = [
    `# ${title}`,
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Total tasks: ${tasks.length}`,
  ];

  if (roleBuckets) {
    lines.push(
      `- Role buckets: architect=${roleBuckets.architect.length}, backend=${roleBuckets.backend.length}, frontend=${roleBuckets.frontend.length}, test=${roleBuckets.test.length}`,
    );
  }

  if (notes && notes.length > 0) {
    lines.push(...notes.map((n) => `- Note: ${n}`));
  }

  lines.push("", "## Tasks", "");

  for (const task of tasks) {
    lines.push(`### [${task.id}] ${task.title}`);
    lines.push(
      `- Phase: ${task.phase} | Priority: ${task.priority} | Execution: ${task.executionKind}`,
    );
    lines.push(`- Estimated hours: ${task.estimatedHours}`);
    lines.push(`- Description: ${task.description}`);

    const files = task.files;
    const creates = files && !Array.isArray(files) ? (files.creates ?? []) : [];
    const modifies =
      files && !Array.isArray(files) ? (files.modifies ?? []) : [];
    const reads = files && !Array.isArray(files) ? (files.reads ?? []) : [];
    lines.push(
      `- Files (create/modify/read): ${creates.length}/${modifies.length}/${reads.length}`,
    );

    if (creates.length > 0) {
      lines.push("  - Creates:");
      lines.push(...creates.map((f: string) => `    - \`${f}\``));
    }
    if (modifies.length > 0) {
      lines.push("  - Modifies:");
      lines.push(...modifies.map((f: string) => `    - \`${f}\``));
    }
    if (reads.length > 0) {
      lines.push("  - Reads:");
      lines.push(...reads.map((f: string) => `    - \`${f}\``));
    }

    const dependencies = task.dependencies ?? [];
    if (dependencies.length > 0) {
      lines.push(`- Dependencies: ${dependencies.join(", ")}`);
    } else {
      lines.push("- Dependencies: (none)");
    }

    const subSteps = task.subSteps ?? [];
    if (subSteps.length > 0) {
      lines.push("- Sub-steps:");
      for (const step of subSteps) {
        lines.push(`  - ${step.step}. ${step.action}: ${step.detail}`);
      }
    }

    const acceptanceCriteria = task.acceptanceCriteria ?? [];
    if (acceptanceCriteria.length > 0) {
      lines.push("- Acceptance criteria:");
      lines.push(...acceptanceCriteria.map((ac: string) => `  - ${ac}`));
    }

    const coversRequirementIds = task.coversRequirementIds ?? [];
    if (coversRequirementIds.length > 0) {
      lines.push(`- Covers requirements: ${coversRequirementIds.join(", ")}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

export async function writeTaskBreakdownMarkdown(
  outputDir: string,
  fileName: string,
  content: string,
): Promise<void> {
  try {
    await fsWrite(fileName, content, outputDir);
    console.log(`[Supervisor] wrote ${fileName}`);
  } catch (e) {
    console.warn(
      `[Supervisor] failed to write ${fileName}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
