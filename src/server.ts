import "dotenv/config";
import express from "express";
import { askGemini } from "./llm/gemini.js";
import { MCPService } from "./mcp/client.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * Health Check
 */
app.get("/", (req, res) => {
  res.send("🚀 AstroCoach Backend Running");
});

app.get("/health", (req, res) => {
  res.json({
    status: "UP",
    timestamp: new Date(),
    version: "1.0.0",
  });
});

/**
 * Chat Endpoint
 */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "message is required",
      });
    }

    const answer = await askGemini(message);

    res.json({
      answer,
    });
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/**
 * Application Startup
 */
async function bootstrap() {
  console.log("=================================");
  console.log("Starting AstroCoach Backend...");
  console.log("=================================");

  const mcp = new MCPService();

  await mcp.connect();

  await mcp.listTools();

  app.listen(PORT, () => {
    console.log("");
    console.log("=================================");
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("=================================");
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start application");
  console.error(err);
  process.exit(1);
});