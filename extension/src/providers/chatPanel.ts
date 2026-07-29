import * as vscode from 'vscode';
import { LiteLLMClient } from '../utils/litellm-client';
import { ChatMessage, FileReference } from '../types';
import { FileReferenceProvider } from '../utils/file-reference';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-assistant.chatPanel';
    
    private _view?: vscode.WebviewView;
    private _client: LiteLLMClient;
    private _messages: ChatMessage[] = [];
    private _fileRefProvider: FileReferenceProvider;
    private _pendingFileRefs: FileReference[] = [];
    
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        this._client = new LiteLLMClient();
        this._fileRefProvider = new FileReferenceProvider();
    }
    
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        webviewView.webview.html = this._getHtmlForWebview();
        
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'sendMessage':
                    await this._handleUserMessage(message.text, message.fileRefs);
                    break;
                case 'clearChat':
                    this._messages = [];
                    this._updateChatHistory();
                    break;
                case 'triggerFilePicker':
                    await this._handleFilePickerTrigger();
                    break;
            }
        });
    }
    
    private async _handleFilePickerTrigger(): Promise<void> {
        try {
            const fileRefs = await this._fileRefProvider.showFilePicker();
            if (fileRefs.length > 0) {
                this._pendingFileRefs.push(...fileRefs);
                this._view?.webview.postMessage({ 
                    type: 'fileRefSelected', 
                    files: fileRefs.map(f => ({ path: f.filePath, language: f.language }))
                });
            }
        } catch (error) {
            console.error('Error selecting file:', error);
            this._view?.webview.postMessage({ 
                type: 'error', 
                error: `選擇檔案時發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}` 
            });
        }
    }
    
    private async _handleUserMessage(text: string, fileRefs?: FileReference[]): Promise<void> {
        if (!text.trim() && (!fileRefs || fileRefs.length === 0)) {
            return;
        }
        
        // Combine pending file refs with any passed in
        const allFileRefs = [...this._pendingFileRefs, ...(fileRefs || [])];
        this._pendingFileRefs = []; // Clear pending after use
        
        let finalText = text;
        let contextReferences: FileReference[] = [];
        
        // If there are file references, inject them into the message
        if (allFileRefs.length > 0) {
            contextReferences = allFileRefs;
            finalText = this._fileRefProvider.injectFileContext(text, allFileRefs);
        }
        
        // Add user message to history
        const userMessage: ChatMessage = { 
            role: 'user', 
            content: finalText,
            context: contextReferences.length > 0 ? { references: contextReferences } : undefined
        };
        this._messages.push(userMessage);
        this._updateChatHistory();
        
        // Show progress
        this._view?.webview.postMessage({ type: 'showProgress' });
        
        try {
            // Check health first
            const isHealthy = await this._client.healthCheck();
            if (!isHealthy) {
                throw new Error('LiteLLM Proxy 未啟動或無法連接。請確認 Docker 容器是否運行中。');
            }
            
            // Get AI response with streaming
            const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
            this._messages.push(assistantMessage);
            
            for await (const chunk of this._client.chatStream(this._messages)) {
                assistantMessage.content += chunk;
                this._view?.webview.postMessage({ 
                    type: 'streamChunk', 
                    content: chunk 
                });
            }
            
            this._updateChatHistory();
            this._view?.webview.postMessage({ type: 'hideProgress' });
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '發生未知錯誤';
            this._view?.webview.postMessage({ 
                type: 'error', 
                error: errorMessage 
            });
            console.error('Chat error:', error);
        }
    }
    
    private _updateChatHistory(): void {
        this._view?.webview.postMessage({ 
            type: 'updateHistory', 
            messages: this._messages 
        });
    }
    
    public sendMessage(text: string): void {
        if (this._view) {
            this._view.webview.postMessage({ type: 'userMessage', text });
            this._handleUserMessage(text);
        }
    }
    
    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Assistant</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 16px;
            height: 100vh;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }
        .chat-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 16px;
        }
        .message {
            margin-bottom: 12px;
            padding: 8px 12px;
            border-radius: 6px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .message.user {
            background-color: var(--vscode-input-background);
            margin-left: 20%;
        }
        .message.assistant {
            background-color: var(--vscode-badge-background);
            margin-right: 20%;
        }
        .input-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .input-row {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        #messageInput {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
        }
        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .file-ref-btn {
            padding: 8px 12px;
            background-color: var(--vscode-descriptionForeground);
            color: var(--vscode-button-foreground);
            font-weight: bold;
        }
        .file-ref-btn:hover {
            background-color: var(--vscode-button-background);
        }
        .file-refs-display {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 4px;
        }
        .file-tag {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .file-tag .remove {
            cursor: pointer;
            font-weight: bold;
        }
        .progress {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin-bottom: 8px;
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 8px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="chat-container" id="chatContainer"></div>
    <div class="input-container">
        <div class="input-row">
            <button id="fileRefBtn" class="file-ref-btn" title="附加檔案參考">@</button>
            <input type="text" id="messageInput" placeholder="輸入問題... (使用 @ 選擇檔案)" />
            <button id="sendBtn">發送</button>
            <button id="clearBtn">清除</button>
        </div>
        <div class="file-refs-display" id="fileRefsDisplay"></div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const clearBtn = document.getElementById('clearBtn');
        const fileRefBtn = document.getElementById('fileRefBtn');
        const fileRefsDisplay = document.getElementById('fileRefsDisplay');
        
        let pendingFileRefs = [];
        
        function addMessage(content, role) {
            const div = document.createElement('div');
            div.className = \`message \${role}\`;
            div.textContent = content;
            chatContainer.appendChild(div);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function clearMessages() {
            chatContainer.innerHTML = '';
        }
        
        function updateFileRefsDisplay() {
            fileRefsDisplay.innerHTML = '';
            pendingFileRefs.forEach((file, index) => {
                const tag = document.createElement('span');
                tag.className = 'file-tag';
                const fileName = file.path.split('/').pop() || file.path;
                tag.innerHTML = \`@<span>\${fileName}</span><span class="remove" onclick="removeFileRef(\${index})">×</span>\`;
                fileRefsDisplay.appendChild(tag);
            });
        }
        
        window.removeFileRef = function(index) {
            pendingFileRefs.splice(index, 1);
            updateFileRefsDisplay();
        };
        
        function sendCurrentMessage() {
            const text = messageInput.value.trim();
            if (text || pendingFileRefs.length > 0) {
                vscode.postMessage({ 
                    type: 'sendMessage', 
                    text,
                    fileRefs: pendingFileRefs.map(f => ({ filePath: f.path, content: '', language: f.language }))
                });
                messageInput.value = '';
                pendingFileRefs = [];
                updateFileRefsDisplay();
            }
        }
        
        sendBtn.addEventListener('click', sendCurrentMessage);
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendCurrentMessage();
            }
        });
        
        // Handle @ key to trigger file picker
        messageInput.addEventListener('input', (e) => {
            const text = messageInput.value;
            if (text.endsWith('@')) {
                vscode.postMessage({ type: 'triggerFilePicker' });
            }
        });
        
        fileRefBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'triggerFilePicker' });
        });
        
        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'clearChat' });
            clearMessages();
            pendingFileRefs = [];
            updateFileRefsDisplay();
        });
        
        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.type) {
                case 'streamChunk':
                    const lastMessage = chatContainer.lastElementChild;
                    if (lastMessage && lastMessage.classList.contains('assistant')) {
                        lastMessage.textContent += message.content;
                    } else {
                        addMessage(message.content, 'assistant');
                    }
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    break;
                case 'updateHistory':
                    clearMessages();
                    message.messages.forEach(msg => {
                        addMessage(msg.content, msg.role);
                    });
                    break;
                case 'showProgress':
                    const progress = document.createElement('div');
                    progress.className = 'progress';
                    progress.id = 'progressIndicator';
                    progress.textContent = 'AI 正在思考...';
                    chatContainer.appendChild(progress);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    break;
                case 'hideProgress':
                    const progressEl = document.getElementById('progressIndicator');
                    if (progressEl) {
                        progressEl.remove();
                    }
                    break;
                case 'error':
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error';
                    errorDiv.textContent = message.error;
                    chatContainer.insertBefore(errorDiv, chatContainer.firstChild);
                    break;
                case 'fileRefSelected':
                    message.files.forEach(file => {
                        pendingFileRefs.push(file);
                    });
                    updateFileRefsDisplay();
                    messageInput.focus();
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
