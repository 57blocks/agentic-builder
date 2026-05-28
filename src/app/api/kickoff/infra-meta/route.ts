import {
  readKickoffInfraMetadata,
  type KickoffInfraFile,
} from "@/lib/pipeline/kickoff-infra";
import type { InfraMeta } from "@/components/kickoff/InfraSection";

/**
 * Fallback source for the kickoff Infra panel. The summary step's metadata
 * only carries `integrations.infra` when the kickoff run happened with
 * DOKPLOY_URL + DOKPLOY_TOKEN set. For older runs (or runs where the
 * provisioning predated the metadata wiring) the panel would otherwise be
 * blank even though `.blueprint/kickoff-infra.json` exists on disk.
 *
 * This endpoint reads that file and reshapes it into the `InfraMeta` the
 * panel already understands, so the UI can fall back to it.
 */
function toInfraMeta(file: KickoffInfraFile): InfraMeta {
  return {
    ok: true,
    dokployProjectId: file.dokployProjectId,
    appName: file.appName,
    services: file.services.map((s) => ({
      kind: s.kind,
      appName: s.appName,
      externalPort: s.externalPort,
      publicUrl: s.publicUrl,
    })),
  };
}

export async function GET() {
  const file = await readKickoffInfraMetadata(process.cwd()).catch(() => null);
  if (!file || file.services.length === 0) {
    return Response.json({ infra: null });
  }
  return Response.json({ infra: toInfraMeta(file) });
}
