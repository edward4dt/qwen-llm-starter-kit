import vscode from 'vscode';
import { AIService } from '../services/aiService';
import { EditorService } from '../services/editorService';
import { ErrorHandler } from '../utils/error';

export async function askAICommand(): Promise<void> {
  const editorService = EditorService.getInstance();
  const aiService = AIService.getInstance();

  const selectedCode = editorService.getSelectedText();
  const language = editorService.getCurrentLanguage();

  const question = await vscode.window.showInputBox({
    prompt: selectedCode 
      ? 'Ask AI about the selected code...' 
      : 'Ask AI anything...',
    placeHolder: 'e.g., Explain this code, How can I improve this?',
    ignoreFocusOut: true
  });

  if (!question) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '🤖 AI is thinking...',
      cancellable: true
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        aiService.cancelRequest();
      });

      try {
        let responseBuffer = '';
        const outputChannel = vscode.window.createOutputChannel('AI Assistant');
        
        outputChannel.appendLine(`\n[User] ${question}`);
        if (selectedCode) {
          outputChannel.appendLine(`[Selected Code]\n${selectedCode}`);
        }
        outputChannel.show(true);

        const response = await aiService.chat(
          {
            message: question,
            selectedCode,
            language
          },
          (chunk) => {
            responseBuffer += chunk;
            progress.report({ message: `▌ ${responseBuffer.slice(-100)}` });
          }
        );

        outputChannel.appendLine(`\n[AI Assistant]\n${response}`);
        
        vscode.window.showInformationMessage('✅ AI response received! Check the Output panel.');
        
      } catch (error) {
        if (ErrorHandler.isCancellationError(error)) {
          vscode.window.showInformationMessage('Request cancelled');
        } else {
          await ErrorHandler.handle(error, 'Failed to get AI response');
        }
      }
    }
  );
}
