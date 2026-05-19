import type { FileEditRecord } from "@/lib/agents/code-chat/types";

export type UiSegment =
  | { kind: "thinking"; id: string; text: string; done: boolean }
  | { kind: "text"; id: string; text: string }
  | {
      kind: "tool";
      id: string;
      name: string;
      argsPreview: string;
      argsBuffer: string;
      result?: {
        ok: boolean;
        summary: string;
        preview?: string;
      };
      fileEdit?: FileEditRecord & { reverted?: boolean };
    };

export interface UserMessage {
  role: "user";
  id: string;
  text: string;
  attachedContext?: string;
}

export interface AssistantMessage {
  role: "assistant";
  id: string;
  segments: UiSegment[];
  status: "streaming" | "done" | "error";
  errorText?: string;
}

export type UiMessage = UserMessage | AssistantMessage;
