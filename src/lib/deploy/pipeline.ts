import { readKickoffRepoMetadata, pushGeneratedCodeToKickoffRepo } from "@/lib/pipeline/push-kickoff-repo";
import { readKickoffDatabaseMetadata } from "@/lib/pipeline/kickoff-database";
import {
  readKickoffInfraMetadata,
  internalDatabaseUrlFrom,
  internalRedisUrlFrom,
} from "@/lib/pipeline/kickoff-infra";
import { createDokployProject, createDokployCompose, createDokployDomain, updateDokployCompose, deployDokployCompose, pollDeployStatus } from "./dokploy";
import { emitStep, completeJob, failJob } from "./job-manager";
import type { StepId } from "./types";

interface PipelineEnv {
  GITHUB_TOKEN: string;
  DOKPLOY_URL: string;
  DOKPLOY_TOKEN: string;
  DOKPLOY_DOMAIN: string;
}

interface PipelineParams {
  jobId: string;
  appName: string;
  generatedCodePath: string;
  projectRoot: string;
  env: PipelineEnv;
  skipSteps?: string[];
}

function emit(jobId: string, step: StepId, status: "running" | "done" | "error", message: string, url?: string) {
  emitStep(jobId, { step, status, message, url });
}

export async function runDeployPipeline(params: PipelineParams): Promise<void> {
  const { jobId, appName, generatedCodePath, projectRoot, env } = params;
  const skip = new Set(params.skipSteps ?? []);

  // Step 1: Verify kickoff repo exists
  let repoMeta: Awaited<ReturnType<typeof readKickoffRepoMetadata>>;
  if (skip.has("verify-repo")) {
    repoMeta = await readKickoffRepoMetadata(projectRoot);
    emit(jobId, "verify-repo", "done", "Skipped (already done)");
  } else {
    emit(jobId, "verify-repo", "running", "Verifying GitHub repository...");
    repoMeta = await readKickoffRepoMetadata(projectRoot);
    if (!repoMeta?.cloneUrl) {
      emit(jobId, "verify-repo", "error", "No kickoff repository found. Run the kickoff stage first.");
      failJob(jobId);
      return;
    }
    emit(jobId, "verify-repo", "done", `Repository confirmed: ${repoMeta.htmlUrl ?? repoMeta.cloneUrl}`);
  }

  // Step 2: Push generated code
  if (skip.has("git-push")) {
    emit(jobId, "git-push", "done", "Skipped (already done)");
  } else {
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
  }

  if (!repoMeta?.cloneUrl) {
    emit(jobId, "verify-repo", "error", "Kickoff repository metadata missing after skip — cannot continue.");
    failJob(jobId);
    return;
  }
  const verifiedRepo = repoMeta;

  // Step 3: Load infra URLs. Prefer the unified kickoff-infra.json (Dokploy
  // managed Postgres + Redis on a per-app project). Fall back to the legacy
  // shared-PG kickoff-database.json so existing projects keep working.
  emit(jobId, "create-database", "running", "Loading infra metadata...");
  const infraMeta = await readKickoffInfraMetadata(projectRoot);
  let databaseUrl: string | null = internalDatabaseUrlFrom(infraMeta);
  const redisInternalUrl = internalRedisUrlFrom(infraMeta);
  let reusedDokployProjectId: string | null = infraMeta?.dokployProjectId ?? null;
  let reusedDokployEnvId: string | null = infraMeta?.dokployEnvironmentId ?? null;
  if (!databaseUrl) {
    const dbMeta = await readKickoffDatabaseMetadata(projectRoot);
    if (!dbMeta?.databaseUrl) {
      emit(jobId, "create-database", "error", "No infra metadata found. Re-run kickoff with DOKPLOY_BASE_URL+DOKPLOY_API_KEY (preferred) or SHARED_PG_CONNECTION_STRING.");
      failJob(jobId);
      return;
    }
    databaseUrl = dbMeta.databaseUrl;
    emit(jobId, "create-database", "done", `Database ready (legacy shared PG: ${dbMeta.appName})`);
  } else {
    const services = (infraMeta?.services ?? []).map((s) => s.kind).join("+");
    emit(jobId, "create-database", "done", `Infra ready (${services || "none"})`);
  }

  // Step 4: Create the compose stack inside the same Dokploy project as the
  // managed services (when kickoff-infra.json is present). Otherwise create a
  // fresh project (legacy path).
  emit(jobId, "create-dokploy", "running", "Creating Dokploy compose stack...");
  let composeId: string;
  try {
    let projectId: string;
    let environmentId: string;
    if (reusedDokployProjectId && reusedDokployEnvId) {
      projectId = reusedDokployProjectId;
      environmentId = reusedDokployEnvId;
    } else {
      const created = await createDokployProject({
        baseUrl: env.DOKPLOY_URL,
        token: env.DOKPLOY_TOKEN,
        name: appName,
      });
      projectId = created.projectId;
      environmentId = created.environmentId;
    }
    const compose = await createDokployCompose({
      baseUrl: env.DOKPLOY_URL,
      token: env.DOKPLOY_TOKEN,
      name: appName,
      projectId,
      environmentId,
    });
    composeId = compose.composeId;
    const appHost = `${compose.appName}.${env.DOKPLOY_DOMAIN}`;
    await createDokployDomain({
      baseUrl: env.DOKPLOY_URL,
      token: env.DOKPLOY_TOKEN,
      composeId,
      host: appHost,
      serviceName: "frontend",
    });
    const envLines: string[] = [`DATABASE_URL=${databaseUrl}`];
    if (redisInternalUrl) envLines.push(`REDIS_URL=${redisInternalUrl}`);
    await updateDokployCompose({
      baseUrl: env.DOKPLOY_URL,
      token: env.DOKPLOY_TOKEN,
      composeId,
      repository: verifiedRepo.cloneUrl,
      branch: "main",
      env: envLines.join("\n") + "\n",
    });
  } catch (err) {
    emit(jobId, "create-dokploy", "error", `Dokploy setup failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
    return;
  }
  emit(jobId, "create-dokploy", "done", reusedDokployProjectId ? "Compose stack added to kickoff project" : "Dokploy project created");

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
    completeJob(jobId, appUrl, verifiedRepo.htmlUrl ?? verifiedRepo.cloneUrl);
  } catch (err) {
    emit(jobId, "trigger-deploy", "error", `Deploy failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
  }
}
