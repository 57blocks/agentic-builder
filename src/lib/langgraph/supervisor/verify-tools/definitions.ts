import type { OpenRouterToolDefinition } from "@/lib/openrouter";
import { STRUCTURED_SUPERVISOR_TOOLS } from "../../structured-verify-tools";

export const SUPERVISOR_VERIFY_TOOLS: OpenRouterToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "bash",
      description:
        "Run a shell command with cwd = project root. " +
        "Use for: pnpm/npm install, pnpm add <pkg> --filter <workspace>, " +
        "npx tsc --noEmit, npx prisma generate, etc. " +
        "For integration validation, scope commands explicitly to frontend/ or backend/.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file by relative path from the project root.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path, e.g. apps/api/src/index.ts",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Write or replace a file at the given relative path. In IntegrationVerifyFix this may overwrite scaffold-protected files when needed.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description:
        "List files recursively under a directory (default: project root).",
      parameters: {
        type: "object",
        properties: {
          dir: {
            type: "string",
            description: "Directory relative to project root (omit for root)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep",
      description:
        "Search for a pattern in source files (.ts/.tsx/.json). Returns matching lines.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Search pattern (regex or literal)",
          },
          path: {
            type: "string",
            description: "File or directory to search (default: .)",
          },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "report_done",
      description:
        "Signal that the verify+fix loop is complete. " +
        "status='pass' when `tsc --noEmit` exits 0. " +
        "status='fail' when errors remain that you cannot resolve.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pass", "fail"] },
          summary: {
            type: "string",
            description:
              "Brief summary: what was fixed, or remaining errors if fail",
          },
        },
        required: ["status", "summary"],
      },
    },
  },
  ...STRUCTURED_SUPERVISOR_TOOLS,
];
