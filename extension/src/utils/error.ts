import vscode from 'vscode';

export class ErrorHandler {
  public static async handle(error: unknown, context?: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
    
    console.error(`[AI Assistant Error] ${fullMessage}`, error);
    
    const action = await vscode.window.showErrorMessage(
      fullMessage,
      'Show Details',
      'Dismiss'
    );

    if (action === 'Show Details') {
      const outputChannel = vscode.window.createOutputChannel('AI Assistant Errors');
      outputChannel.appendLine(`[${new Date().toISOString()}] ${fullMessage}`);
      if (error instanceof Error && error.stack) {
        outputChannel.appendLine(error.stack);
      }
      outputChannel.show();
    }
  }

  public static isCancellationError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }
}
