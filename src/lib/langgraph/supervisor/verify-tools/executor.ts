import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import { detectPackageManager, fsRead, fsWrite, listFiles } from "../../tools";
import { executeStructuredSupervisorTool } from "../../structured-verify-tools";

const execFileAsync = promisify(execFile);

type PackageManager = "pnpm" | "yarn" | "npm";

async function readDeclaredPackageManager(
  relDir: string,
  outputDir: string,
): Promise<PackageManager | null> {
  const relPkg = relDir === "." ? "package.json" : `${relDir}/package.json`;
  const raw = await fsRead(relPkg, outputDir);
  if (raw.startsWith("FILE_NOT_FOUND") || raw.startsWith("REJECTED")) {
    return null;
  }
  try {
    const pkg = JSON.parse(raw) as { packageManager?: string };
    const pm = (pkg.packageManager ?? "").toLowerCase();
    if (pm.startsWith("pnpm@")) return "pnpm";
    if (pm.startsWith("yarn@")) return "yarn";
    if (pm.startsWith("npm@")) return "npm";
  } catch {
    // ignore malformed package.json
  }
  return null;
}

function leadingCdDir(command: string): string | null {
  const m = command.match(/^\s*cd\s+([^;&|]+?)\s*&&/);
  if (!m) return null;
  const dir = m[1].trim().replace(/^['"]|['"]$/g, "");
  if (!dir || path.isAbsolute(dir) || dir.includes("..")) return null;
  return dir.replace(/\\/g, "/");
}

async function inferProjectPackageManager(
  outputDir: string,
): Promise<PackageManager> {
  const rootDetected = await detectPackageManager(outputDir).catch(
    () => "npm" as const,
  );
  if (rootDetected !== "npm") return rootDetected;

  const declared = new Set<PackageManager>();
  // Generated M/L-tier projects usually have no root package.json; the package
  // manager is declared in frontend/backend. Avoid a full tree walk here because
  // verify bash runs often and node_modules can be large.
  for (const relDir of [".", "frontend", "backend", "apps/web", "apps/api"]) {
    const pm = await readDeclaredPackageManager(relDir, outputDir);
    if (pm) declared.add(pm);
  }
  return declared.size === 1 ? [...declared][0] : rootDetected;
}

async function resolvePackageManagerForCommand(
  command: string,
  outputDir: string,
): Promise<PackageManager> {
  const cdDir = leadingCdDir(command);
  if (cdDir) {
    const declared = await readDeclaredPackageManager(cdDir, outputDir);
    if (declared) return declared;
    const detected = await detectPackageManager(
      path.join(outputDir, cdDir),
    ).catch(() => "npm" as const);
    if (detected !== "npm") return detected;
  }
  return inferProjectPackageManager(outputDir);
}

function rewritePackageManagerCommand(
  command: string,
  pm: PackageManager,
): string {
  if (pm === "npm") return command;

  let rewritten = command;
  if (pm === "pnpm") {
    rewritten = rewritten
      // Generated projects are pnpm workspaces. `npm install` against a
      // pnpm-lock.yaml can fail with opaque npm internals like
      // "Cannot read properties of null (reading 'matches')".
      .replace(/\bnpm\s+install\b(?!\s+-g)/g, "pnpm install")
      .replace(/\bnpm\s+run\s+/g, "pnpm run ")
      .replace(/\bnpm\s+test\b/g, "pnpm test")
      .replace(/\bnpm\s+add\s+/g, "pnpm add ")
      .replace(/\bnpx\s+tsx\b/g, "pnpm exec tsx")
      .replace(/\bnpx\s+tsc\b/g, "pnpm exec tsc");
    // `npm install --save[-dev] pkg` is npm's package-add form. Convert it to
    // pnpm add while keeping the common dev flag spelling.
    rewritten = rewritten.replace(
      /\bpnpm\s+install\s+(--save-dev|--save)\s+/g,
      (_m, flag: string) =>
        flag === "--save-dev" ? "pnpm add --save-dev " : "pnpm add ",
    );
    return rewritten;
  }

  return rewritten
    .replace(/\bnpm\s+install\b(?!\s+-g)/g, "yarn install")
    .replace(/\bnpm\s+run\s+/g, "yarn run ")
    .replace(/\bnpm\s+test\b/g, "yarn test")
    .replace(/\bnpm\s+add\s+/g, "yarn add ")
    .replace(/\bnpx\s+tsx\b/g, "yarn tsx")
    .replace(/\bnpx\s+tsc\b/g, "yarn tsc")
    .replace(/\byarn\s+install\s+(--save-dev|--save)\s+/g, "yarn add ");
}

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
  options?: { bashTimeoutMs?: number },
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
      const requestedCommand = String(args.command ?? "").trim();
      let command = requestedCommand;
      if (!command) return "Error: empty command";
      // Block obviously destructive ops only
      const unsafe = [/rm\s+-rf?\s+\//, /sudo\b/, /git\s+push\b/];
      if (unsafe.some((r) => r.test(command))) {
        return `Error: command rejected — unsafe pattern: ${command.slice(0, 80)}`;
      }
      const pm = await resolvePackageManagerForCommand(command, outputDir);
      command = rewritePackageManagerCommand(command, pm);
      if (command !== requestedCommand) {
        console.log(
          `[Supervisor] VerifyFix bash: package manager rewrite (${pm}): ${requestedCommand.slice(0, 120)} -> ${command.slice(0, 120)}`,
        );
      } else {
        console.log(`[Supervisor] VerifyFix bash: ${command.slice(0, 120)}`);
      }
      try {
        const { stdout, stderr } = await execFileAsync(
          "bash",
          ["-o", "pipefail", "-c", command],
          {
            cwd: outputDir,
            maxBuffer: 10 * 1024 * 1024,
            timeout: options?.bashTimeoutMs ?? 120_000,
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
