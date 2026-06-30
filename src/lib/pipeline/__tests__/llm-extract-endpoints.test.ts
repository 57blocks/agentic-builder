import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import {
  buildEndpointExtractionPrompt,
  parseEndpointsFromLlm,
  extractEndpointsViaLlm,
} from "../import-analysis/llm-extract-endpoints";
import { extractApiContracts } from "../import-analysis/extract-api-contracts";

describe("parseEndpointsFromLlm", () => {
  it("parses a bare JSON array", () => {
    const r = parseEndpointsFromLlm(
      '[{"method":"get","path":"/users/:id","source":"a.go"}]',
    );
    expect(r).toEqual([
      { method: "GET", path: "/users/:id", source: "a.go" },
    ]);
  });

  it("strips ```json fences and surrounding prose", () => {
    const r = parseEndpointsFromLlm(
      'Here are the endpoints:\n```json\n[{"method":"POST","path":"/login"}]\n```\nDone.',
    );
    expect(r).toEqual([{ method: "POST", path: "/login", source: undefined }]);
  });

  it("dedupes and uppercases methods; skips malformed items", () => {
    const r = parseEndpointsFromLlm(
      '[{"method":"get","path":"/a"},{"method":"GET","path":"/a"},{"foo":1},{"method":"put"}]',
    );
    expect(r).toEqual([{ method: "GET", path: "/a", source: undefined }]);
  });

  it("returns [] on non-array / garbage", () => {
    expect(parseEndpointsFromLlm("not json")).toEqual([]);
    expect(parseEndpointsFromLlm('{"method":"GET"}')).toEqual([]);
    expect(parseEndpointsFromLlm("")).toEqual([]);
  });
});

describe("buildEndpointExtractionPrompt", () => {
  it("includes file markers and the JSON-only instruction", () => {
    const p = buildEndpointExtractionPrompt([
      { file: "routes/users.go", content: "func h(){}" },
    ]);
    expect(p).toContain("routes/users.go");
    expect(p).toContain("JSON array");
    expect(p).toContain("func h(){}");
  });
});

describe("extractEndpointsViaLlm (injected chat, no real LLM)", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "llm-extract-"));
    await fs.mkdir(path.join(dir, "internal", "handler"), { recursive: true });
    await fs.writeFile(
      path.join(dir, "internal", "handler", "users.go"),
      `package handler\nfunc Register(r *gin.Engine){ r.GET("/api/users", list); r.POST("/api/users", create) }`,
      "utf-8",
    );
  });
  afterEach(async () => fs.rm(dir, { recursive: true, force: true }));

  it("packs source, calls chat, parses the response", async () => {
    let receivedPrompt = "";
    const chat = async (prompt: string) => {
      receivedPrompt = prompt;
      return '[{"method":"GET","path":"/api/users"},{"method":"POST","path":"/api/users"}]';
    };
    const eps = await extractEndpointsViaLlm(dir, { chat });
    expect(receivedPrompt).toContain("users.go");
    expect(eps.map((e) => `${e.method} ${e.path}`)).toEqual([
      "GET /api/users",
      "POST /api/users",
    ]);
  });

  it("degrades to [] when the chat call throws (e.g. no key)", async () => {
    const chat = async () => {
      throw new Error("no api key");
    };
    expect(await extractEndpointsViaLlm(dir, { chat })).toEqual([]);
  });

  it("returns [] when there are no source files", async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), "llm-empty-"));
    expect(await extractEndpointsViaLlm(empty, { chat: async () => "[]" })).toEqual(
      [],
    );
    await fs.rm(empty, { recursive: true, force: true });
  });
});

describe("extractApiContracts wires LLM for non-JS backends", () => {
  it("uses injected chat for a Go backend", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "go-contracts-"));
    await fs.writeFile(
      path.join(dir, "main.go"),
      `package main\nfunc main(){ r.GET("/health", h) }`,
      "utf-8",
    );
    const eps = await extractApiContracts(
      dir,
      { framework: "go-http", language: "go", rootDir: "." },
      { chat: async () => '[{"method":"GET","path":"/health"}]' },
    );
    expect(eps.endpoints).toEqual([
      { method: "GET", path: "/health", source: undefined },
    ]);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
