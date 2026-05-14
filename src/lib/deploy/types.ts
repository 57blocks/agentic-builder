export type StepStatus = "pending" | "running" | "done" | "error";

export type StepId =
  | "verify-repo"
  | "git-push"
  | "create-database"
  | "create-dokploy"
  | "trigger-deploy";

export interface StepResult {
  step: StepId;
  status: StepStatus;
  message: string;
  url?: string;
}

export interface DeployJob {
  id: string;
  status: "running" | "done" | "error";
  steps: StepResult[];
  url?: string;
  repoUrl?: string;
  subscribers: Set<ReadableStreamDefaultController<Uint8Array>>;
}

export interface DeployRequest {
  appName: string;
  generatedCodePath: string;
  skipSteps?: StepId[];
}
