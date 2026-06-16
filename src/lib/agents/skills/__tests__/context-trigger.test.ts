import { describe, expect, it } from "vitest";
import path from "node:path";

import { evaluateTrigger } from "../trigger";
import { parseSkillFile } from "../parser";
import { loadSkillsForAgent, formatAppliedSkills } from "../loader";
import type { ContextTrigger, LoaderContext } from "../types";

const REPO_ROOT = path.resolve(__dirname, "../../../../..");
const SKILLS_ROOT = path.join(REPO_ROOT, ".blueprint", "skills");

const baseCtx = (over: Partial<LoaderContext>): LoaderContext => ({
  agent: "frontend",
  prdContent: "",
  trdContent: "",
  ...over,
});

const offline = { enableLlmConfirm: false };

describe("context trigger", () => {
  const featureTrigger: ContextTrigger = {
    type: "context",
    any_of_features: ["auth-password-rbac"],
  };

  it("fires when appliedOptionalFeatures contains the feature (substring, case-insensitive)", async () => {
    const r = await evaluateTrigger(
      featureTrigger,
      baseCtx({ appliedOptionalFeatures: ["auth-password-rbac"] }),
      offline,
    );
    expect(r.result.matched).toBe(true);
    expect(r.costUsd).toBe(0); // deterministic, no LLM
  });

  it("does NOT fire for a different auth feature (privy)", async () => {
    const r = await evaluateTrigger(
      featureTrigger,
      baseCtx({ appliedOptionalFeatures: ["auth-privy"] }),
      offline,
    );
    expect(r.result.matched).toBe(false);
  });

  it("does NOT fire when no features are applied", async () => {
    const r = await evaluateTrigger(
      featureTrigger,
      baseCtx({ appliedOptionalFeatures: [] }),
      offline,
    );
    expect(r.result.matched).toBe(false);
  });

  it("matches env keys and requires ALL flags", async () => {
    const envTrigger: ContextTrigger = {
      type: "context",
      any_of_env_keys: ["LLM_PROVIDER"],
    };
    expect(
      (await evaluateTrigger(envTrigger, baseCtx({ declaredEnvKeys: ["LLM_PROVIDER"] }), offline))
        .result.matched,
    ).toBe(true);

    const flagTrigger: ContextTrigger = {
      type: "context",
      all_of_flags: ["hasBackgroundJobs"],
    };
    expect(
      (await evaluateTrigger(flagTrigger, baseCtx({ flags: { hasBackgroundJobs: true } }), offline))
        .result.matched,
    ).toBe(true);
    expect(
      (await evaluateTrigger(flagTrigger, baseCtx({ flags: { hasBackgroundJobs: false } }), offline))
        .result.matched,
    ).toBe(false);
  });
});

describe("auth-password-rbac-login-page skill", () => {
  const skillPath = path.join(
    SKILLS_ROOT,
    "frontend",
    "auth-password-rbac-login-page.md",
  );

  it("parses with a context trigger and correct frontmatter", () => {
    const skill = parseSkillFile(skillPath);
    expect(skill.id).toBe("auth-password-rbac-login-page");
    expect(skill.agent).toBe("frontend");
    expect(skill.trigger.type).toBe("context");
    // Body must forbid the second auth surface.
    expect(skill.body).toMatch(/\/login/);
    expect(skill.body).toMatch(/AuthPage|\/auth/);
  });

  it("is applied for a password-rbac project and skipped otherwise", async () => {
    const applied = await loadSkillsForAgent(
      baseCtx({ appliedOptionalFeatures: ["auth-password-rbac"] }),
      { skillsRoot: SKILLS_ROOT, enableLlmConfirm: false },
    );
    expect(applied.applied.map((a) => a.skill.id)).toContain(
      "auth-password-rbac-login-page",
    );
    expect(formatAppliedSkills(applied)).toMatch(/LoginPage/);

    const privy = await loadSkillsForAgent(
      baseCtx({ appliedOptionalFeatures: ["auth-privy"] }),
      { skillsRoot: SKILLS_ROOT, enableLlmConfirm: false },
    );
    expect(privy.applied.map((a) => a.skill.id)).not.toContain(
      "auth-password-rbac-login-page",
    );
  });
});
