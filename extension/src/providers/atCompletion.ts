import * as vscode from 'vscode';
import { FileReferenceProvider } from '../utils/file-reference';
import { ContextManager } from '../utils/contextManager';

export class AtCompletionProvider implements vscode.CompletionItemProvider {
    private readonly fileRefProvider: FileReferenceProvider;
    private readonly MAX_COMPLETION_ITEMS = 30;
    private cache: string[] | null = null;

    constructor() {
        this.fileRefProvider = new FileReferenceProvider();
    }

    /**
     * Provide completion items when user types @
     */
    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        // Get the text before the cursor
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        const atIndex = linePrefix.lastIndexOf('@');

        // If no @ or @ is not the last trigger, return empty
        if (atIndex === -1) {
            return [];
        }

        // Get query text after @
        const query = linePrefix.slice(atIndex + 1).trim();

        // Check if space is typed after @ (which means completion should stop)
        if (query.includes(' ')) {
            return [];
        }

        try {
            // Get workspace files using VSCode API (no custom scanDirectories)
            const files = await this.getWorkspaceFiles();

            // Filter based on query (fuzzy search)
            const filteredFiles = query 
                ? files.filter(file => file.toLowerCase().includes(query.toLowerCase()))
                : files;

            const completionItems: vscode.CompletionItem[] = [];

            // Add file and directory completion items from file paths
            const pathSet = new Set<string>();
            
            for (const filePath of filteredFiles.slice(0, this.MAX_COMPLETION_ITEMS)) {
                // Extract directories from file path
                const parts = filePath.split(/[\\/]/);
                for (let i = 1; i < parts.length; i++) {
                    const dirPath = parts.slice(0, i).join('/');
                    if (!pathSet.has(dirPath)) {
                        pathSet.add(dirPath);
                        const item = new vscode.CompletionItem(
                            dirPath,
                            vscode.CompletionItemKind.Folder
                        );
                        item.insertText = new vscode.SnippetString(`${dirPath}$0`);
                        item.detail = `目錄：${dirPath}`;
                        item.documentation = new vscode.MarkdownString(`插入 **${dirPath}** 目錄下的所有檔案作為參考。`);
                        (item as any).iconPath = new vscode.ThemeIcon('folder');
                        completionItems.push(item);
                    }
                }
                
                // Add file completion item
                if (!pathSet.has(filePath)) {
                    pathSet.add(filePath);
                    const item = new vscode.CompletionItem(
                        filePath,
                        vscode.CompletionItemKind.File
                    );
                    item.insertText = new vscode.SnippetString(`${filePath}$0`);
                    item.detail = `檔案：${filePath}`;
                    item.documentation = new vscode.MarkdownString(`插入 **${filePath}** 作為參考檔案。`);
                    
                    // Set icon based on file extension
                    const icon = this.getFileIcon(filePath);
                    if (icon) {
                        (item as any).iconPath = icon;
                    }
                    
                    completionItems.push(item);
                }
            }

            // Add "more items" hint if there are more results
            if (filteredFiles.length > this.MAX_COMPLETION_ITEMS) {
                const moreItem = new vscode.CompletionItem(
                    `... 還有更多檔案 (請輸入更多關鍵字過濾)`,
                    vscode.CompletionItemKind.Text
                );
                moreItem.insertText = '';
                moreItem.kind = vscode.CompletionItemKind.Issue;
                moreItem.sortText = 'zzz'; // Put at the end
                completionItems.push(moreItem);
            }

            return completionItems;
        } catch (error) {
            console.error('Error providing completions:', error);
            return [];
        }
    }

    /**
     * Get workspace files using VSCode API (no custom recursive scan)
     */
    async getWorkspaceFiles(): Promise<string[]> {
        if (this.cache) {
            return this.cache;
        }

        const files: string[] = [];

        try {
            const allFiles = await vscode.workspace.findFiles(
                '**/*',
                '**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/*.min.js'
            );

            for (const file of allFiles) {
                // Skip binary files
                if (this.fileRefProvider['isBinaryFile'](file.fsPath)) {
                    continue;
                }

                // Get relative path
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
                const relativePath = workspaceFolder
                    ? vscode.workspace.asRelativePath(file)
                    : file.fsPath;

                files.push(relativePath);
            }

            // Sort alphabetically
            files.sort((a, b) => a.localeCompare(b));

            this.cache = files;
            return files;
        } catch (error) {
            console.error('Error getting workspace files:', error);
            return [];
        }
    }

    /**
     * Get appropriate icon for file based on extension
     */
    private getFileIcon(filePath: string): vscode.ThemeIcon | vscode.Uri {
        const ext = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();
        
        const iconMap: Record<string, string> = {
            'ts': 'file-type-typescript',
            'tsx': 'file-type-typescript',
            'js': 'file-type-javascript',
            'jsx': 'file-type-javascript',
            'py': 'file-type-python',
            'java': 'file-type-java',
            'c': 'file-type-c',
            'cpp': 'file-type-cpp',
            'cs': 'file-type-csharp',
            'go': 'file-type-go',
            'rs': 'file-type-rust',
            'rb': 'file-type-ruby',
            'php': 'file-type-php',
            'swift': 'file-type-swift',
            'kt': 'file-type-kotlin',
            'html': 'file-type-html',
            'css': 'file-type-css',
            'scss': 'file-type-scss',
            'less': 'file-type-less',
            'json': 'file-type-json',
            'xml': 'file-type-xml',
            'yaml': 'file-type-yaml',
            'yml': 'file-type-yaml',
            'md': 'file-type-markdown',
            'sql': 'file-type-sql',
            'vue': 'file-type-vue',
            'svelte': 'file-type-svelte',
            'sh': 'file-type-shell',
            'bash': 'file-type-shell',
            'zsh': 'file-type-shell',
            'txt': 'file-type-text',
            'log': 'file-type-log'
        };

        const iconName = iconMap[ext] || 'file-code';
        return new vscode.ThemeIcon(iconName);
    }

    /**
     * Clear cache when workspace changes
     */
    clearCache(): void {
        this.cache = null;
    }
}

/**
 * QuickPick Reference Picker for unified context selection
 * Provides fuzzy search and instant preview
 */
export class QuickPickReferencePicker {
    private readonly fileRefProvider: FileReferenceProvider;
    private readonly contextManager: ContextManager;

    constructor(contextManager: ContextManager) {
        this.fileRefProvider = new FileReferenceProvider();
        this.contextManager = contextManager;
    }

    /**
     * Show QuickPick for selecting files/folders as context references
     */
    async showReferencePicker(): Promise<void> {
        try {
            const files = await this.getWorkspaceFiles();
            
            // Create QuickPick items with file and directory options
            const quickPickItems: vscode.QuickPickItem[] = [];
            const pathSet = new Set<string>();
            
            // Add directories extracted from file paths
            for (const filePath of files) {
                const parts = filePath.split(/[\\/]/);
                for (let i = 1; i < parts.length; i++) {
                    const dirPath = parts.slice(0, i).join('/');
                    if (!pathSet.has(dirPath)) {
                        pathSet.add(dirPath);
                        quickPickItems.push({
                            label: `$(folder) ${dirPath}`,
                            description: '目錄',
                            detail: `插入 ${dirPath} 目錄下的所有檔案`
                        });
                    }
                }
                
                if (!pathSet.has(filePath)) {
                    pathSet.add(filePath);
                    const icon = this.getFileIconKind(filePath);
                    quickPickItems.push({
                        label: `${icon} ${filePath}`,
                        description: '檔案',
                        detail: `插入 ${filePath} 作為參考`
                    });
                }
            }
            
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = quickPickItems;
            quickPick.placeholder = '輸入關鍵字搜尋檔案或目錄...';
            quickPick.title = '選擇上下文參考';
            quickPick.matchOnDescription = true;
            quickPick.matchOnDetail = true;
            
            quickPick.onDidAccept(async () => {
                const selectedItems = quickPick.selectedItems;
                if (selectedItems.length > 0) {
                    const selectedItem = selectedItems[0];
                    const label = selectedItem.label.replace(/^[$\(].*[\)]\s*/, '');
                    
                    // Check if it's a directory or file
                    if (selectedItem.description === '目錄') {
                        await this.contextManager.addFolder(label);
                    } else {
                        await this.contextManager.addFile(label);
                    }
                    
                    vscode.window.showInformationMessage(`已新增 ${label} 到上下文`);
                    quickPick.hide();
                }
            });
            
            quickPick.onDidChangeValue(() => {
                // Filter items based on input
                const value = quickPick.value.toLowerCase();
                if (value) {
                    quickPick.items = quickPickItems.filter(item => 
                        item.label.toLowerCase().includes(value) ||
                        item.description?.toLowerCase().includes(value) ||
                        item.detail?.toLowerCase().includes(value)
                    );
                } else {
                    quickPick.items = quickPickItems;
                }
            });
            
            quickPick.show();
        } catch (error) {
            console.error('Error showing reference picker:', error);
            vscode.window.showErrorMessage(`選擇參考時發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}`);
        }
    }

    /**
     * Get workspace files using VSCode API
     */
    private async getWorkspaceFiles(): Promise<string[]> {
        const files: string[] = [];

        try {
            const allFiles = await vscode.workspace.findFiles(
                '**/*',
                '**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/*.min.js'
            );

            for (const file of allFiles) {
                if (this.fileRefProvider['isBinaryFile'](file.fsPath)) {
                    continue;
                }

                const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
                const relativePath = workspaceFolder
                    ? vscode.workspace.asRelativePath(file)
                    : file.fsPath;

                files.push(relativePath);
            }

            files.sort((a, b) => a.localeCompare(b));
            return files;
        } catch (error) {
            console.error('Error getting workspace files:', error);
            return [];
        }
    }

    /**
     * Get appropriate icon kind for file based on extension
     */
    private getFileIconKind(filePath: string): vscode.QuickPickItem['label'] {
        const ext = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();
        
        const iconMap: Record<string, string> = {
            'ts': 'file-type-typescript',
            'tsx': 'file-type-typescript',
            'js': 'file-type-javascript',
            'py': 'file-type-python',
            'java': 'file-type-java',
            'md': 'file-type-markdown',
            'json': 'file-type-json',
            'yaml': 'file-type-yaml',
            'yml': 'file-type-yaml'
        };
        
        const iconName = iconMap[ext] || 'file-code';
        return `$(${iconName})`;
    }
}
