/**
 * Apply a unified diff that was accidentally written as file content.
 * Reads the file, detects if it contains raw diff markers (+/-/@@),
 * and rewrites it with only the "+" lines (the intended new content).
 */
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  const { outputDir, file } = await req.json() as { outputDir: string; file: string };
  if (!outputDir || !file) {
    return Response.json({ error: "outputDir and file required" }, { status: 400 });
  }

  const absPath = path.resolve(path.join(outputDir, file));
  if (!absPath.startsWith(path.resolve(outputDir))) {
    return Response.json({ error: "Path traversal detected" }, { status: 400 });
  }

  let content: string;
  try {
    content = await fs.readFile(absPath, "utf-8");
  } catch {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  const lines = content.split("\n");
  const hasDiffMarkers =
    lines.some((l) => l.startsWith("@@")) &&
    (lines.some((l) => l.startsWith("+")) || lines.some((l) => l.startsWith("-")));

  if (!hasDiffMarkers) {
    return Response.json({ ok: false, message: "File does not appear to contain diff markers." });
  }

  // Keep context lines and "+" lines; drop "-" lines and diff metadata
  const fixed = lines
    .filter((l) =>
      !l.startsWith("---") &&
      !l.startsWith("+++") &&
      !l.startsWith("@@") &&
      !l.startsWith("diff ") &&
      !l.startsWith("index ") &&
      !l.startsWith("-"),
    )
    .map((l) => (l.startsWith("+") ? l.slice(1) : l))
    .join("\n");

  await fs.writeFile(absPath, fixed, "utf-8");
  return Response.json({ ok: true, lines: fixed.split("\n").length });
}
