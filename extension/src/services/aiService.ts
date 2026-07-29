import vscode from 'vscode';
import { LLMProvider } from '../types';
import { SYSTEM_PROMPT } from '../prompts/system';

export interface ChatRequest {
  message: string;
  selectedCode?: string;
  language?: string;
}

export class AIService {
  private static instance: AIService;
  private provider: LLMProvider | null = null;
  private abortController: AbortController | null = null;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  public cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async chat(
    request: ChatRequest,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.provider) {
      throw new Error('LLM Provider not initialized');
    }

    const systemMessage = {
      role: 'system' as const,
      content: SYSTEM_PROMPT
    };

    let userContent = request.message;
    
    if (request.selectedCode) {
      const langTag = request.language ? `\`${request.language}\`` : '';
      userContent = `${request.message}\n\nSelected Code ${langTag}:\n\`\`\`\n${request.selectedCode}\n\`\`\``;
    }

    const userMessage = {
      role: 'user' as const,
      content: userContent
    };

    this.abortController = new AbortController();

    try {
      if (onChunk) {
        return await this.provider.chatCompletionStream(
          [systemMessage, userMessage],
          undefined,
          onChunk,
          this.abortController.signal
        );
      } else {
        return await this.provider.chatCompletion([systemMessage, userMessage]);
      }
    } finally {
      this.abortController = null;
    }
  }

  public async checkHealth(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    if ('checkHealth' in this.provider) {
      return await (this.provider as any).checkHealth();
    }

    return true;
  }
}
