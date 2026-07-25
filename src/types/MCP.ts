export interface MCPTextContent {
  type: "text";
  text: string;
}

export interface MCPToolResponse {
  content: MCPTextContent[];
}