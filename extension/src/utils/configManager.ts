import * as vscode from 'vscode';

export interface ExtensionConfig {
    proxyUrl: string;
    masterKey?: string;
    defaultModel: string;
    temperature: number;
    maxTokens: number;
}

export class ConfigManager {
    private static readonly MASTER_KEY_SECRET_KEY = 'ai-assistant-master-key';
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('aiAssistant');
    }

    /**
     * Get extension configuration
     */
    getConfig(): ExtensionConfig {
        return {
            proxyUrl: this.config.get<string>('proxyUrl') || 'http://127.0.0.1:4000',
            defaultModel: this.config.get<string>('defaultModel') || 'coder',
            temperature: this.config.get<number>('temperature') || 0.7,
            maxTokens: this.config.get<number>('maxTokens') || 2048,
        };
    }

    /**
     * Get Master Key from SecretStorage
     */
    async getMasterKey(secretStorage: vscode.SecretStorage): Promise<string | undefined> {
        const storedKey = await secretStorage.get(this.MASTER_KEY_SECRET_KEY);
        
        // If key is in SecretStorage, return it
        if (storedKey) {
            return storedKey;
        }
        
        // Fallback to config for backward compatibility (not recommended)
        const configKey = this.config.get<string>('masterKey');
        if (configKey) {
            console.warn('Master Key found in settings. Consider migrating to SecretStorage for better security.');
            return configKey;
        }
        
        return undefined;
    }

    /**
     * Set Master Key in SecretStorage
     */
    async setMasterKey(secretStorage: vscode.SecretStorage, key: string): Promise<void> {
        await secretStorage.store(this.MASTER_KEY_SECRET_KEY, key);
    }

    /**
     * Remove Master Key from SecretStorage
     */
    async removeMasterKey(secretStorage: vscode.SecretStorage): Promise<void> {
        await secretStorage.delete(this.MASTER_KEY_SECRET_KEY);
    }

    /**
     * Check if Master Key is configured
     */
    async hasMasterKey(secretStorage: vscode.SecretStorage): Promise<boolean> {
        const key = await this.getMasterKey(secretStorage);
        return !!key;
    }

    /**
     * Update configuration value
     */
    async updateConfig<T extends keyof ExtensionConfig>(
        key: T,
        value: ExtensionConfig[T],
        global: boolean = false
    ): Promise<void> {
        const configKey = `aiAssistant.${key}`;
        await this.config.update(configKey, value, global);
        // Refresh config reference
        this.config = vscode.workspace.getConfiguration('aiAssistant');
    }
}
