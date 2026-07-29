import * as vscode from 'vscode';
import fetch from 'node-fetch';

const LITELLM_PROXY_URL = 'http://localhost:4000/chat/completions';
const LITELLM_MASTER_KEY = 'sk-my-vscode-extension';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Assistant Extension is now active!');

    const disposable = vscode.commands.registerCommand('ai-assistant.askAI', async () => {
        // Get the selected text or ask for input
        const editor = vscode.window.activeTextEditor;
        let selectedText = '';
        
        if (editor) {
            const selection = editor.selection;
            selectedText = editor.document.getText(selection);
        }

        // Ask user for their question
        const question = await vscode.window.showInputBox({
            prompt: '請輸入您的問題',
            placeHolder: '例如：解釋這段程式碼的功能...',
            value: selectedText ? `解釋這段程式碼：\n${selectedText}` : ''
        });

        if (!question) {
            return;
        }

        // Show progress indicator
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'AI 正在思考中...',
                cancellable: false
            },
            async (progress) => {
                try {
                    const response = await fetch(LITELLM_PROXY_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${LITELLM_MASTER_KEY}`
                        },
                        body: JSON.stringify({
                            model: 'groq-llama-3.3-70b',
                            messages: [
                                {
                                    role: 'system',
                                    content: '你是一個專業的程式開發助手，擅長解答程式相關問題。請用繁體中文回答。'
                                },
                                {
                                    role: 'user',
                                    content: question
                                }
                            ],
                            max_tokens: 2000,
                            temperature: 0.7
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`API 回應錯誤：${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();
                    const aiResponse = data.choices?.[0]?.message?.content || '沒有收到 AI 的回覆';

                    // Show the response in a new document
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

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('AI Assistant Extension has been deactivated.');
}
