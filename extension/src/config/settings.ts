import vscode from 'vscode';

const CONFIG_SECTION = 'aiAssistant';

export interface AIAssistantConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

export class ConfigService {
  private static instance: ConfigService;
  private config: vscode.WorkspaceConfiguration;

  private constructor() {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getBaseUrl(): string {
    return this.config.get<string>('baseUrl') || 'http://localhost:4000';
  }

  public getModel(): string {
    return this.config.get<string>('model') || 'coding';
  }

  public getTimeout(): number {
    return this.config.get<number>('timeout') || 60000;
  }

  public async getApiKey(context: vscode.ExtensionContext): Promise<string> {
    const secretStorage = context.secrets;
    let apiKey = await secretStorage.get('apiKey');
    
    if (!apiKey) {
      apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your LiteLLM API Key',
        placeHolder: 'sk-...',
        password: true,
        ignoreFocusOut: true
      });
      
      if (apiKey) {
        await secretStorage.store('apiKey', apiKey);
      }
    }
    
    return apiKey || '';
  }

  public async clearApiKey(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete('apiKey');
  }

  public reload(): void {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }
}
