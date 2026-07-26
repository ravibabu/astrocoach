import { GeminiService } from "../llm/GeminiService.js";
import { ToolMapper } from "../llm/ToolMapper.js";
import { MCPService } from "../mcp/MCPService.js";
import type { ChatMessage } from "../types/ChatMessage.js";

export class ChatService {
    private gemini: GeminiService;

    constructor(private mcp: MCPService) {
        this.gemini = new GeminiService();
    }

    private geminiTools: any[] = [];

    async initialize() {
        console.log("Initializing Chat Service...");

        this.geminiTools =
            ToolMapper.toGeminiTools(
                this.mcp.getTools()
            );

        console.log(
            `Loaded ${this.geminiTools.length} Gemini Tools`
        );
    }

    async chat(message: string): Promise<string> {

        const startTime = Date.now();
        const maxToolCalls = 1;

        const toolsUsed: string[] = [];

        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let totalTokens = 0;

        const history: ChatMessage[] = [
            {
                role: "user",
                parts: [
                    {
                        text: message,
                    },
                ],
            },
        ];

        // Sending every MCP schema is expensive (currently ~16k prompt tokens).
        // Keep the horoscope entry point plus tools whose names/descriptions match
        // the user's question.
        const requestTools = ToolMapper.selectRelevantTools(
            this.mcp.getTools(),
            message
        );
        const requestGeminiTools = ToolMapper.toGeminiTools(requestTools);

        console.log(
            `Selected ${requestTools.length}/${this.mcp.getTools().length} tools for this request`
        );

        console.log("");
        console.log("=================================");
        console.log("🚀 Starting Agent Loop...");
        console.log("=================================");

        while (true) {

            console.log("");
            console.log("🤖 Asking Gemini...");

            const geminiStart = Date.now();
            // Once a tool has run, omit all declarations. This both enforces the
            // one-tool policy and avoids paying for the schemas a second time.
            const availableTools =
                toolsUsed.length < maxToolCalls ? requestGeminiTools : [];

            const response = await this.gemini.generate(
                history,
                availableTools
            );

            console.log(`⏱ Gemini call: ${Date.now() - geminiStart} ms`);

            //
            // Print token usage for THIS Gemini call
            //
            const usage = response.usageMetadata;

            if (usage) {

                console.log("");

                console.log(
                    `📊 Gemini Tokens -> Prompt: ${usage.promptTokenCount}, Completion: ${usage.candidatesTokenCount}, Total: ${usage.totalTokenCount}`
                );

                totalPromptTokens += usage.promptTokenCount ?? 0;
                totalCompletionTokens += usage.candidatesTokenCount ?? 0;
                totalTokens += usage.totalTokenCount ?? 0;
            }

            //
            // SDK helper
            //
            const modelPart =
                response.candidates?.[0]
                    ?.content?.parts
                    ?.find((part: any) => part.functionCall);

            const functionCall =
                modelPart?.functionCall ??
                response.functionCalls?.[0];

            //
            // Final Answer
            //
            if (!functionCall) {

                console.log("");
                console.log("=================================");
                console.log("📊 Agent Summary");
                console.log("=================================");

                console.log("Tools Used:");
                console.log(toolsUsed);

                console.log("");

                console.log(`Prompt Tokens     : ${totalPromptTokens}`);
                console.log(`Completion Tokens : ${totalCompletionTokens}`);
                console.log(`Total Tokens      : ${totalTokens}`);

                console.log("");

                console.log(
                    `⏱ Execution Time : ${Date.now() - startTime} ms`
                );

                console.log("=================================");

                return response.text ?? "No response from Gemini.";
            }

            if (!functionCall.name) {
                throw new Error("Function call missing tool name.");
            }

            if (toolsUsed.length >= maxToolCalls) {
                throw new Error("Maximum tool calls exceeded.");
            }

            //
            // Track tool usage
            //
            toolsUsed.push(functionCall.name);

            console.log("");
            console.log("=================================");
            console.log(`🔧 Tool Selected : ${functionCall.name}`);
            console.log("=================================");

            console.log("Arguments:");
            console.log(JSON.stringify(functionCall.args, null, 2));

            //
            // Save function call to history
            //
            history.push({
                role: "model",
                parts: [
                    modelPart ?? {
                        functionCall,
                    },
                ],
            });

            //
            // Execute MCP Tool
            //
            const toolStart = Date.now();
            const toolResult = await this.mcp.callTool(
                functionCall.name,
                functionCall.args as Record<string, any>
            );
            console.log(`⏱ MCP tool call: ${Date.now() - toolStart} ms`);

            console.log("");
            console.log("=================================");
            console.log("📦 MCP Tool Result");
            console.log("=================================");

            const rawToolResponse = toolResult.content?.[0]?.text ?? "";

            //
            // Parse tool response
            //
            let toolData: unknown;

            try {

                toolData = JSON.parse(rawToolResponse);

            } catch {

                toolData = rawToolResponse;

            }

            // Print the complete result without truncating nested values,
            // arrays, or long strings.
            console.dir(toolData, {
                depth: null,
                colors: true,
                maxArrayLength: null,
                maxStringLength: null,
            });

            //
            // Add tool response back to Gemini
            //
            history.push({
                role: "user",
                parts: [
                    {
                        functionResponse: {
                            name: functionCall.name,
                            response: toolData,
                        },
                    },
                ],
            });

            console.log("");
            console.log("🔁 Continuing Agent Loop...");
        }
    }
}
