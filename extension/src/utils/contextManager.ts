import * as vscode from 'vscode';
import { ContextReference, ContextReferenceType } from '../types';

/**
 * Token estimation utilities
 */
export class TokenEstimator {
    /**
     * Estimate token count for a given text
     * Using approximate calculation: 1 token ≈ 4 characters for English, 1 token ≈ 1.5 characters for Chinese
     */
    static estimateTokens(text: string): number {
        if (!text) return 0;
        
        // Count Chinese characters (rough estimate)
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = text.length - chineseChars;
        
        // Chinese: ~1.5 chars per token, English: ~4 chars per token
        const chineseTokens = Math.ceil(chineseChars / 1.5);
        const otherTokens = Math.ceil(otherChars / 4);
        
        return chineseTokens + otherTokens;
    }
    
    /**
     * Calculate total tokens for an array of context references
     */
    static estimateContextTokens(references: ContextReference[]): number {
        return references.reduce((total, ref) => {
            return total + (ref.tokenCount || this.estimateTokens(ref.content));
        }, 0);
    }
}

/**
 * Unified Context Manager for handling all types of context references
 * 
 * This is the single source of truth for context management.
 * All context sources (@ completion, QuickPick, Drag & Drop, Folder Picker, etc.)
 * should use this manager to add, remove, and manage context references.
 */
export class ContextManager {
    private _references: ContextReference[] = [];
    private readonly _onDidChange = new vscode.EventEmitter<ContextReference[]>();
    private readonly _maxTokenBudget: number;
    
    /**
     * Event fired when context references change
     */
    public readonly onDidChange = this._onDidChange.event;
    
    constructor(maxTokenBudget: number = 50000) {
        this._maxTokenBudget = maxTokenBudget;
    }
    
    /**
     * Get all current context references
     */
    get references(): ContextReference[] {
        return [...this._references];
    }
    
    /**
     * Get total estimated token count
     */
    getTotalTokens(): number {
        return TokenEstimator.estimateContextTokens(this._references);
    }
    
    /**
     * Check if adding more content would exceed token budget
     */
    canAddContent(estimatedTokens: number): boolean {
        return this.getTotalTokens() + estimatedTokens <= this._maxTokenBudget;
    }
    
    /**
     * Add a file reference
     */
    async addFile(filePath: string, content?: string, language?: string): Promise<ContextReference | null> {
        try {
            const fileContent = content || await this.readFileContent(filePath);
            const tokenCount = TokenEstimator.estimateTokens(fileContent);
            
            if (!this.canAddContent(tokenCount)) {
                vscode.window.showWarningMessage(`⚠️ 新增檔案將超過 Token 預算 (${tokenCount} tokens)`);
                return null;
            }
            
            const reference: ContextReference = {
                type: 'file',
                path: filePath,
                content: fileContent,
                language: language || this.getLanguageFromFilePath(filePath),
                tokenCount,
                metadata: {}
            };
            
            this._references.push(reference);
            this._onDidChange.fire(this._references);
            
            return reference;
        } catch (error) {
            console.error(`Error adding file ${filePath}:`, error);
            vscode.window.showErrorMessage(`無法讀取檔案：${filePath}`);
            return null;
        }
    }
    
    /**
     * Add a folder reference (all files in folder)
     */
    async addFolder(folderPath: string, maxFiles: number = 20): Promise<ContextReference[] | null> {
        try {
            const addedRefs: ContextReference[] = [];
            const uri = vscode.Uri.file(folderPath);
            const files = await this.getFilesInDirectory(uri, [], 0, maxFiles);
            
            let totalTokens = 0;
            
            for (const filePath of files) {
                const content = await this.readFileContent(filePath);
                const tokenCount = TokenEstimator.estimateTokens(content);
                
                if (totalTokens + tokenCount > this._maxTokenBudget) {
                    vscode.window.showWarningMessage(`⚠️ 目錄檔案數量已達 Token 預算限制`);
                    break;
                }
                
                totalTokens += tokenCount;
                
                const reference: ContextReference = {
                    type: 'folder',
                    path: filePath,
                    content: content,
                    language: this.getLanguageFromFilePath(filePath),
                    tokenCount,
                    metadata: {
                        fileCount: files.length
                    }
                };
                
                this._references.push(reference);
                addedRefs.push(reference);
            }
            
            if (addedRefs.length > 0) {
                this._onDidChange.fire(this._references);
            }
            
            return addedRefs.length > 0 ? addedRefs : null;
        } catch (error) {
            console.error(`Error adding folder ${folderPath}:`, error);
            vscode.window.showErrorMessage(`無法讀取目錄：${folderPath}`);
            return null;
        }
    }
    
    /**
     * Add a selection reference (from editor selection)
     */
    async addSelection(editor: vscode.TextEditor): Promise<ContextReference | null> {
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('請先選擇一段文字');
            return null;
        }
        
        const document = editor.document;
        const selectedText = document.getText(selection);
        const tokenCount = TokenEstimator.estimateTokens(selectedText);
        
        if (!this.canAddContent(tokenCount)) {
            vscode.window.showWarningMessage(`⚠️ 選取內容將超過 Token 預算 (${tokenCount} tokens)`);
            return null;
        }
        
        const reference: ContextReference = {
            type: 'selection',
            path: document.uri.fsPath,
            content: selectedText,
            language: document.languageId,
            tokenCount,
            metadata: {
                startLine: selection.start.line,
                endLine: selection.end.line,
                uri: document.uri.toString()
            }
        };
        
        this._references.push(reference);
        this._onDidChange.fire(this._references);
        
        return reference;
    }
    
    /**
     * Remove a context reference by index
     */
    removeReference(index: number): boolean {
        if (index < 0 || index >= this._references.length) {
            return false;
        }
        
        this._references.splice(index, 1);
        this._onDidChange.fire(this._references);
        return true;
    }
    
    /**
     * Clear all context references
     */
    clear(): void {
        this._references = [];
        this._onDidChange.fire(this._references);
    }
    
    /**
     * Convert ContextReferences to FileReferences for backward compatibility
     */
    toFileReferences(): import('../types').FileReference[] {
        return this._references.map(ref => ({
            filePath: ref.path || '',
            content: ref.content,
            language: ref.language,
            isDirectory: ref.type === 'folder'
        }));
    }
    
    /**
     * Format context for prompt injection
     */
    formatForPrompt(): string {
        if (this._references.length === 0) return '';
        
        const parts: string[] = [];
        
        // Group by type
        const files = this._references.filter(r => r.type === 'file');
        const folders = this._references.filter(r => r.type === 'folder');
        const selections = this._references.filter(r => r.type === 'selection');
        
        // Format files
        files.forEach(ref => {
            const fileName = ref.path?.split(/[\\/]/).pop() || 'unknown';
            const langMarker = ref.language || '';
            parts.push(`[FILE: ${fileName}]\n\`\`\`${langMarker}\n${ref.content}\n\`\`\``);
        });
        
        // Format folders
        if (folders.length > 0) {
            const dirGroups: Record<string, ContextReference[]> = {};
            folders.forEach(ref => {
                const dirPath = ref.path?.split(/[\\/]/).slice(0, -1).join('/') || 'root';
                if (!dirGroups[dirPath]) dirGroups[dirPath] = [];
                dirGroups[dirPath].push(ref);
            });
            
            Object.entries(dirGroups).forEach(([dirPath, refs]) => {
                const dirName = dirPath.split('/').pop() || 'root';
                const fileList = refs.map(r => `- [FILE: ${r.path?.split(/[\\/]/).pop()}]`).join('\n');
                const contents = refs.map(r => {
                    const fileName = r.path?.split(/[\\/]/).pop() || 'unknown';
                    const langMarker = r.language || '';
                    return `[FILE: ${fileName}]\n\`\`\`${langMarker}\n${r.content}\n\`\`\``;
                }).join('\n\n');
                
                parts.push(`[DIRECTORY: ${dirName}]\n包含檔案:\n${fileList}\n\n${contents}`);
            });
        }
        
        // Format selections
        selections.forEach(ref => {
            const fileName = ref.path?.split(/[\\/]/).pop() || 'unknown';
            const lines = ref.metadata?.startLine !== undefined && ref.metadata?.endLine !== undefined
                ? `L${ref.metadata.startLine + 1}-L${ref.metadata.endLine + 1}`
                : '';
            const langMarker = ref.language || '';
            parts.push(`[SELECTION: ${fileName}${lines}]\n\`\`\`${langMarker}\n${ref.content}\n\`\`\``);
        });
        
        return parts.join('\n\n---\n\n');
    }
    
    // ========== Private Helper Methods ==========
    
    /**
     * Read file content
     */
    private async readFileContent(filePath: string): Promise<string> {
        const uri = vscode.Uri.file(filePath);
        const uint8Array = await vscode.workspace.fs.readFile(uri);
        return new TextDecoder('utf-8').decode(uint8Array);
    }
    
    /**
     * Get language identifier from file path
     */
    private getLanguageFromFilePath(filePath: string): string | undefined {
        const ext = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();
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
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'sql': 'sql'
        };
        return languageMap[ext] || undefined;
    }
    
    /**
     * Recursively get files in directory with limit
     */
    private async getFilesInDirectory(
        uri: vscode.Uri,
        files: string[],
        depth: number,
        maxFiles: number,
        maxDepth: number = 5
    ): Promise<string[]> {
        if (depth > maxDepth || files.length >= maxFiles) {
            return files;
        }
        
        const excludedDirs = ['node_modules', '.git', 'dist', 'build', 'vendor'];
        const binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.exe'];
        
        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);
            
            for (const [name, type] of entries) {
                if (files.length >= maxFiles) break;
                
                const fullPath = vscode.Uri.joinPath(uri, name).fsPath;
                
                if (type === vscode.FileType.Directory) {
                    if (!excludedDirs.includes(name)) {
                        await this.getFilesInDirectory(vscode.Uri.joinPath(uri, name), files, depth + 1, maxFiles, maxDepth);
                    }
                } else if (type === vscode.FileType.File) {
                    const ext = fullPath.substring(fullPath.lastIndexOf('.')).toLowerCase();
                    if (!binaryExtensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${uri.fsPath}:`, error);
        }
        
        return files;
    }
}
