import { describe, expect, it } from "vitest";
import { supersedeStaleReadResults } from "../worker-tool-history-compaction";
import type { ChatMessage } from "@/lib/llm-types";

function asstRead(id: string, name: string, args: object): ChatMessage {
  return {
    role: "assistant",
    content: "",
    tool_calls: [
      { id, type: "function", function: { name, arguments: JSON.stringify(args) } },
    ],
  };
}
function toolResult(id: string, name: string, content: string): ChatMessage {
  return { role: "tool", tool_call_id: id, name, content };
}

const PLACEHOLDER_PREFIX = "[superseded";

describe("supersedeStaleReadResults", () => {
  it("supersedes earlier reads of the same file, keeps the latest", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "sys" },
      asstRead("1", "read_file", { path: "a.ts" }),
      toolResult("1", "read_file", "OLD CONTENTS of a.ts"),
      asstRead("2", "read_file", { path: "a.ts" }),
      toolResult("2", "read_file", "NEW CONTENTS of a.ts"),
    ];
    const r = supersedeStaleReadResults(messages);
    expect(r.superseded).toBe(1);
    expect(messages[2].content.startsWith(PLACEHOLDER_PREFIX)).toBe(true);
    expect(messages[4].content).toBe("NEW CONTENTS of a.ts"); // latest kept
  });

  it("does not touch reads of different files", () => {
    const messages: ChatMessage[] = [
      asstRead("1", "read_file", { path: "a.ts" }),
      toolResult("1", "read_file", "a"),
      asstRead("2", "read_file", { path: "b.ts" }),
      toolResult("2", "read_file", "b"),
    ];
    expect(supersedeStaleReadResults(messages).superseded).toBe(0);
    expect(messages[1].content).toBe("a");
    expect(messages[3].content).toBe("b");
  });

  it("treats key order in args as equivalent (stable fingerprint)", () => {
    const messages: ChatMessage[] = [
      asstRead("1", "grep", { pattern: "x", path: "src" }),
      toolResult("1", "grep", "old"),
      asstRead("2", "grep", { path: "src", pattern: "x" }),
      toolResult("2", "grep", "new"),
    ];
    expect(supersedeStaleReadResults(messages).superseded).toBe(1);
    expect(messages[1].content.startsWith(PLACEHOLDER_PREFIX)).toBe(true);
  });

  it("NEVER supersedes write tools", () => {
    const messages: ChatMessage[] = [
      asstRead("1", "write_file", { path: "a.ts", content: "v1" }),
      toolResult("1", "write_file", "wrote a.ts v1"),
      asstRead("2", "write_file", { path: "a.ts", content: "v2" }),
      toolResult("2", "write_file", "wrote a.ts v2"),
    ];
    expect(supersedeStaleReadResults(messages).superseded).toBe(0);
    expect(messages[1].content).toBe("wrote a.ts v1");
  });

  it("is idempotent (re-running supersedes nothing new)", () => {
    const messages: ChatMessage[] = [
      asstRead("1", "read_file", { path: "a.ts" }),
      toolResult("1", "read_file", "old"),
      asstRead("2", "read_file", { path: "a.ts" }),
      toolResult("2", "read_file", "new"),
    ];
    expect(supersedeStaleReadResults(messages).superseded).toBe(1);
    expect(supersedeStaleReadResults(messages).superseded).toBe(0);
  });

  it("keeps the latest of 3+ repeated reads (supersedes the first two)", () => {
    const messages: ChatMessage[] = [
      asstRead("1", "read_file", { path: "a.ts" }),
      toolResult("1", "read_file", "v1"),
      asstRead("2", "read_file", { path: "a.ts" }),
      toolResult("2", "read_file", "v2"),
      asstRead("3", "read_file", { path: "a.ts" }),
      toolResult("3", "read_file", "v3"),
    ];
    expect(supersedeStaleReadResults(messages).superseded).toBe(2);
    expect(messages[5].content).toBe("v3");
  });
});
