import vscode from 'vscode';
import { AIService } from '../services/aiService';
import { ErrorHandler } from '../utils/error';

export async function checkHealthCommand(): Promise<void> {
  const aiService = AIService.getInstance();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '🔍 Checking LiteLLM health...',
      cancellable: false
    },
    async () => {
      try {
        const isHealthy = await aiService.checkHealth();

        if (isHealthy) {
          vscode.window.showInformationMessage(
            '✅ LiteLLM Proxy is healthy and ready!'
          );
        } else {
          vscode.window.showWarningMessage(
            '⚠️ LiteLLM Proxy health check failed. Please check if the service is running.'
          );
        }
      } catch (error) {
        await ErrorHandler.handle(error, 'Health check failed');
      }
    }
  );
}
