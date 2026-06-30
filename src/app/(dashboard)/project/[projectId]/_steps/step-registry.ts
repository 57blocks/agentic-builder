// ── Step Registry ────────────────────────────────────────────────────────────
//
// Maps every StepId to its UI component and agent.
// Used by page.tsx to render the active step.
// Snapshots use the shared createStepDataSnapshot helper — only "intent" and
// "initial" have custom implementations.

import type { StepId } from "@/_config/pipeline-flow";
import type { StepAgent, StepUIProps, StepSnapshot } from "./_shared/types";
import type { ComponentType } from "react";
import { createStepDataSnapshot } from "./_shared/snapshot-context";

// ── Preparation > Input ──
import { initialAgent } from "./preparation/input/initial/agent";
import { InitialUI } from "./preparation/input/initial/ui";
import { initialSnapshot } from "./preparation/input/initial/snapshot";

import { intentAgent } from "./preparation/input/intent/agent";
import { IntentUI } from "./preparation/input/intent/ui";
import { intentSnapshot } from "./preparation/input/intent/snapshot";

// ── Preparation > Core Docs ──
import { prdAgent } from "./preparation/core-docs/prd/agent";
import { PrdUI } from "./preparation/core-docs/prd/ui";
import { prdSnapshot } from "./preparation/core-docs/prd/snapshot";

// ── Preparation > Tech Docs ──
import { trdAgent } from "./preparation/tech-docs/trd/agent";
import { TrdUI } from "./preparation/tech-docs/trd/ui";

import { prototypeAgent } from "./preparation/prototype/agent";
import { PrototypeUI } from "./preparation/prototype/ui";
import { prototypeSnapshot } from "./preparation/prototype/snapshot";

import { sysdesignAgent } from "./preparation/tech-docs/sysdesign/agent";
import { SysDesignUI } from "./preparation/tech-docs/sysdesign/ui";

import { implguideAgent } from "./preparation/tech-docs/implguide/agent";
import { ImplGuideUI } from "./preparation/tech-docs/implguide/ui";

// ── Preparation > Design ──
import { designAgent } from "./preparation/design-group/design/agent";
import { DesignUI } from "./preparation/design-group/design/ui";

import { pencilAgent } from "./preparation/design-group/pencil/agent";
import { PencilUI } from "./preparation/design-group/pencil/ui";

import { mockupAgent } from "./preparation/design-group/mockup/agent";
import { MockupUI } from "./preparation/design-group/mockup/ui";

// ── Preparation > Quality ──
import { qaAgent } from "./preparation/quality/qa/agent";
import { QaUI } from "./preparation/quality/qa/ui";

import { verifyAgent } from "./preparation/quality/verify/agent";
import { VerifyUI } from "./preparation/quality/verify/ui";

// ── Kickoff ──
import { envSetupAgent } from "./kickoff/setup/env-setup/agent";
import { EnvSetupUI } from "./kickoff/setup/env-setup/ui";

import { summaryAgent } from "./kickoff/overview/agent";
import { SummaryUI } from "./kickoff/overview/ui";

import { taskBreakdownAgent } from "./kickoff/planning/task-breakdown/agent";
import { TaskBreakdownUI } from "./kickoff/planning/task-breakdown/ui";

// ── Coding > Agents ──
import { agentsAgent } from "./coding/agents/agent";
import { AgentsUI } from "./coding/agents/ui";

// ── Preview ──
import { serveAgent } from "./preview/server/serve/agent";
import { ServeUI } from "./preview/server/serve/ui";

import { e2eAgent } from "./preview/testing/e2e/agent";
import { E2eUI } from "./preview/testing/e2e/ui";

import { bugFixAgent } from "./preview/testing/bug-fix/agent";
import { BugFixUI } from "./preview/testing/bug-fix/ui";
import { bugFixSnapshot } from "./preview/testing/bug-fix/snapshot";

import { deployAgent } from "./preview/deployment/deploy/agent";
import { DeployUI } from "./preview/deployment/deploy/ui";

// ── Registry Map ──────────────────────────────────────────────────────────────

export interface StepEntry {
  component: ComponentType<StepUIProps>;
  agent: StepAgent;
  snapshot: StepSnapshot;
}

export const STEP_REGISTRY: Record<StepId, StepEntry> = {
  // Preparation
  initial:      { component: InitialUI,      agent: initialAgent,      snapshot: initialSnapshot },
  intent:       { component: IntentUI,       agent: intentAgent,       snapshot: intentSnapshot },
  prd:          { component: PrdUI,          agent: prdAgent,          snapshot: prdSnapshot },
  trd:          { component: TrdUI,          agent: trdAgent,          snapshot: createStepDataSnapshot("trd") },
  prototype:    { component: PrototypeUI,    agent: prototypeAgent,    snapshot: prototypeSnapshot },
  sysdesign:    { component: SysDesignUI,    agent: sysdesignAgent,    snapshot: createStepDataSnapshot("sysdesign") },
  implguide:    { component: ImplGuideUI,    agent: implguideAgent,    snapshot: createStepDataSnapshot("implguide") },
  design:       { component: DesignUI,       agent: designAgent,       snapshot: createStepDataSnapshot("design") },
  pencil:       { component: PencilUI,       agent: pencilAgent,       snapshot: createStepDataSnapshot("pencil") },
  mockup:       { component: MockupUI,       agent: mockupAgent,       snapshot: createStepDataSnapshot("mockup") },
  qa:           { component: QaUI,           agent: qaAgent,           snapshot: createStepDataSnapshot("qa") },
  verify:       { component: VerifyUI,       agent: verifyAgent,       snapshot: createStepDataSnapshot("verify") },
  // Kickoff
  "env-setup":      { component: EnvSetupUI,      agent: envSetupAgent,      snapshot: createStepDataSnapshot("env-setup") },
  summary:          { component: SummaryUI,        agent: summaryAgent,        snapshot: createStepDataSnapshot("summary") },
  "task-breakdown": { component: TaskBreakdownUI, agent: taskBreakdownAgent, snapshot: createStepDataSnapshot("task-breakdown") },
  // Coding
  agents: { component: AgentsUI, agent: agentsAgent, snapshot: createStepDataSnapshot("agents") },
  // Preview
  serve: { component: ServeUI,    agent: serveAgent,    snapshot: createStepDataSnapshot("serve") },
  e2e:   { component: E2eUI,      agent: e2eAgent,      snapshot: createStepDataSnapshot("e2e") },
  "bug-fix": { component: BugFixUI, agent: bugFixAgent, snapshot: bugFixSnapshot },
  deploy:  { component: DeployUI,  agent: deployAgent,  snapshot: createStepDataSnapshot("deploy") },
};
