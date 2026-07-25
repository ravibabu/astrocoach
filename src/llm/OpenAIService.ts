import OpenAI from "openai";
import type { ChatMessage } from "../types/ChatMessage.js";
import { ASTROLOGY_SYSTEM_PROMPT } from "../prompts/astrology.system.js";

export class OpenAIService {

    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_KEY!,
        });
    }

    async generate(
        history: ChatMessage[],
        tools?: any[]
    ) {

        const messages: any[] = [
            {
                role: "system",
                content: ASTROLOGY_SYSTEM_PROMPT,
            },
        ];

        // Convert Gemini history to OpenAI messages
        for (const msg of history) {

            if (msg.parts?.[0]?.text) {

                messages.push({
                    role: msg.role,
                    content: msg.parts[0].text,
                });

            }

        }

        const request: any = {
            model: "gpt-5",
            messages,
        };

        if (tools?.length) {

            console.log(
                `Sending ${tools[0].functionDeclarations.length} tools to OpenAI`
            );

            request.tools = tools[0].functionDeclarations.map((tool: any) => ({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            }));
        }

        const response = await this.client.chat.completions.create(request);

        return response;
    }

}