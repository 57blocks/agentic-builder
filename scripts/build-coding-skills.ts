import fs from "node:fs";
import path from "node:path";
import {
  ENGINEERING_SOURCE_ROOTS,
  parseEngineeringFrontmatter,
  convertEngineeringSkill,
} from "@/lib/agents/skills/engineering";

export interface BuildOptions {
  engineeringDir: string;
  blueprintSkillsDir: string;
}

export interface BuildSummary {
  written: number;
  errors: string[];
  byRole: Record<string, number>;
}

/** Discover `<root>/<skill>/SKILL.md` directories under a source root. */
function listSkillDirs(rootAbs: string): string[] {
  if (!fs.existsSync(rootAbs)) return [];
  return fs
    .readdirSync(rootAbs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(rootAbs, e.name))
    .filter((d) => fs.existsSync(path.join(d, "SKILL.md")));
}

export function buildCodingSkills(opts: BuildOptions): BuildSummary {
  const errors: string[] = [];
  const byRole: Record<string, number> = {};
  let written = 0;
  const writtenPaths = new Set<string>();

  // Clean only the role dirs we manage, so re-runs are idempotent and stale
  // converts don't linger.
  const managedRoles = [...new Set(ENGINEERING_SOURCE_ROOTS.map((r) => r.role))];
  for (const role of managedRoles) {
    const roleDir = path.join(opts.blueprintSkillsDir, role);
    if (fs.existsSync(roleDir)) {
      for (const f of fs.readdirSync(roleDir, { withFileTypes: true })) {
        if (f.isFile() && f.name.endsWith(".md")) fs.rmSync(path.join(roleDir, f.name));
      }
    }
  }

  for (const root of ENGINEERING_SOURCE_ROOTS) {
    const rootAbs = path.join(opts.engineeringDir, root.relPath);
    for (const skillDir of listSkillDirs(rootAbs)) {
      const src = path.join(skillDir, "SKILL.md");
      const label = path.relative(opts.engineeringDir, src);
      try {
        const fm = parseEngineeringFrontmatter(fs.readFileSync(src, "utf-8"), label);
        const { id, content } = convertEngineeringSkill(fm, root.role);
        const roleDir = path.join(opts.blueprintSkillsDir, root.role);
        fs.mkdirSync(roleDir, { recursive: true });
        const targetPath = path.join(roleDir, `${id}.md`);
        if (writtenPaths.has(targetPath)) {
          errors.push(
            `${label}: duplicate id "${id}" for role ${root.role} — already written by another source; skipping`,
          );
          continue;
        }
        fs.writeFileSync(targetPath, content, "utf-8");
        writtenPaths.add(targetPath);
        written += 1;
        byRole[root.role] = (byRole[root.role] ?? 0) + 1;
      } catch (err) {
        errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  return { written, errors, byRole };
}

// CLI entry — only runs when invoked directly, not when imported by tests.
const invokedDirectly =
  !!process.argv[1] && path.basename(process.argv[1]) === "build-coding-skills.ts";
if (invokedDirectly) {
  const repoRoot = process.cwd();
  const summary = buildCodingSkills({
    engineeringDir: path.join(repoRoot, "Engineering"),
    blueprintSkillsDir: path.join(repoRoot, ".blueprint", "skills"),
  });
  console.info(
    `[build:skills] wrote ${summary.written} skill(s): ${JSON.stringify(summary.byRole)}`,
  );
  if (summary.errors.length > 0) {
    console.error(`[build:skills] ${summary.errors.length} error(s):`);
    for (const e of summary.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}
