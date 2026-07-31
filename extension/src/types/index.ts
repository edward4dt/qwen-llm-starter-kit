export interface FileReference {
    filePath: string;
    content: string;
    language?: string;
    isDirectory?: boolean;
}

/**
 * Context reference types
 */
export type ContextReferenceType = 'file' | 'folder' | 'selection' | 'symbol';

/**
 * Unified context reference interface for all context types
 */
export interface ContextReference {
    type: ContextReferenceType;
    path?: string;        // For file/folder references
    content: string;      // The actual content
    language?: string;    // Language identifier for syntax highlighting
    tokenCount?: number;  // Estimated token count
    metadata?: {          // Additional metadata based on type
        // For selection references
        startLine?: number;
        endLine?: number;
        uri?: string;
        
        // For symbol references
        symbolName?: string;
        symbolKind?: string;
        
        // For folder references
        fileCount?: number;
    };
}

export interface ChatMessageContext {
    references?: FileReference[];
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    context?: ChatMessageContext;
}

export type WorkMode = 'planning' | 'coding' | 'review' | 'explain';

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
    enable_thinking?: boolean;
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
