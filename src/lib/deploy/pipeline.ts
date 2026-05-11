import { readKickoffRepoMetadata, pushGeneratedCodeToKickoffRepo } from "@/lib/pipeline/push-kickoff-repo";
import { createAppDatabase } from "./database";
import { createDokployProject, createDokployCompose, updateDokployCompose, deployDokployCompose, pollDeployStatus } from "./dokploy";
import { emitStep, completeJob, failJob } from "./job-manager";
import type { StepId } from "./types";

interface PipelineEnv {
  GITHUB_TOKEN: string;
  DOKPLOY_URL: string;
  DOKPLOY_TOKEN: string;
  SHARED_PG_CONNECTION_STRING: string;
}

interface PipelineParams {
  jobId: string;
  appName: string;
  generatedCodePath: string;
  projectRoot: string;
  env: PipelineEnv;
}

function emit(jobId: string, step: StepId, status: "running" | "done" | "error", message: string, url?: string) {
  emitStep(jobId, { step, status, message, url });
}

export async function runDeployPipeline(params: PipelineParams): Promise<void> {
  const { jobId, appName, generatedCodePath, projectRoot, env } = params;

  // Step 1: Verify kickoff repo exists
  emit(jobId, "verify-repo", "running", "Verifying GitHub repository...");
  const repoMeta = await readKickoffRepoMetadata(projectRoot);
  if (!repoMeta?.cloneUrl) {
    emit(jobId, "verify-repo", "error", "No kickoff repository found. Run the kickoff stage first.");
    failJob(jobId);
    return;
  }
  emit(jobId, "verify-repo", "done", `Repository confirmed: ${repoMeta.htmlUrl ?? repoMeta.cloneUrl}`);

  // Step 2: Push generated code
  emit(jobId, "git-push", "running", "Pushing generated code to GitHub...");
  const pushResult = await pushGeneratedCodeToKickoffRepo({
    projectRoot,
    codeOutputDir: generatedCodePath,
    token: env.GITHUB_TOKEN,
  });
  if (!pushResult.ok) {
    emit(jobId, "git-push", "error", pushResult.message);
    failJob(jobId);
    return;
  }
  emit(jobId, "git-push", "done", "Code pushed to GitHub");

  // Step 3: Create per-app database
  emit(jobId, "create-database", "running", "Creating database...");
  let databaseUrl: string;
  try {
    databaseUrl = await createAppDatabase({
      connectionString: env.SHARED_PG_CONNECTION_STRING,
      appName,
    });
  } catch (err) {
    emit(jobId, "create-database", "error", `Database creation failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
    return;
  }
  emit(jobId, "create-database", "done", "Database ready");

  // Step 4: Create Dokploy project + compose service
  emit(jobId, "create-dokploy", "running", "Creating Dokploy project...");
  let composeId: string;
  try {
    const projectId = await createDokployProject({ baseUrl: env.DOKPLOY_URL, token: env.DOKPLOY_TOKEN, name: appName });
    composeId = await createDokployCompose({ baseUrl: env.DOKPLOY_URL, token: env.DOKPLOY_TOKEN, name: appName, projectId });
    await updateDokployCompose({
      baseUrl: env.DOKPLOY_URL,
      token: env.DOKPLOY_TOKEN,
      composeId,
      repository: repoMeta.htmlUrl ?? repoMeta.cloneUrl,
      branch: "main",
      env: `DATABASE_URL=${databaseUrl}\n`,
    });
  } catch (err) {
    emit(jobId, "create-dokploy", "error", `Dokploy setup failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
    return;
  }
  emit(jobId, "create-dokploy", "done", "Dokploy project created");

  // Steps 5+6: Deploy and poll
  emit(jobId, "trigger-deploy", "running", "Deploying...");
  try {
    await deployDokployCompose({ baseUrl: env.DOKPLOY_URL, token: env.DOKPLOY_TOKEN, composeId });
    const appUrl = await pollDeployStatus({
      baseUrl: env.DOKPLOY_URL,
      token: env.DOKPLOY_TOKEN,
      composeId,
      intervalMs: 3000,
      timeoutMs: 300_000,
    });
    emit(jobId, "trigger-deploy", "done", "Deploy complete", appUrl);
    completeJob(jobId, appUrl, repoMeta.htmlUrl ?? repoMeta.cloneUrl);
  } catch (err) {
    emit(jobId, "trigger-deploy", "error", `Deploy failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
  }
}
