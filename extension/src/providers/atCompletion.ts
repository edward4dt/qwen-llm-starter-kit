import * as vscode from 'vscode';
import { FileReferenceProvider } from '../utils/file-reference';

export class AtCompletionProvider implements vscode.CompletionItemProvider {
    private readonly fileRefProvider: FileReferenceProvider;
    private readonly MAX_COMPLETION_FILES = 20;
    private readonly MAX_COMPLETION_DIRS = 10;
    private cache: { files: string[]; directories: string[] } | null = null;

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
            // Get workspace files and directories
            const { files, directories } = await this.getWorkspaceFilesAndDirectories();

            // Filter based on query (fuzzy search)
            const filteredFiles = query 
                ? files.filter(file => file.toLowerCase().includes(query.toLowerCase()))
                : files;
            
            const filteredDirs = query
                ? directories.filter(dir => dir.toLowerCase().includes(query.toLowerCase()))
                : directories;

            const completionItems: vscode.CompletionItem[] = [];

            // Add file completion items
            const completionFiles = filteredFiles.slice(0, this.MAX_COMPLETION_FILES);
            completionFiles.forEach(file => {
                const item = new vscode.CompletionItem(
                    `@${file}`,
                    vscode.CompletionItemKind.File
                );
                item.insertText = new vscode.SnippetString(`@${file}$0`);
                item.detail = `檔案：${file}`;
                item.documentation = new vscode.MarkdownString(`插入 **${file}** 作為參考檔案。`);
                
                // Set icon based on file extension
                const icon = this.getFileIcon(file);
                if (icon) {
                    (item as any).iconPath = icon;
                }
                
                completionItems.push(item);
            });

            // Add directory completion items
            const completionDirs = filteredDirs.slice(0, this.MAX_COMPLETION_DIRS);
            completionDirs.forEach(dir => {
                const item = new vscode.CompletionItem(
                    `@目錄:${dir}`,
                    vscode.CompletionItemKind.Folder
                );
                item.insertText = new vscode.SnippetString(`@目錄:${dir}$0`);
                item.detail = `目錄：${dir}`;
                item.documentation = new vscode.MarkdownString(`插入 **${dir}** 目錄下的所有檔案作為參考。`);
                (item as any).iconPath = new vscode.ThemeIcon('folder');
                
                completionItems.push(item);
            });

            // Add "more items" hint if there are more results
            if (filteredFiles.length > this.MAX_COMPLETION_FILES || filteredDirs.length > this.MAX_COMPLETION_DIRS) {
                const moreItem = new vscode.CompletionItem(
                    `... 還有更多檔案和目錄 (請輸入更多關鍵字過濾)`,
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
     * Get workspace files and directories with caching
     */
    async getWorkspaceFilesAndDirectories(): Promise<{ files: string[]; directories: string[] }> {
        if (this.cache) {
            return this.cache;
        }

        const files: string[] = [];
        const directories: string[] = [];

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

            // Get directories by scanning workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders || [];
            for (const folder of workspaceFolders) {
                await this.scanDirectories(folder.uri, directories);
            }

            // Sort both arrays
            files.sort((a, b) => a.localeCompare(b));
            directories.sort((a, b) => a.localeCompare(b));

            this.cache = { files, directories };
            return { files, directories };
        } catch (error) {
            console.error('Error getting workspace files:', error);
            return { files: [], directories: [] };
        }
    }

    /**
     * Recursively scan directories
     */
    private async scanDirectories(uri: vscode.Uri, directories: string[], depth: number = 0): Promise<void> {
        const maxDepth = 5; // Limit recursion depth
        const excludedDirs = ['node_modules', '.git', 'dist', 'build', 'vendor'];

        if (depth > maxDepth) {
            return;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);

            for (const [name, type] of entries) {
                if (type === vscode.FileType.Directory) {
                    // Skip excluded directories
                    if (excludedDirs.includes(name)) {
                        continue;
                    }

                    const dirUri = vscode.Uri.joinPath(uri, name);
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(dirUri);
                    const relativePath = workspaceFolder
                        ? vscode.workspace.asRelativePath(dirUri)
                        : dirUri.fsPath;

                    directories.push(relativePath);

                    // Recursively scan subdirectories
                    await this.scanDirectories(dirUri, directories, depth + 1);
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${uri.fsPath}:`, error);
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
