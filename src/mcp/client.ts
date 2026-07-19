import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export class MCPService {
  private client: Client;

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
    console.log("🔄 Connecting to MCP server...");

    const transport = new StreamableHTTPClientTransport(
      new URL("https://jagannatha-hora-359167915530.europe-west1.run.app/mcp")
    );

    await this.client.connect(transport);

    console.log("✅ Connected to MCP server");
  }

  async listTools() {
    const result = await this.client.listTools();

    console.log("\n========== AVAILABLE TOOLS ==========");

    for (const tool of result.tools) {
      console.log(`• ${tool.name}`);
    }

    console.log("=====================================\n");
  }

  getClient() {
    return this.client;
  }
}