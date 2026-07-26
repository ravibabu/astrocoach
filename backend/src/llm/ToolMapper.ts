export class ToolMapper {
  static selectRelevantTools(mcpTools: any[], message: string, limit = 8) {
    const words = new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 4)
    );

    const scored = mcpTools
      .filter((tool) => tool.name !== "generate_horoscope")
      .map((tool) => {
        const searchable = `${tool.name} ${tool.description ?? ""}`
          .toLowerCase()
          .split(/[^a-z0-9]+/);
        const score = searchable.reduce(
          (total: number, word: string) => total + (words.has(word) ? 1 : 0),
          0
        );
        return { tool, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, limit - 1))
      .map(({ tool }) => tool);

    const horoscope = mcpTools.find(
      (tool) => tool.name === "generate_horoscope"
    );

    return horoscope ? [horoscope, ...scored] : scored;
  }

  static toGeminiTools(mcpTools: any[]) {
    const geminiTools = [
      {
        functionDeclarations: mcpTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        })),
      },
    ];

    return geminiTools;
  }
}
