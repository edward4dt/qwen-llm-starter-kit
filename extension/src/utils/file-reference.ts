import * as vscode from 'vscode';
import { FileReference } from '../types';

export class FileReferenceProvider {
    private readonly MAX_FILE_SIZE = 50 * 1024; // 50KB limit for directory files
    private readonly MAX_FILES_IN_DIRECTORY = 10; // Max files from directory
    private readonly MAX_TOTAL_TOKENS = 50000; // Estimated total token limit
    private readonly BINARY_EXTENSIONS = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.zip', '.tar', '.gz', '.rar', '.7z',
        '.exe', '.dll', '.so', '.dylib',
        '.mp3', '.mp4', '.avi', '.mov', '.wav'
    ];
    private readonly EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', 'vendor'];

    /**
     * Check if a file is in an excluded directory
     */
    private isInExcludedDirectory(filePath: string): boolean {
        return this.EXCLUDED_DIRS.some(dir => filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`));
    }

    /**
     * Check if a file is a binary file based on extension
     */
    private isBinaryFile(filePath: string): boolean {
        const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return this.BINARY_EXTENSIONS.includes(ext);
    }

    /**
     * Check if a file is valid (not binary, not in excluded dirs)
     */
    private isValidFile(fileName: string, filePath: string): boolean {
        // Exclude files in excluded directories
        if (this.isInExcludedDirectory(filePath)) {
            return false;
        }

        // Exclude binary files
        if (this.isBinaryFile(filePath)) {
            return false;
        }

        return true;
    }

    /**
     * Recursively get all files in a directory
     */
    async getAllFilesInDirectory(dirPath: string): Promise<string[]> {
        const files: string[] = [];
        const uri = vscode.Uri.file(dirPath);
        
        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);

            for (const [name, type] of entries) {
                const fullPath = vscode.Uri.joinPath(uri, name).fsPath;

                if (type === vscode.FileType.Directory) {
                    // Recursively process subdirectories
                    const subFiles = await this.getAllFilesInDirectory(fullPath);
                    files.push(...subFiles);
                } else if (type === vscode.FileType.File) {
                    // Filter files
                    if (this.isValidFile(name, fullPath)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
        }

        return files;
    }

    /**
     * Get all workspace files for the picker
     */
    async getWorkspaceFiles(): Promise<vscode.QuickPickItem[]> {
        try {
            const files = await vscode.workspace.findFiles(
                '**/*', 
                '**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/*.min.js'
            );
            
            const items: vscode.QuickPickItem[] = [];
            for (const file of files) {
                // Skip binary files
                if (this.isBinaryFile(file.fsPath)) {
                    continue;
                }
                
                // Get relative path for better display
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
                const relativePath = workspaceFolder 
                    ? vscode.workspace.asRelativePath(file)
                    : file.fsPath;
                
                items.push({
                    label: relativePath,
                    description: file.fsPath,
                    detail: '選擇此檔案作為上下文參考'
                });
            }
            
            // Sort by path
            items.sort((a, b) => a.label.localeCompare(b.label));
            
            return items;
        } catch (error) {
            console.error('Error getting workspace files:', error);
            return [];
        }
    }

    /**
     * Read file content with size limit
     */
    async readFileContent(filePath: string): Promise<{ content: string; truncated: boolean; language?: string }> {
        try {
            const uri = vscode.Uri.file(filePath);
            const stats = await vscode.workspace.fs.stat(uri);
            
            // Check file size
            if (stats.size > this.MAX_FILE_SIZE) {
                return {
                    content: `⚠️ 檔案過大 (${stats.size} bytes)，超過限制 (${this.MAX_FILE_SIZE} bytes)。請選擇較小的檔案。`,
                    truncated: true
                };
            }
            
            // Check if binary
            if (this.isBinaryFile(filePath)) {
                return {
                    content: `⚠️ 不支援讀取二進位檔案：${filePath}`,
                    truncated: true
                };
            }
            
            // Read file content
            const uint8Array = await vscode.workspace.fs.readFile(uri);
            const content = new TextDecoder('utf-8').decode(uint8Array);
            
            // Get language from file extension
            const ext = filePath.substring(filePath.lastIndexOf('.') + 1);
            const language = this.getLanguageFromExtension(ext);
            
            return {
                content,
                truncated: false,
                language
            };
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return {
                content: `⚠️ 無法讀取檔案：${filePath}\n錯誤：${error instanceof Error ? error.message : '未知錯誤'}`,
                truncated: true
            };
        }
    }

    /**
     * Get language identifier from file extension
     */
    private getLanguageFromExtension(ext: string): string | undefined {
        const languageMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescriptreact',
            'js': 'javascript',
            'jsx': 'javascriptreact',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sh': 'shellscript',
            'bash': 'shellscript',
            'zsh': 'shellscript',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'toml': 'toml',
            'md': 'markdown',
            'sql': 'sql',
            'graphql': 'graphql',
            'vue': 'vue',
            'svelte': 'svelte'
        };
        
        return languageMap[ext.toLowerCase()] || undefined;
    }

    /**
     * Create a FileReference from a file path
     */
    async createFileReference(filePath: string): Promise<FileReference> {
        const { content, language } = await this.readFileContent(filePath);
        
        return {
            filePath,
            content,
            language
        };
    }

    /**
     * Show file picker and return selected file references with type selection
     */
    async showFilePicker(): Promise<FileReference[]> {
        const choice = await vscode.window.showQuickPick(
            ['選擇檔案', '選擇目錄'],
            { placeHolder: '選擇參考類型' }
        );

        if (choice === '選擇目錄') {
            return await this.showDirectoryPicker();
        }

        // Default to file selection
        const files = await this.getWorkspaceFiles();
        
        if (files.length === 0) {
            vscode.window.showWarningMessage('工作區中沒有可用的檔案');
            return [];
        }
        
        const selected = await vscode.window.showQuickPick(files, {
            placeHolder: '選擇要參考的檔案 (@)',
            matchOnDescription: true,
            matchOnDetail: true,
            canPickMany: false
        });
        
        if (!selected) {
            return [];
        }
        
        const filePath = selected.description!;
        const reference = await this.createFileReference(filePath);
        
        return [reference];
    }

    /**
     * Show directory picker and return selected file references
     */
    async showDirectoryPicker(): Promise<FileReference[]> {
        const options: vscode.OpenDialogOptions = {
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: '選擇目錄',
            title: '選擇要參考的目錄'
        };

        const uri = await vscode.window.showOpenDialog(options);
        if (!uri || uri.length === 0) {
            return [];
        }

        const dirPath = uri[0].fsPath;
        
        // Show progress while reading directory
        const files = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: '正在讀取目錄檔案...',
                cancellable: false
            },
            async () => {
                return await this.getAllFilesInDirectory(dirPath);
            }
        );

        if (files.length === 0) {
            vscode.window.showWarningMessage('所選目錄中沒有可用的文字檔案');
            return [];
        }

        // Show preview and confirm
        const preview = files.slice(0, 5).join('\n') + 
            (files.length > 5 ? `\n... 共 ${files.length} 個檔案` : '');
        
        const confirm = await vscode.window.showInformationMessage(
            `將包含以下檔案:\n${preview}\n\n是否繼續？`,
            { modal: true },
            '確認',
            '取消'
        );

        if (confirm !== '確認') {
            return [];
        }

        // Limit file count
        let selectedFiles = files;
        if (files.length > this.MAX_FILES_IN_DIRECTORY) {
            vscode.window.showWarningMessage(
                `目錄下檔案數量過多（${files.length} 個），只选取前 ${this.MAX_FILES_IN_DIRECTORY} 個檔案。`
            );
            selectedFiles = files.slice(0, this.MAX_FILES_IN_DIRECTORY);
        }

        // Read files with token limit
        const references: FileReference[] = [];
        let totalTokens = 0;

        for (const filePath of selectedFiles) {
            try {
                const stats = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
                
                if (stats.size > this.MAX_FILE_SIZE) {
                    vscode.window.showWarningMessage(`⚠️ 檔案 ${filePath} 過大（${stats.size} bytes），跳過。`);
                    continue;
                }

                const contentResult = await this.readFileContent(filePath);
                if (contentResult.truncated && contentResult.content.includes('⚠️')) {
                    references.push({
                        filePath,
                        content: contentResult.content,
                        language: contentResult.language
                    });
                    continue;
                }

                const estimatedTokens = Math.ceil(contentResult.content.length / 4);
                
                if (totalTokens + estimatedTokens > this.MAX_TOTAL_TOKENS) {
                    vscode.window.showWarningMessage(`⚠️ 總 Token 數即將超限，跳過檔案 ${filePath}。`);
                    continue;
                }

                totalTokens += estimatedTokens;
                references.push({
                    filePath,
                    content: contentResult.content,
                    language: contentResult.language
                });
            } catch (error) {
                references.push({
                    filePath,
                    content: `❌ 讀取檔案 ${filePath} 失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
                    language: undefined
                });
            }
        }

        return references;
    }

    /**
     * Format file reference for injection into prompt
     */
    formatFileReference(reference: FileReference): string {
        const langMarker = reference.language || '';
        return `## 參考檔案：${reference.filePath}\n\`\`\`${langMarker}\n${reference.content}\n\`\`\``;
    }

    /**
     * Inject file references into user message
     */
    injectFileContext(message: string, references: FileReference[]): string {
        if (references.length === 0) {
            return message;
        }
        
        const contextParts = references.map(ref => this.formatFileReference(ref));
        const context = contextParts.join('\n\n');
        
        return `${context}\n\n---\n\n使用者問題：${message}`;
    }
}
