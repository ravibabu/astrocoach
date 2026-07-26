import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { MCPToolResponse } from "../types/MCP.js";

const MCP_URL =
  "https://jagannatha-hora-359167915530.europe-west1.run.app/mcp";

export class MCPService {
  private client: Client;
  private connected = false;
  private tools: any[] = [];

  constructor() {
    this.client = new Client(
      {
        name: "astrocoach",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect() {
    if (this.connected) {
      return;
    }

    console.log("🔄 Connecting to MCP Server...");

    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_URL)
    );

    await this.client.connect(transport);

    this.connected = true;

    console.log("✅ MCP Connected");
  }

  async listTools() {
    const result = await this.client.listTools();

    this.tools = result.tools;

    console.log("\n========== AVAILABLE TOOLS ==========");

    for (const tool of this.tools) {
      console.log(`• ${tool.name}`);
    }

    console.log("=====================================\n");

    return this.tools;
  }

  getTools() {
    return [...this.tools];
  }

async callTool(
    toolName: string,
    args: Record<string, any>
    ): Promise<MCPToolResponse> {

    console.log(`🔧 Calling Tool : ${toolName}`);

    const response = await this.client.callTool({
        name: toolName,
        arguments: args,
    });

    return response as MCPToolResponse;
}
}