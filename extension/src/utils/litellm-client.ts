import { ChatCompletionRequest, ChatCompletionResponse, StreamChunk, ChatMessage, WorkMode } from '../types';
import { ConfigManager } from './configManager';
import * as vscode from 'vscode';

export class LiteLLMClient {
    private baseUrl: string;
    private apiKey?: string;
    private defaultModel: string;
    private configManager: ConfigManager;

    constructor(
        configManager: ConfigManager,
        secretStorage: vscode.SecretStorage
    ) {
        this.configManager = configManager;
        const config = configManager.getConfig();
        this.baseUrl = config.proxyUrl;
        this.defaultModel = config.defaultModel;
        this.apiKey = undefined; // Will be loaded lazily
    }

    /**
     * Get API key lazily
     */
    private async getApiKey(secretStorage: vscode.SecretStorage): Promise<string> {
        if (!this.apiKey) {
            const key = await this.configManager.getMasterKey(secretStorage);
            if (!key) {
                throw new Error('LiteLLM Master Key is not configured. Please use "AI Assistant: Set LiteLLM Master Key" command to set it.');
            }
            this.apiKey = key;
        }
        return this.apiKey;
    }

    /**
     * Refresh configuration (call when settings change)
     */
    refreshConfig() {
        const config = this.configManager.getConfig();
        this.baseUrl = config.proxyUrl;
        this.defaultModel = config.defaultModel;
    }

    async chat(messages: ChatMessage[], options?: {
        model?: string;
        maxTokens?: number;
        temperature?: number;
        workMode?: WorkMode;
    }, secretStorage?: vscode.SecretStorage): Promise<string> {
        const apiKey = await this.getApiKey(secretStorage!);
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
                'Authorization': `Bearer ${apiKey}`,
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
    }, secretStorage?: vscode.SecretStorage): AsyncGenerator<string> {
        const apiKey = await this.getApiKey(secretStorage!);
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
                'Authorization': `Bearer ${apiKey}`,
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

    async healthCheck(secretStorage?: vscode.SecretStorage): Promise<boolean> {
        try {
            const apiKey = secretStorage ? await this.getApiKey(secretStorage) : (this.apiKey || 'sk-my-vscode-extension');
            const response = await fetch(`${this.baseUrl}/health`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
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
