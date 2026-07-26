export interface ChatMessage {
  role: "user" | "model";

  parts: any[];
}