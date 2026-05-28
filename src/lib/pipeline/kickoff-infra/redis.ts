import { provisionAppRedis } from "@/lib/deploy/redis";
import type { DokployBase } from "@/lib/deploy/dokploy";
import type { AppDokployProject } from "./dokploy-project";
import type { InfraServiceInfo } from "./types";

export interface ProvisionRedisParams {
  base: DokployBase;
  project: AppDokployProject;
  appName: string;
  publicHost: string;
  portBase?: number;
}

export async function provisionRedis(
  params: ProvisionRedisParams,
): Promise<InfraServiceInfo> {
  const r = await provisionAppRedis({
    baseUrl: params.base.baseUrl,
    token: params.base.token,
    appName: params.appName,
    projectId: params.project.projectId,
    environmentId: params.project.environmentId,
    publicHost: params.publicHost,
    portBase: params.portBase,
  });
  return {
    kind: "redis",
    id: r.redisId,
    appName: r.appName,
    publicUrl: r.publicUrl,
    internalUrl: r.internalUrl,
    externalPort: r.externalPort,
  };
}
