import type { OpenRouterToolDefinition } from "@/lib/openrouter";

export const CODE_CHAT_TOOL_DEFS: OpenRouterToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read a file by relative path from the generated project root. Use this before editing to see current contents.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path, e.g. src/App.tsx",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description:
        "List files (recursively) under a directory relative to the project root. Use for orientation when paths are unknown.",
      parameters: {
        type: "object",
        properties: {
          dir: {
            type: "string",
            description: "Directory relative to root. Defaults to '.'.",
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
        "Search for a literal substring or simple regex across project files. Returns matching lines with file paths.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Substring or regex." },
          path: {
            type: "string",
            description: "File or directory relative to root. Defaults to '.'.",
          },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "Replace an exact text snippet inside one file. Use for small, targeted edits. Fails if oldText is not unique unless replaceAll=true.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          oldText: { type: "string" },
          newText: { type: "string" },
          replaceAll: { type: "boolean" },
        },
        required: ["path", "oldText", "newText"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Create a new file or fully overwrite an existing one. Prefer edit_file for small edits.",
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
];
