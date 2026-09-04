export interface AiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiChatParams {
  system: string;
  messages: AiMessage[];
  maxTokens: number;
  reasoningEffort?: "none" | "low" | "medium" | "high";
}

export interface NoticeReplyResult {
  summary: string;
  draft: string;
  citations: {
    section: string;
    description: string;
    source: string;
  }[];
}
