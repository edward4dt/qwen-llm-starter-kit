import * as vscode from 'vscode';
import { LiteLLMClient } from '../utils/litellm-client';
import { ChatMessage } from '../types';

export class InlineEditProvider {
    private _client: LiteLLMClient;
    private _disposables: vscode.Disposable[] = [];

    constructor() {
        this._client = new LiteLLMClient();
    }

    public registerCommands(): vscode.Disposable[] {
        const inlineEditCommand = vscode.commands.registerCommand(
            'ai-assistant.inlineEdit',
            async () => await this.handleInlineEdit()
        );

        const acceptEditCommand = vscode.commands.registerCommand(
            'ai-assistant.acceptEdit',
            async () => await this.handleAcceptEdit()
        );

        const rejectEditCommand = vscode.commands.registerCommand(
            'ai-assistant.rejectEdit',
            async () => await this.handleRejectEdit()
        );

        this._disposables.push(inlineEditCommand, acceptEditCommand, rejectEditCommand);
        return this._disposables;
    }

    private async handleInlineEdit(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('請先開啟一個檔案');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('請選取要編輯的程式碼');
            return;
        }

        // Show prompt input for edit instruction
        const instruction = await vscode.window.showInputBox({
            prompt: '請輸入編輯指令',
            placeHolder: '例如：重構這段程式碼、新增註解、修復 bug...',
            value: '重構這段程式碼'
        });

        if (!instruction) {
            return;
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'AI 正在處理編輯...',
                cancellable: false
            },
            async (progress) => {
                try {
                    // Check health first
                    const isHealthy = await this._client.healthCheck();
                    if (!isHealthy) {
                        throw new Error('LiteLLM Proxy 未啟動或無法連接。請確認 Docker 容器是否運行中。');
                    }

                    // Build prompt with context
                    const messages: ChatMessage[] = [
                        {
                            role: 'system',
                            content: '你是一個專業的程式開發助手。請根據用戶的指示修改提供的程式碼，只回傳修改後的程式碼，不要包含任何解釋或其他文字。'
                        },
                        {
                            role: 'user',
                            content: `${instruction}\n\n原始程式碼:\n\`\`\`\n${selectedText}\n\`\`\``
                        }
                    ];

                    const aiResponse = await this._client.chat(messages);

                    // Extract code from response (remove markdown code blocks if present)
                    let editedCode = aiResponse.trim();
                    const codeBlockMatch = editedCode.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
                    if (codeBlockMatch) {
                        editedCode = codeBlockMatch[1].trim();
                    }

                    // Store the original and edited code for later comparison
                    await vscode.workspace.getConfiguration('aiAssistant').update(
                        'pendingEdit',
                        {
                            documentUri: editor.document.uri.toString(),
                            range: {
                                start: { line: selection.start.line, character: selection.start.character },
                                end: { line: selection.end.line, character: selection.end.character }
                            },
                            originalCode: selectedText,
                            editedCode: editedCode
                        },
                        vscode.ConfigurationTarget.Global
                    );

                    // Show diff preview
                    await this.showDiffPreview(editor.document.uri, selectedText, editedCode, selection);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '發生未知錯誤';
                    vscode.window.showErrorMessage(`AI 編輯失敗：${errorMessage}`);
                    console.error('Inline Edit Error:', error);
                }
            }
        );
    }

    private async showDiffPreview(
        documentUri: vscode.Uri,
        originalCode: string,
        editedCode: string,
        selection: vscode.Selection
    ): Promise<void> {
        // Create temporary URIs for diff view
        const originalUri = vscode.Uri.parse(`untitled:original-${Date.now()}.tmp`);
        const modifiedUri = vscode.Uri.parse(`untitled:modified-${Date.now()}.tmp`);

        // Open documents for diff
        const originalDoc = await vscode.workspace.openTextDocument(originalUri);
        const modifiedDoc = await vscode.workspace.openTextDocument(modifiedUri);

        // Write content to documents
        const originalEdit = new vscode.WorkspaceEdit();
        originalEdit.insert(originalUri, new vscode.Position(0, 0), originalCode);
        await vscode.workspace.applyEdit(originalEdit);

        const modifiedEdit = new vscode.WorkspaceEdit();
        modifiedEdit.insert(modifiedUri, new vscode.Position(0, 0), editedCode);
        await vscode.workspace.applyEdit(modifiedEdit);

        // Show diff view
        const title = `AI 編輯預覽 - ${documentUri.fsPath.split('/').pop()}`;
        await vscode.commands.executeCommand(
            'vscode.diff',
            originalUri,
            modifiedUri,
            title,
            { preview: true }
        );

        // Show action buttons
        const acceptAction = '接受修改';
        const rejectAction = '拒絕修改';

        vscode.window.showInformationMessage(
            'AI 已生成編輯建議，請查看 Diff 預覽',
            acceptAction,
            rejectAction
        ).then(async (action) => {
            if (action === acceptAction) {
                await this.applyEdit(documentUri, editedCode, selection);
            } else if (action === rejectAction) {
                vscode.window.showInformationMessage('已拒絕修改');
            }
        });
    }

    private async applyEdit(
        documentUri: vscode.Uri,
        editedCode: string,
        selection: vscode.Selection
    ): Promise<void> {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(documentUri, selection, editedCode);
        
        const success = await vscode.workspace.applyEdit(edit);
        
        if (success) {
            vscode.window.showInformationMessage('✅ 已套用 AI 編輯建議');
        } else {
            vscode.window.showErrorMessage('❌ 套用編輯失敗');
        }
    }

    private async handleAcceptEdit(): Promise<void> {
        // This can be used with stored pending edits
        vscode.window.showInformationMessage('接受編輯功能開發中...');
    }

    private async handleRejectEdit(): Promise<void> {
        // This can be used with stored pending edits
        vscode.window.showInformationMessage('拒絕編輯功能開發中...');
    }

    public dispose(): void {
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
