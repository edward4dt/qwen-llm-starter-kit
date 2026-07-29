/**
 * Prompt Template System for AI Assistant
 * Provides built-in templates and custom template support
 */

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    prompt: string;
    variables?: string[];
}

export class PromptTemplateManager {
    private static readonly BUILTIN_TEMPLATES: PromptTemplate[] = [
        {
            id: 'explain_code',
            name: '解釋程式碼',
            description: '詳細解釋選取的程式碼功能',
            prompt: '請詳細解釋這段程式碼的功能、邏輯和用途：\n\n{selected_code}',
            variables: ['selected_code']
        },
        {
            id: 'refactor_code',
            name: '重構程式碼',
            description: '優化程式碼結構和可讀性',
            prompt: '請重構這段程式碼，使其更具可讀性、效率和可維護性。請遵循最佳實踐：\n\n{selected_code}',
            variables: ['selected_code']
        },
        {
            id: 'add_comments',
            name: '新增註解',
            description: '為程式碼添加詳細註解',
            prompt: '請為這段程式碼添加詳細的中文註解，說明每個重要部分的功能：\n\n{selected_code}',
            variables: ['selected_code']
        },
        {
            id: 'find_bugs',
            name: '尋找 Bug',
            description: '檢查程式碼中的潛在問題',
            prompt: '請檢查這段程式碼中可能存在的 bug、錯誤或潛在問題，並提供修復建議：\n\n{selected_code}',
            variables: ['selected_code']
        },
        {
            id: 'write_tests',
            name: '撰寫測試',
            description: '為程式碼生成單元測試',
            prompt: '請為這段程式碼撰寫完整的單元測試，涵蓋主要功能和邊界情況：\n\n{selected_code}',
            variables: ['selected_code']
        },
        {
            id: 'optimize_performance',
            name: '效能優化',
            description: '優化程式碼執行效能',
            prompt: '請分析這段程式碼的效能瓶頸，並提供優化建議和改進後的程式碼：\n\n{selected_code}',
            variables: ['selected_code']
        },
        {
            id: 'convert_language',
            name: '轉換語言',
            description: '將程式碼轉換為另一種程式語言',
            prompt: '請將這段程式碼轉換為 {target_language} 語言，保持相同的功能：\n\n{selected_code}',
            variables: ['selected_code', 'target_language']
        },
        {
            id: 'generate_documentation',
            name: '生成文件',
            description: '為程式碼生成 API 文件',
            prompt: '請為這段程式碼生成完整的 API 文件，包含函數說明、參數、返回值和使用範例：\n\n{selected_code}',
            variables: ['selected_code']
        }
    ];

    private _customTemplates: PromptTemplate[] = [];

    /**
     * Get all available templates (builtin + custom)
     */
    public getAllTemplates(): PromptTemplate[] {
        return [...PromptTemplateManager.BUILTIN_TEMPLATES, ...this._customTemplates];
    }

    /**
     * Get a specific template by ID
     */
    public getTemplateById(id: string): PromptTemplate | undefined {
        return this.getAllTemplates().find(t => t.id === id);
    }

    /**
     * Add a custom template
     */
    public addCustomTemplate(template: Omit<PromptTemplate, 'id'>): PromptTemplate {
        const id = `custom_${Date.now()}`;
        const newTemplate: PromptTemplate = {
            ...template,
            id
        };
        this._customTemplates.push(newTemplate);
        return newTemplate;
    }

    /**
     * Remove a custom template by ID
     */
    public removeCustomTemplate(id: string): boolean {
        const index = this._customTemplates.findIndex(t => t.id === id);
        if (index !== -1) {
            this._customTemplates.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Replace variables in a template with actual values
     */
    public renderTemplate(templateId: string, variables: Record<string, string>): string | undefined {
        const template = this.getTemplateById(templateId);
        if (!template) {
            return undefined;
        }

        let rendered = template.prompt;
        
        // Replace all variables
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            rendered = rendered.split(placeholder).join(value);
        }

        return rendered;
    }

    /**
     * Get quick pick items for template selection
     */
    public getQuickPickItems(): Array<{ label: string; description: string; templateId: string }> {
        return this.getAllTemplates().map(t => ({
            label: t.name,
            description: t.description,
            templateId: t.id
        }));
    }
}
