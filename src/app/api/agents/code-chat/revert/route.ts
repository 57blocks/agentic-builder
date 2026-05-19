import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { resolveSandboxedPath } from "@/lib/agents/code-chat/path-sandbox";
import type { RevertRequest } from "@/lib/agents/code-chat/types";

const FRONTEND_SUBDIR_CANDIDATES = [
  "frontend",
  "apps/web",
  "apps/frontend",
  "web",
  "app",
  "client",
];

async function resolveAppDir(outputRoot: string): Promise<string | null> {
  const tryAt = async (dir: string) =>
    fs.access(path.join(dir, "package.json")).then(() => true).catch(() => false);
  if (await tryAt(outputRoot)) return outputRoot;
  for (const sub of FRONTEND_SUBDIR_CANDIDATES) {
    const candidate = path.join(outputRoot, sub);
    if (await tryAt(candidate)) return candidate;
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: RevertRequest & { codeOutputDir?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.path) return Response.json({ error: "path is required" }, { status: 400 });

  const outputRoot = resolveCodeOutputRoot(process.cwd(), body.codeOutputDir);
  const appDir = await resolveAppDir(outputRoot);
  if (!appDir) {
    return Response.json({ error: "No app directory with package.json found" }, { status: 400 });
  }

  let abs: string;
  try {
    abs = resolveSandboxedPath(appDir, body.path).abs;
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid path" },
      { status: 400 },
    );
  }

  try {
    if (body.before === null) {
      await fs.unlink(abs).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== "ENOENT") throw err;
      });
      return Response.json({ ok: true, action: "deleted" });
    }
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body.before, "utf-8");
    return Response.json({ ok: true, action: "restored", bytes: body.before.length });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
