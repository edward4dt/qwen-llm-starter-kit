import * as vscode from 'vscode';
import { AIService } from './services/aiService';
import { LiteLLMProvider } from './providers/liteLLM';
import { ConfigService } from './config/settings';
import { askAICommand } from './commands/askAI';
import { checkHealthCommand } from './commands/checkHealth';
import { focusChatPanelCommand } from './commands/focusChatPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 AI Assistant is now active!');

  // Initialize services
  const configService = ConfigService.getInstance();
  const aiService = AIService.getInstance();

  // Setup LLM Provider
  async function initializeProvider() {
    try {
      const baseUrl = configService.getBaseUrl();
      const apiKey = await configService.getApiKey(context);
      const timeout = configService.getTimeout();

      const provider = new LiteLLMProvider(baseUrl, apiKey, timeout);
      aiService.setProvider(provider);
      
      console.log('✅ LLM Provider initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize LLM Provider:', error);
    }
  }

  // Initialize on activation
  initializeProvider();

  // Register commands
  const askAIDisposable = vscode.commands.registerCommand(
    'ai-assistant.askAI',
    askAICommand
  );

  const checkHealthDisposable = vscode.commands.registerCommand(
    'ai-assistant.checkHealth',
    checkHealthCommand
  );

  const focusChatPanelDisposable = vscode.commands.registerCommand(
    'ai-assistant.focusChatPanel',
    focusChatPanelCommand
  );

  // Add to subscriptions for cleanup
  context.subscriptions.push(
    askAIDisposable,
    checkHealthDisposable,
    focusChatPanelDisposable
  );

  // Listen for configuration changes
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('aiAssistant')) {
      configService.reload();
      initializeProvider();
    }
  });

  context.subscriptions.push(configChangeDisposable);
}

export function deactivate() {
  console.log('👋 AI Assistant deactivated');
}
