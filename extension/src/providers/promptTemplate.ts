import * as vscode from 'vscode';
import { PromptTemplateManager } from '../utils/prompt-templates';
import { LiteLLMClient } from '../utils/litellm-client';
import { ConfigManager } from '../utils/configManager';

export class PromptTemplateProvider {
    private _templateManager: PromptTemplateManager;
    private _client: LiteLLMClient;
    private _disposables: vscode.Disposable[] = [];

    constructor() {
        this._templateManager = new PromptTemplateManager();
        this._client = new LiteLLMClient(new ConfigManager(), {} as vscode.SecretStorage);
    }

    public registerCommands(): vscode.Disposable[] {
        const useTemplateCommand = vscode.commands.registerCommand(
            'ai-assistant.usePromptTemplate',
            async () => await this.handleUseTemplate()
        );

        const createTemplateCommand = vscode.commands.registerCommand(
            'ai-assistant.createPromptTemplate',
            async () => await this.handleCreateTemplate()
        );

        const manageTemplatesCommand = vscode.commands.registerCommand(
            'ai-assistant.manageTemplates',
            async () => await this.handleManageTemplates()
        );

        this._disposables.push(useTemplateCommand, createTemplateCommand, manageTemplatesCommand);
        return this._disposables;
    }

    private async handleUseTemplate(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('請先開啟一個檔案');
            return;
        }

        // Get selected text if any
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        // Show template picker
        const quickPickItems = this._templateManager.getQuickPickItems();
        
        const pickedItem = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: '選擇一個 Prompt 模板...',
            matchOnDescription: true
        });

        if (!pickedItem) {
            return;
        }

        // Handle variables if template has them
        const template = this._templateManager.getTemplateById(pickedItem.templateId);
        if (!template) {
            return;
        }

        const variables: Record<string, string> = {};
        
        // Always include selected_code if available
        if (selectedText) {
            variables['selected_code'] = selectedText;
        }

        // Check for additional variables
        if (template.variables) {
            for (const variable of template.variables) {
                if (variable !== 'selected_code' && !variables[variable]) {
                    const value = await vscode.window.showInputBox({
                        prompt: `請輸入 ${variable} 的值`,
                        placeHolder: variable === 'target_language' ? '例如：Python, JavaScript...' : ''
                    });
                    
                    if (value === undefined) {
                        return; // User cancelled
                    }
                    
                    variables[variable] = value || '';
                }
            }
        }

        // Render the template
        const renderedPrompt = this._templateManager.renderTemplate(pickedItem.templateId, variables);
        if (!renderedPrompt) {
            vscode.window.showErrorMessage('無法渲染模板');
            return;
        }

        // Send to AI
        await this.sendToAI(renderedPrompt);
    }

    private async sendToAI(prompt: string): Promise<void> {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'AI 正在處理...',
                cancellable: false
            },
            async () => {
                try {
                    const isHealthy = await this._client.healthCheck();
                    if (!isHealthy) {
                        throw new Error('LiteLLM Proxy 未啟動或無法連接。請確認 Docker 容器是否運行中。');
                    }

                    const response = await this._client.chat([
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]);

                    // Show response in output panel or webview
                    const outputChannel = vscode.window.createOutputChannel('AI Assistant - Template Result');
                    outputChannel.appendLine('=== AI Response ===\n');
                    outputChannel.appendLine(response);
                    outputChannel.show(true);

                    vscode.window.showInformationMessage('✅ AI 回應已生成，請查看輸出面板');

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '發生未知錯誤';
                    vscode.window.showErrorMessage(`AI 處理失敗：${errorMessage}`);
                    console.error('Prompt Template Error:', error);
                }
            }
        );
    }

    private async handleCreateTemplate(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: '輸入模板名稱',
            placeHolder: '例如：程式碼審查'
        });

        if (!name) {
            return;
        }

        const description = await vscode.window.showInputBox({
            prompt: '輸入模板描述',
            placeHolder: '例如：檢查程式碼品質和最佳實踐'
        });

        if (!description) {
            return;
        }

        const prompt = await vscode.window.showInputBox({
            prompt: '輸入 Prompt 內容（使用 {variable_name} 作為變數佔位符）',
            placeHolder: '例如：請審查這段程式碼：{selected_code}',
            ignoreFocusOut: true
        });

        if (!prompt) {
            return;
        }

        const newTemplate = this._templateManager.addCustomTemplate({
            name,
            description,
            prompt
        });

        vscode.window.showInformationMessage(`✅ 已建立自訂模板：${newTemplate.name}`);
    }

    private async handleManageTemplates(): Promise<void> {
        const templates = this._templateManager.getAllTemplates();
        
        const items = templates.map(t => ({
            label: t.name,
            description: t.id.startsWith('custom_') ? '(自訂)' : '(內建)',
            detail: t.description,
            templateId: t.id
        }));

        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: '管理 Prompt 模板',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!picked) {
            return;
        }

        // Only allow deleting custom templates
        if (picked.description === '(自訂)') {
            const action = await vscode.window.showQuickPick(['刪除模板', '查看內容'], {
                placeHolder: `對 "${picked.label}" 執行操作`
            });

            if (action === '刪除模板') {
                const confirm = await vscode.window.showWarningMessage(
                    `確定要刪除模板 "${picked.label}" 嗎？`,
                    { modal: true },
                    '刪除'
                );

                if (confirm === '刪除') {
                    this._templateManager.removeCustomTemplate(picked.templateId);
                    vscode.window.showInformationMessage('已刪除模板');
                }
            } else if (action === '查看內容') {
                const template = this._templateManager.getTemplateById(picked.templateId);
                if (template) {
                    vscode.window.showInformationMessage(`Prompt:\n${template.prompt}`);
                }
            }
        } else {
            vscode.window.showInformationMessage(
                `內建模板無法刪除。\n\nPrompt:\n${this._templateManager.getTemplateById(picked.templateId)?.prompt}`
            );
        }
    }

    public dispose(): void {
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
