import { provisionAppPostgres } from "@/lib/deploy/postgres";
import type { DokployBase } from "@/lib/deploy/dokploy";
import type { AppDokployProject } from "./dokploy-project";
import type { InfraServiceInfo } from "./types";

export interface ProvisionDatabaseParams {
  base: DokployBase;
  project: AppDokployProject;
  appName: string;
  publicHost: string;
  portBase?: number;
}

export async function provisionDatabase(
  params: ProvisionDatabaseParams,
): Promise<InfraServiceInfo> {
  const r = await provisionAppPostgres({
    baseUrl: params.base.baseUrl,
    token: params.base.token,
    appName: params.appName,
    projectId: params.project.projectId,
    environmentId: params.project.environmentId,
    publicHost: params.publicHost,
    portBase: params.portBase,
  });
  return {
    kind: "postgres",
    id: r.postgresId,
    appName: r.appName,
    publicUrl: r.publicUrl,
    internalUrl: r.internalUrl,
    externalPort: r.externalPort,
  };
}
