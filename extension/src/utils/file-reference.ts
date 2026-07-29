import * as vscode from 'vscode';
import { FileReference } from '../types';

export class FileReferenceProvider {
    private readonly MAX_FILE_SIZE = 10 * 1024; // 10KB limit
    private readonly BINARY_EXTENSIONS = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.zip', '.tar', '.gz', '.rar', '.7z',
        '.exe', '.dll', '.so', '.dylib',
        '.mp3', '.mp4', '.avi', '.mov', '.wav'
    ];

    /**
     * Check if a file is a binary file based on extension
     */
    private isBinaryFile(filePath: string): boolean {
        const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return this.BINARY_EXTENSIONS.includes(ext);
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
     * Show file picker and return selected file references
     */
    async showFilePicker(): Promise<FileReference[]> {
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
