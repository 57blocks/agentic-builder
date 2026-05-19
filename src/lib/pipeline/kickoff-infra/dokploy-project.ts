import {
  createDokployProject,
  type DokployBase,
} from "@/lib/deploy/dokploy";

/**
 * Per-app Dokploy project — one project per generated app. Holds the managed
 * services (postgres, redis, ...) and later the app's compose stack.
 */
export interface AppDokployProject {
  projectId: string;
  environmentId: string;
  projectName: string;
}

/** Public host = override env or hostname of the Dokploy base URL. */
export function derivePublicHost(baseUrl: string): string {
  const override = process.env.DOKPLOY_PUBLIC_HOST?.trim();
  if (override) return override;
  return new URL(baseUrl).hostname;
}

export async function createAppDokployProject(params: {
  base: DokployBase;
  appName: string;
}): Promise<AppDokployProject> {
  const { projectId, environmentId } = await createDokployProject({
    ...params.base,
    name: params.appName,
  });
  return { projectId, environmentId, projectName: params.appName };
}
