import vscode from 'vscode';

export async function focusChatPanelCommand(): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('AI Assistant');
  outputChannel.show();
  
  vscode.window.showInformationMessage('📬 AI Assistant Output panel focused!');
}
