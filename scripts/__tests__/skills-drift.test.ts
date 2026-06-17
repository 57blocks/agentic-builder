import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildCodingSkills } from "../build-coding-skills";

const repoRoot = process.cwd();
const engineeringDir = path.join(repoRoot, "Engineering");
const hasEngineering = fs.existsSync(engineeringDir);

describe("coding skills drift guard", () => {
  // Engineering/ is gitignored and may be absent in CI / fresh clones.
  // Only assert drift when the source tree is actually present.
  it.skipIf(!hasEngineering)(
    ".blueprint/skills matches a fresh build from Engineering",
    () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drift-"));
      buildCodingSkills({
        engineeringDir,
        blueprintSkillsDir: tmp,
      });

      for (const role of ["backend", "frontend"]) {
        const committed = path.join(repoRoot, ".blueprint", "skills", role);
        const fresh = path.join(tmp, role);
        const committedFiles = fs.existsSync(committed)
          ? fs.readdirSync(committed).sort()
          : [];
        const freshFiles = fs.existsSync(fresh)
          ? fs.readdirSync(fresh).sort()
          : [];
        expect(committedFiles, `file set for role ${role}`).toEqual(freshFiles);
        for (const f of freshFiles) {
          expect(
            fs.readFileSync(path.join(committed, f), "utf-8"),
            `content drift in ${role}/${f} — run "npm run build:skills"`,
          ).toBe(fs.readFileSync(path.join(fresh, f), "utf-8"));
        }
      }
    },
  );
});
