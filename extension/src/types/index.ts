export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMProvider {
  chatCompletion(messages: ChatMessage[], model?: string): Promise<string>;
  chatCompletionStream(
    messages: ChatMessage[],
    model?: string,
    onChunk?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string>;
}
