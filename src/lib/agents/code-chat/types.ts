import type { ChatMessage } from "@/lib/openrouter";

export type CodeChatRole = "user" | "assistant" | "system";

export interface CodeChatTurnRequest {
  messages: ChatMessage[];
  codeOutputDir?: string;
  /** Optional context the user attached (e.g. captured console errors). */
  attachedContext?: string;
  /** Optional model override; falls back to server-side default. */
  model?: string;
}

export type CodeChatEvent =
  | { kind: "ready"; appDir: string }
  | { kind: "assistant_delta"; delta: string }
  | { kind: "thinking_delta"; delta: string }
  | { kind: "tool_call_start"; id: string; name: string; argsPreview?: string }
  | { kind: "tool_call_args_delta"; id: string; delta: string }
  | {
      kind: "tool_result";
      id: string;
      name: string;
      ok: boolean;
      summary: string;
      /** Set when a file was created / overwritten / patched. */
      fileEdit?: FileEditRecord;
      /** For read tools, a short preview the UI can show. */
      preview?: string;
    }
  | { kind: "error"; message: string }
  | { kind: "done"; iterations: number };

export interface FileEditRecord {
  /** Stable id so client can request revert. */
  id: string;
  path: string;
  /** "create" when before was missing; "update" otherwise. */
  op: "create" | "update";
  before: string | null;
  after: string;
}

export interface RevertRequest {
  path: string;
  /** Contents to restore. Null means delete the file (it was a create). */
  before: string | null;
}
