import "dotenv/config";
import express from "express";

import { ChatService } from "./services/ChatService.js";
import { MCPService } from "./mcp/MCPService.js";

const app = express();
const PORT = process.env.PORT || 3000;

let chatService: ChatService;

app.use(express.json());

/**
 * Home
 */
app.get("/", (req, res) => {
  res.send("🚀 AstroCoach Backend Running");
});

/**
 * Health Check
 */
app.get("/health", (req, res) => {
  res.json({
    status: "UP",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

/**
 * Chat
 */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "message is required",
      });
    }

    const answer = await chatService.chat(message);

    return res.json({
      answer,
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      error: error.message ?? "Internal Server Error",
    });
  }
});

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

/**
 * Bootstrap
 */
async function bootstrap() {
  console.log("=================================");
  console.log("Starting AstroCoach Backend...");
  console.log("=================================");

  const mcp = new MCPService();

  await mcp.connect();

  await mcp.listTools();

  chatService = new ChatService(mcp);

  await chatService.initialize();

  app.listen(PORT, () => {
    console.log("");
    console.log("=================================");
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("=================================");
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start application");
  console.error(error);
  process.exit(1);
});