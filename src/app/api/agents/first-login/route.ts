import { NextRequest } from "next/server";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { extractFirstLoginInfo } from "@/lib/pipeline/first-login";

/**
 * GET /api/agents/first-login?codeOutputDir=...
 *
 * Returns the generated app's getting-started checklist + the seeded login
 * credentials (parsed from its backend seed scripts), so the preview UI can
 * tell the user exactly how to run it and what to log in with — instead of a
 * silent "Invalid email or password" because the seeded accounts were never
 * surfaced anywhere.
 */
export async function GET(request: NextRequest) {
  const codeOutputDir =
    request.nextUrl.searchParams.get("codeOutputDir") || undefined;
  const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);
  try {
    const info = await extractFirstLoginInfo(outputRoot);
    return Response.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read first-login info";
    return Response.json({ error: message }, { status: 500 });
  }
}
