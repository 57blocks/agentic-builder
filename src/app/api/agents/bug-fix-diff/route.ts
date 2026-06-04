import { NextRequest } from "next/server";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

export async function GET(req: NextRequest) {
  const outputDir = req.nextUrl.searchParams.get("outputDir")
    ?? path.resolve(process.cwd(), "generated-code");
  const filePath = req.nextUrl.searchParams.get("file");

  if (!filePath) return Response.json({ content: null, error: "file param required" });

  const absPath = path.join(outputDir, filePath);

  // Try git diff first
  const isGit = await fs.access(path.join(outputDir, ".git")).then(() => true).catch(() => false);
  if (isGit) {
    try {
      const { stdout: headDiff } = await execFileAsync(
        "git", ["diff", "HEAD", "--", filePath],
        { cwd: outputDir, maxBuffer: 1024 * 512 },
      );
      if (headDiff.trim()) return Response.json({ diff: headDiff, mode: "diff" });

      const { stdout: unstagedDiff } = await execFileAsync(
        "git", ["diff", "--", filePath],
        { cwd: outputDir, maxBuffer: 1024 * 512 },
      );
      if (unstagedDiff.trim()) return Response.json({ diff: unstagedDiff, mode: "diff" });
    } catch { /* fall through to content */ }
  }

  // Fall back: read file content
  try {
    const content = await fs.readFile(absPath, "utf-8");
    return Response.json({ content, mode: "content" });
  } catch {
    return Response.json({ content: null, error: "File not found" });
  }
}
