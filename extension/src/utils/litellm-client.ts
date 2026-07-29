import { ChatCompletionRequest, ChatCompletionResponse, StreamChunk, ChatMessage, WorkMode } from '../types';

export class LiteLLMClient {
    private baseUrl: string;
    private apiKey: string;
    private defaultModel: string;

    constructor(baseUrl: string = 'http://127.0.0.1:4000', apiKey: string = 'sk-my-vscode-extension') {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.defaultModel = 'coder'; // Changed from 'coding' to 'coder' for v2.8 model router
    }

    async chat(messages: ChatMessage[], options?: {
        model?: string;
        maxTokens?: number;
        temperature?: number;
        workMode?: WorkMode;
    }): Promise<string> {
        const workMode = options?.workMode || 'coding';
        const model = options?.model || this.getModelForWorkMode(workMode);
        const maxTokens = options?.maxTokens || this.getMaxTokensForWorkMode(workMode);
        const enableThinking = workMode === 'planning';

        const request: ChatCompletionRequest = {
            model,
            messages,
            max_tokens: maxTokens,
            temperature: options?.temperature || 0.7,
            enable_thinking: enableThinking,
        };

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LiteLLM API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as ChatCompletionResponse;
        return data.choices[0]?.message?.content || '';
    }

    async *chatStream(messages: ChatMessage[], options?: {
        model?: string;
        maxTokens?: number;
        temperature?: number;
        workMode?: WorkMode;
    }): AsyncGenerator<string> {
        const workMode = options?.workMode || 'coding';
        const model = options?.model || this.getModelForWorkMode(workMode);
        const maxTokens = options?.maxTokens || this.getMaxTokensForWorkMode(workMode);
        const enableThinking = workMode === 'planning';

        const request: ChatCompletionRequest = {
            model,
            messages,
            max_tokens: maxTokens,
            temperature: options?.temperature || 0.7,
            stream: true,
            enable_thinking: enableThinking,
        };

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LiteLLM API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ')) {
                    const dataStr = trimmedLine.slice(6);
                    if (dataStr === '[DONE]') {
                        return;
                    }

                    try {
                        const chunk: StreamChunk = JSON.parse(dataStr);
                        const content = chunk.choices[0]?.delta?.content;
                        if (content) {
                            yield content;
                        }
                    } catch (e) {
                        console.warn('Failed to parse SSE chunk:', e);
                    }
                }
            }
        }
    }

    /**
     * Get model name based on work mode
     */
    private getModelForWorkMode(workMode: WorkMode): string {
        switch (workMode) {
            case 'planning':
                return 'planner';
            case 'coding':
                return 'coder';
            case 'review':
            case 'explain':
                return 'reviewer';
            default:
                return 'coder';
        }
    }

    /**
     * Get max tokens based on work mode
     */
    private getMaxTokensForWorkMode(workMode: WorkMode): number {
        switch (workMode) {
            case 'planning':
                return 8192;
            case 'coding':
            case 'review':
            case 'explain':
            default:
                return 2048;
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            console.log("Health check status:", response.status);
            return true; // 只要有回應即判定為活著
        } catch (e) {
            console.error("Health check failed:", e);
            return false;
        }
    }
}
