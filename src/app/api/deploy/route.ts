import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/deploy/job-manager";
import { runDeployPipeline } from "@/lib/deploy/pipeline";
import type { DeployRequest } from "@/lib/deploy/types";

export const maxDuration = 300;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Partial<DeployRequest>;

  if (!body.appName?.trim() || !body.generatedCodePath?.trim()) {
    return NextResponse.json(
      { error: "appName and generatedCodePath are required" },
      { status: 400 }
    );
  }

  let env: { GITHUB_TOKEN: string; DOKPLOY_URL: string; DOKPLOY_TOKEN: string; SHARED_PG_CONNECTION_STRING: string };
  try {
    env = {
      GITHUB_TOKEN: requireEnv("GITHUB_TOKEN"),
      DOKPLOY_URL: requireEnv("DOKPLOY_URL"),
      DOKPLOY_TOKEN: requireEnv("DOKPLOY_TOKEN"),
      SHARED_PG_CONNECTION_STRING: requireEnv("SHARED_PG_CONNECTION_STRING"),
    };
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Missing configuration" },
      { status: 500 }
    );
  }

  const job = createJob();

  void runDeployPipeline({
    jobId: job.id,
    appName: body.appName.trim(),
    generatedCodePath: body.generatedCodePath.trim(),
    projectRoot: process.cwd(),
    env,
  });

  return NextResponse.json({ jobId: job.id });
}
