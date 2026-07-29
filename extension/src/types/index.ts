export interface FileReference {
    filePath: string;
    content: string;
    language?: string;
    isDirectory?: boolean;
}

export interface ChatMessageContext {
    references?: FileReference[];
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    context?: ChatMessageContext;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
}

export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: ChatMessage;
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface StreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        delta: {
            role?: string;
            content?: string;
        };
        finish_reason: string | null;
    }[];
}
