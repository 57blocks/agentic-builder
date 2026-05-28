import { NextRequest } from "next/server";
import net from "net";

/**
 * TCP reachability probe for a single host:port. Used by the kickoff Infra
 * panel to show a Reachable/Unreachable badge next to each provisioned
 * Postgres / Redis URL.
 *
 * Stays a thin TCP connect — no auth handshake — so it works for any service
 * type. Result is a binary "the port is listening from where this server can
 * reach it." That's not identical to "the developer's laptop can reach it"
 * but for typical Dokploy setups (public host) it's the same answer.
 */

const TIMEOUT_MS = 3000;

interface PingResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

function probe(host: string, port: number): Promise<PingResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host, port });
    let settled = false;
    const settle = (r: PingResult) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(r);
    };
    socket.setTimeout(TIMEOUT_MS);
    socket.once("connect", () =>
      settle({ ok: true, latencyMs: Date.now() - start }),
    );
    socket.once("timeout", () =>
      settle({ ok: false, error: "timeout" }),
    );
    socket.once("error", (err: Error) =>
      settle({ ok: false, error: err.message }),
    );
  });
}

function parseHostPort(url: string): { host: string; port: number } | null {
  try {
    const u = new URL(url);
    const port = Number(u.port);
    if (!u.hostname || !Number.isFinite(port) || port <= 0) return null;
    return { host: u.hostname, port };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const { url, host, port } = (body ?? {}) as {
    url?: string;
    host?: string;
    port?: number;
  };

  let target: { host: string; port: number } | null = null;
  if (typeof url === "string" && url.trim()) {
    target = parseHostPort(url);
  } else if (typeof host === "string" && Number.isFinite(port)) {
    target = { host, port: port! };
  }
  if (!target) {
    return Response.json(
      { ok: false, error: "missing url or host/port" },
      { status: 400 },
    );
  }
  const result = await probe(target.host, target.port);
  return Response.json(result);
}
