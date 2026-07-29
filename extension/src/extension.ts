import * as vscode from 'vscode';
import { ChatPanelProvider } from './providers/chatPanel';
import { LiteLLMClient } from './utils/litellm-client';
import { ChatMessage } from './types';
import { InlineEditProvider } from './providers/inlineEdit';
import { PromptTemplateProvider } from './providers/promptTemplate';
import { FileReferenceProvider } from './utils/file-reference';
import { AtCompletionProvider } from './providers/atCompletion';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Assistant Extension is now active!');

    // Initialize LiteLLM Client
    const client = new LiteLLMClient();

    // Initialize Inline Edit Provider
    const inlineEditProvider = new InlineEditProvider();
    const inlineEditCommands = inlineEditProvider.registerCommands();
    context.subscriptions.push(...inlineEditCommands);

    // Initialize Prompt Template Provider
    const promptTemplateProvider = new PromptTemplateProvider();
    const promptTemplateCommands = promptTemplateProvider.registerCommands();
    context.subscriptions.push(...promptTemplateCommands);

    // Register Chat Panel Provider (Sidebar)
    const chatPanelProvider = new ChatPanelProvider(context.extensionUri, context);
    const chatPanelDisposable = vscode.window.registerWebviewViewProvider(
        ChatPanelProvider.viewType,
        chatPanelProvider
    );
    context.subscriptions.push(chatPanelDisposable);

    // Command: Ask AI (Legacy - for backward compatibility)
    const askAICommand = vscode.commands.registerCommand('ai-assistant.askAI', async () => {
        const editor = vscode.window.activeTextEditor;
        let selectedText = '';
        
        if (editor) {
            const selection = editor.selection;
            selectedText = editor.document.getText(selection);
        }

        const question = await vscode.window.showInputBox({
            prompt: '請輸入您的問題',
            placeHolder: '例如：解釋這段程式碼的功能...',
            value: selectedText ? `解釋這段程式碼：\n${selectedText}` : ''
        });

        if (!question) {
            return;
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'AI 正在思考中...',
                cancellable: false
            },
            async (progress) => {
                try {
                    // Check health first
                    const isHealthy = await client.healthCheck();
                    if (!isHealthy) {
                        throw new Error('LiteLLM Proxy 未啟動或無法連接。請確認 Docker 容器是否運行中。');
                    }

                    const messages: ChatMessage[] = [
                        {
                            role: 'system',
                            content: '你是一個專業的程式開發助手，擅長解答程式相關問題。請用繁體中文回答。'
                        },
                        {
                            role: 'user',
                            content: question
                        }
                    ];

                    const aiResponse = await client.chat(messages);

                    const doc = await vscode.workspace.openTextDocument({
                        content: aiResponse,
                        language: 'markdown'
                    });
                    
                    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '發生未知錯誤';
                    vscode.window.showErrorMessage(`AI 請求失敗：${errorMessage}`);
                    console.error('AI Extension Error:', error);
                }
            }
        );
    });

    // Command: Focus Chat Panel
    const focusChatCommand = vscode.commands.registerCommand('ai-assistant.focusChatPanel', () => {
        vscode.commands.executeCommand('workbench.view.extension.ai-assistant');
    });

    // Command: Check LiteLLM Health
    const healthCheckCommand = vscode.commands.registerCommand('ai-assistant.checkHealth', async () => {
        const isHealthy = await client.healthCheck();
        if (isHealthy) {
            vscode.window.showInformationMessage('✅ LiteLLM Proxy 運行正常！');
        } else {
            vscode.window.showErrorMessage('❌ LiteLLM Proxy 無法連接。請確認 Docker 容器是否運行在 http://127.0.0.1:4000');
        }
    });

    // Command: Select Directory Reference
    const selectDirectoryCommand = vscode.commands.registerCommand('ai-assistant.selectDirectory', async () => {
        try {
            const fileRefProvider = new FileReferenceProvider();
            const fileRefs = await fileRefProvider.showDirectoryPicker();
            
            if (fileRefs && fileRefs.length > 0) {
                vscode.window.showInformationMessage(`已選擇 ${fileRefs.length} 個檔案作為參考`);
            }
        } catch (error) {
            console.error('Error selecting directory:', error);
            vscode.window.showErrorMessage(`選擇目錄失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
        }
    });

    // Register @ Completion Provider
    const atCompletionProvider = new AtCompletionProvider();
    const completionProviderDisposable = vscode.languages.registerCompletionItemProvider(
        '*', // Apply to all languages
        atCompletionProvider,
        '@' // Trigger character
    );
    context.subscriptions.push(completionProviderDisposable);

    // Clear cache when workspace changes
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        atCompletionProvider.clearCache();
    });

    context.subscriptions.push(askAICommand);
    context.subscriptions.push(focusChatCommand);
    context.subscriptions.push(healthCheckCommand);
    context.subscriptions.push(selectDirectoryCommand);
}

export function deactivate() {
    console.log('AI Assistant Extension has been deactivated.');
}
