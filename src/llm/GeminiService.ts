import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "../types/ChatMessage.js";
import { ASTROLOGY_SYSTEM_PROMPT } from "../prompts/astrology.system.js";

export class GeminiService {

    private ai: GoogleGenAI;

    constructor() {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY!,
        });
    }

    async generate(
        history: ChatMessage[],
        tools?: any[]
    ) {

        const request: any = {
            model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
            contents: history,
            config: {
                systemInstruction: ASTROLOGY_SYSTEM_PROMPT,
            },
        };

        if (tools?.length) {

            console.log("Using Astrology System Prompt");

            console.log(
                `Sending ${tools[0].functionDeclarations.length} tools to Gemini`
            );

            request.config.tools = tools;
        }

        const response = await this.ai.models.generateContent(request);

        return response;
    }
}
