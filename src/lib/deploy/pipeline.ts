import fs from "fs/promises";
import path from "path";
import { readKickoffRepoMetadata, pushGeneratedCodeToKickoffRepo } from "@/lib/pipeline/push-kickoff-repo";
import {
  readKickoffInfraMetadata,
  internalDatabaseUrlFrom,
  internalRedisUrlFrom,
  persistComposeOnInfra,
} from "@/lib/pipeline/kickoff-infra";
import { createDokployProject, createDokployCompose, createDokployDomain, updateDokployCompose, deployDokployCompose, pollDeployStatus, getDokployCompose } from "./dokploy";
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

/**
 * Parse a dotenv-style file into a plain object. Tolerates `KEY=VALUE`,
 * quoted values (`KEY="..."` / `KEY='...'`), inline comments, blank lines.
 * Returns `{}` if the file is missing or unreadable.
 */
async function readEnvFile(filePath: string): Promise<Record<string, string>> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes (single or double).
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Build the env block we push to Dokploy via `compose.update`. Reads the
 * coding-phase-generated `backend/.env` so secrets like JWT_SECRET and any
 * third-party API keys reach the deployed container, then overrides
 * DATABASE_URL / REDIS_URL with the dokploy-internal hostnames (which only
 * make sense from inside the dokploy-network). Anything the caller didn't
 * provision (e.g. no Redis) is left untouched.
 */
async function buildDokployEnv(
  generatedCodePath: string,
  databaseUrl: string,
  redisInternalUrl: string | null,
): Promise<{ env: string; count: number; sourcedFromBackendEnv: boolean }> {
  const backendEnvPath = path.resolve(generatedCodePath, "backend", ".env");
  const fileEnv = await readEnvFile(backendEnvPath);
  const sourcedFromBackendEnv = Object.keys(fileEnv).length > 0;
  // Force-override the URLs — file values point at the public host (used by
  // local `pnpm dev`); deployed containers must use internal DNS.
  fileEnv.DATABASE_URL = databaseUrl;
  if (redisInternalUrl) fileEnv.REDIS_URL = redisInternalUrl;
  const lines: string[] = [];
  for (const [k, v] of Object.entries(fileEnv)) {
    // Keep `KEY=VALUE` plain (no quoting) — Dokploy parses the same way
    // docker-compose does, and quotes would be passed through verbatim.
    lines.push(`${k}=${v}`);
  }
  return {
    env: lines.join("\n") + "\n",
    count: lines.length,
    sourcedFromBackendEnv,
  };
}

/**
 * Convert an HTTPS GitHub clone URL to its SSH (`git@host:owner/repo.git`)
 * form so Dokploy can authenticate with a stored SSH deploy key. Leaves an
 * already-SSH or non-GitHub URL untouched.
 */
function toSshRemote(httpsUrl: string): string {
  const m = httpsUrl.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (!m) return httpsUrl;
  const [, host, ownerRepo] = m;
  return `git@${host}:${ownerRepo}.git`;
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
    emit(jobId, "verify-repo", "done", `Repository confirmed: ${repoMeta?.htmlUrl ?? repoMeta?.cloneUrl}`);
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
      // Surface the underlying git stderr (clone auth, 404, push rejected, …)
      // so the SSE consumer sees the real cause, not just the generic label.
      const detail = pushResult.detail?.trim();
      const fullMessage = detail
        ? `${pushResult.message}: ${detail.slice(0, 800)}`
        : pushResult.message;
      emit(jobId, "git-push", "error", fullMessage);
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

  // Step 3: Load infra URLs from kickoff-infra.json (Dokploy-managed
  // per-app Postgres + Redis).
  emit(jobId, "create-database", "running", "Loading infra metadata...");
  const infraMeta = await readKickoffInfraMetadata(projectRoot);
  const databaseUrl: string | null = internalDatabaseUrlFrom(infraMeta);
  const redisInternalUrl = internalRedisUrlFrom(infraMeta);
  const reusedDokployProjectId: string | null = infraMeta?.dokployProjectId ?? null;
  const reusedDokployEnvId: string | null = infraMeta?.dokployEnvironmentId ?? null;
  if (!databaseUrl) {
    emit(jobId, "create-database", "error", "No kickoff-infra.json found. Re-run kickoff with DOKPLOY_URL + DOKPLOY_TOKEN set so per-app Postgres/Redis get provisioned.");
    failJob(jobId);
    return;
  }
  const services = (infraMeta?.services ?? []).map((s) => s.kind).join("+");
  emit(jobId, "create-database", "done", `Infra ready (${services || "none"})`);

  // Step 4: Bring up the compose stack. Reuse the one we created on the first
  // deploy (`.blueprint/kickoff-compose.json`); only create-and-attach-domain
  // when we don't have a usable composeId yet. Before this guard, every
  // Deploy click leaked a fresh compose with a new random URL.
  emit(jobId, "create-dokploy", "running", "Preparing Dokploy compose stack...");
  let composeId: string;
  let composeAppName: string;
  let composeAppHost: string;
  let reusedCompose = false;
  try {
    const saved = infraMeta?.compose ?? null;
    let existing: { composeId: string; appName: string } | null = null;
    if (saved?.composeId) {
      // Verify the saved compose still exists on Dokploy (user may have
      // deleted it via the dashboard between deploys). Network/5xx errors
      // still bubble up; only a genuine 404 makes us recreate.
      existing = await getDokployCompose({
        baseUrl: env.DOKPLOY_URL,
        token: env.DOKPLOY_TOKEN,
        composeId: saved.composeId,
      }).catch(() => null);
    }

    if (existing) {
      composeId = existing.composeId;
      composeAppName = existing.appName || saved!.appName;
      composeAppHost = saved?.appHost ?? `${composeAppName}.${env.DOKPLOY_DOMAIN}`;
      reusedCompose = true;
    } else {
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
      composeAppName = compose.appName;
      composeAppHost = `${composeAppName}.${env.DOKPLOY_DOMAIN}`;
      await createDokployDomain({
        baseUrl: env.DOKPLOY_URL,
        token: env.DOKPLOY_TOKEN,
        composeId,
        host: composeAppHost,
        serviceName: "frontend",
      });
      await persistComposeOnInfra(projectRoot, {
        composeId,
        appName: composeAppName,
        appHost: composeAppHost,
      });
    }

    // Compose env: source from generated backend/.env so JWT_SECRET, SMTP,
    // third-party API keys etc. all reach the deployed container; override
    // DATABASE_URL / REDIS_URL with dokploy-network internal hostnames.
    const envBlock = await buildDokployEnv(
      generatedCodePath,
      databaseUrl,
      redisInternalUrl,
    );
    console.log(
      `[deploy] Compose env: ${envBlock.count} key(s) (${envBlock.sourcedFromBackendEnv ? "sourced from backend/.env" : "backend/.env not found — only DATABASE_URL/REDIS_URL"})`,
    );
    // Private repos: Dokploy clones over SSH using a stored key. When
    // DOKPLOY_GIT_SSH_KEY_ID is set we hand Dokploy the SSH remote + key id;
    // otherwise we keep the HTTPS URL (works for public repos, no auth).
    const sshKeyId = process.env.DOKPLOY_GIT_SSH_KEY_ID?.trim();
    const repository = sshKeyId
      ? toSshRemote(verifiedRepo.cloneUrl)
      : verifiedRepo.cloneUrl;
    await updateDokployCompose({
      baseUrl: env.DOKPLOY_URL,
      token: env.DOKPLOY_TOKEN,
      composeId,
      repository,
      branch: "main",
      env: envBlock.env,
      sshKeyId: sshKeyId || undefined,
    });
  } catch (err) {
    emit(jobId, "create-dokploy", "error", `Dokploy setup failed: ${err instanceof Error ? err.message : String(err)}`);
    failJob(jobId);
    return;
  }
  emit(
    jobId,
    "create-dokploy",
    "done",
    reusedCompose
      ? `Reusing compose ${composeAppName} (${composeAppHost})`
      : `Compose ${composeAppName} created (${composeAppHost})`,
  );

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
