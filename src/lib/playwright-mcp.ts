/**
 * Playwright MCP Client
 *
 * Uses @playwright/mcp's programmatic API + InMemoryTransport for in-process
 * browser automation without spawning a subprocess.
 *
 * Each instance manages its own browser context. Do NOT use a singleton —
 * parallel bug tests need isolated browser instances.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createConnection } from "@playwright/mcp";
import type { OpenRouterToolDefinition } from "@/lib/llm-types";

// PlaywrightMcpConfig shape from @playwright/mcp — inlined because the sub-path has no type declarations
type PlaywrightMcpConfig = Parameters<typeof createConnection>[0];

const DEFAULT_CONFIG: PlaywrightMcpConfig = {
  browser: {
    browserName: "chromium",
    isolated: true,
    launchOptions: { headless: process.env.E2E_HEADLESS !== "false" },
  },
  capabilities: ["core"],
  imageResponses: "omit",
  timeouts: { action: 8_000, navigation: 30_000 },
};

export interface PlaywrightToolResult {
  text: string;
  isError: boolean;
}

export class PlaywrightMcpClient {
  private client: Client | null = null;
  private serverTransport: InMemoryTransport | null = null;
  private clientTransport: InMemoryTransport | null = null;
  private _tools: OpenRouterToolDefinition[] = [];

  async connect(config: PlaywrightMcpConfig = DEFAULT_CONFIG): Promise<void> {
    if (this.client) return;

    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    this.serverTransport = serverTransport;
    this.clientTransport = clientTransport;

    const server = await createConnection(config);
    await server.connect(serverTransport);

    this.client = new Client({ name: "AgenticBuilder-E2E", version: "1.0.0" });
    await this.client.connect(clientTransport);

    const { tools } = await this.client.listTools();
    this._tools = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: (t.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
      },
    }));
  }

  get tools(): OpenRouterToolDefinition[] {
    return this._tools;
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<PlaywrightToolResult> {
    if (!this.client) throw new Error("PlaywrightMCP not connected");
    const result = await this.client.callTool({ name, arguments: args });
    const content = result.content as { type: string; text?: string }[];
    const text = content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("\n")
      || "(no text output)";
    return { text, isError: result.isError === true };
  }

  async disconnect(): Promise<void> {
    try { await this.client?.close(); } catch { /* ignore */ }
    try { await this.clientTransport?.close(); } catch { /* ignore */ }
    try { await this.serverTransport?.close(); } catch { /* ignore */ }
    this.client = null;
    this.clientTransport = null;
    this.serverTransport = null;
    this._tools = [];
  }

  get isConnected(): boolean {
    return this.client !== null;
  }
}
