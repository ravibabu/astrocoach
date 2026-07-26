import "dotenv/config";
import cors from "cors";
import express from "express";

import { ChatService } from "./services/chatService.js";
import { MCPService } from "./mcp/MCPService.js";
import { prisma } from "./config/database.js";
import {
  authenticateFirebase,
  type AuthenticatedRequest,
} from "./middleware/authenticateFirebase.js";

const app = express();
const PORT = process.env.PORT || 3000;

let chatService: ChatService;

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  })
);
app.use(express.json({ limit: "32kb" }));

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
app.get("/profile", authenticateFirebase, async (req: AuthenticatedRequest, res) => {
  const firebaseUser = req.firebaseUser!;
  const user = await prisma.user.findUnique({
    where: { firebaseUid: firebaseUser.uid },
    select: {
      name: true,
      email: true,
      mobile: true,
      birthDate: true,
      birthTime: true,
      birthPlace: true,
    },
  });

  return res.json({
    profile: user
      ? {
          ...user,
          birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
        }
      : null,
  });
});

app.post("/chat", authenticateFirebase, async (req: AuthenticatedRequest, res) => {
  try {
    const { message, birthDetails } = req.body;
    const firebaseUser = req.firebaseUser!;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "message is required",
      });
    }

    if (
      !birthDetails ||
      typeof birthDetails.date !== "string" ||
      typeof birthDetails.time !== "string" ||
      typeof birthDetails.place !== "string" ||
      !birthDetails.date ||
      !birthDetails.time ||
      !birthDetails.place.trim()
    ) {
      return res.status(400).json({
        error: "birth date, time, and place are required",
      });
    }

    const birthDate = new Date(`${birthDetails.date}T00:00:00.000Z`);
    if (Number.isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: "birth date is invalid" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: firebaseUser.uid },
          ...(firebaseUser.email ? [{ email: firebaseUser.email }] : []),
          ...(firebaseUser.phone_number
            ? [{ mobile: firebaseUser.phone_number }]
            : []),
        ],
      },
    });

    const profileData = {
      firebaseUid: firebaseUser.uid,
      name: firebaseUser.name ?? existingUser?.name ?? null,
      email: firebaseUser.email ?? existingUser?.email ?? null,
      mobile: firebaseUser.phone_number ?? existingUser?.mobile ?? null,
      birthDate,
      birthTime: birthDetails.time,
      birthPlace: birthDetails.place.trim(),
    };

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: profileData,
        })
      : await prisma.user.create({ data: profileData });

    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: message.trim().slice(0, 80),
        lastMessageAt: new Date(),
        messages: {
          create: {
            role: "user",
            content: message.trim(),
          },
        },
      },
    });

    const agentMessage = [
      "Use these saved birth details for the consultation:",
      `Date: ${birthDetails.date}`,
      `Time: ${birthDetails.time}`,
      `Place: ${birthDetails.place.trim()}`,
      "",
      `Question: ${message.trim()}`,
    ].join("\n");

    const answer = await chatService.chat(agentMessage);

    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: answer,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return res.json({
      answer,
      conversationId: conversation.id,
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

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

bootstrap().catch((error) => {
  console.error("Failed to start application");
  console.error(error);
  process.exit(1);
});
