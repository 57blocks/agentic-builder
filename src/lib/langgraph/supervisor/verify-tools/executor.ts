import { execFile } from "child_process";
import { promisify } from "util";
import { fsRead, fsWrite, listFiles } from "../../tools";
import { executeStructuredSupervisorTool } from "../../structured-verify-tools";

const execFileAsync = promisify(execFile);

export function buildSupervisorSearchMatcher(
  pattern: string,
): (line: string) => boolean {
  try {
    const regex = new RegExp(pattern, "i");
    return (line: string) => regex.test(line);
  } catch {
    const lowered = pattern.toLowerCase();
    return (line: string) => line.toLowerCase().includes(lowered);
  }
}

export async function executeSupervisorTool(
  name: string,
  args: Record<string, unknown>,
  outputDir: string,
): Promise<string> {
  const MAX_OUT = 4000;
  const structuredResult = await executeStructuredSupervisorTool({
    name,
    args,
    outputDir,
  });
  if (structuredResult !== null) return structuredResult;
  switch (name) {
    case "bash": {
      const command = String(args.command ?? "").trim();
      if (!command) return "Error: empty command";
      // Block obviously destructive ops only
      const unsafe = [/rm\s+-rf?\s+\//, /sudo\b/, /git\s+push\b/];
      if (unsafe.some((r) => r.test(command))) {
        return `Error: command rejected — unsafe pattern: ${command.slice(0, 80)}`;
      }
      console.log(`[Supervisor] VerifyFix bash: ${command.slice(0, 120)}`);
      try {
        const { stdout, stderr } = await execFileAsync(
          "bash",
          ["-c", command],
          {
            cwd: outputDir,
            maxBuffer: 10 * 1024 * 1024,
            timeout: 120_000,
            env: { ...process.env, FORCE_COLOR: "0" },
          },
        );
        const out = ((stdout ?? "") + (stderr ?? "")).trim();
        return `exit_code: 0\n${out.slice(0, MAX_OUT)}`;
      } catch (err: unknown) {
        const e = err as {
          code?: number;
          stdout?: string;
          stderr?: string;
          message?: string;
        };
        const out = (
          (e.stdout ?? "") + (e.stderr ?? "") ||
          e.message ||
          "unknown error"
        ).trim();
        return `exit_code: ${e.code ?? 1}\n${out.slice(0, MAX_OUT)}`;
      }
    }
    case "read_file": {
      const fp = String(args.path ?? "");
      const content = await fsRead(fp, outputDir);
      return content.slice(0, MAX_OUT);
    }
    case "write_file": {
      const fp = String(args.path ?? "");
      const content = String(args.content ?? "");
      await fsWrite(fp, content, outputDir, { forceProtectedOverwrite: true });
      return `OK: wrote ${fp}`;
    }
    case "list_files": {
      const dir = String(args.dir ?? ".");
      const files = await listFiles(dir, outputDir);
      return files.join("\n").slice(0, MAX_OUT);
    }
    case "grep": {
      const pattern = String(args.pattern ?? "");
      const searchPath = String(args.path ?? ".");
      if (!pattern) return "Error: pattern required";

      const matcher = buildSupervisorSearchMatcher(pattern);
      const filePaths: string[] = [];
      const directFileContent = await fsRead(searchPath, outputDir);
      if (
        !directFileContent.startsWith("FILE_NOT_FOUND") &&
        !directFileContent.startsWith("REJECTED")
      ) {
        filePaths.push(searchPath);
      } else {
        filePaths.push(...(await listFiles(searchPath, outputDir)));
      }

      const matches: string[] = [];
      for (const relPath of filePaths) {
        if (!/\.(ts|tsx|js|jsx|json|md)$/.test(relPath)) continue;
        const content = await fsRead(relPath, outputDir);
        if (
          content.startsWith("FILE_NOT_FOUND") ||
          content.startsWith("REJECTED")
        ) {
          continue;
        }
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (!matcher(lines[i])) continue;
          matches.push(`${relPath}:${i + 1}:${lines[i]}`);
          if (matches.length >= 60) break;
        }
        if (matches.length >= 60) break;
      }

      return (matches.join("\n") || "No matches found.")
        .trim()
        .slice(0, MAX_OUT);
    }
    default:
      return `Error: unknown tool '${name}'`;
  }
}
