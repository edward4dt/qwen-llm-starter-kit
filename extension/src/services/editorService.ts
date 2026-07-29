import vscode from 'vscode';

export class EditorService {
  private static instance: EditorService;

  private constructor() {}

  public static getInstance(): EditorService {
    if (!EditorService.instance) {
      EditorService.instance = new EditorService();
    }
    return EditorService.instance;
  }

  public getActiveEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  public getSelectedText(): string | undefined {
    const editor = this.getActiveEditor();
    if (!editor) {
      return undefined;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      return undefined;
    }

    return editor.document.getText(selection);
  }

  public getCurrentFileContent(): string | undefined {
    const editor = this.getActiveEditor();
    if (!editor) {
      return undefined;
    }
    return editor.document.getText();
  }

  public getCurrentFilePath(): string | undefined {
    const editor = this.getActiveEditor();
    if (!editor) {
      return undefined;
    }
    return editor.document.uri.fsPath;
  }

  public getCurrentLanguage(): string | undefined {
    const editor = this.getActiveEditor();
    if (!editor) {
      return undefined;
    }
    return editor.document.languageId;
  }

  public async insertText(text: string): Promise<void> {
    const editor = this.getActiveEditor();
    if (!editor) {
      throw new Error('No active editor');
    }

    await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, text);
    });
  }

  public async replaceSelection(text: string): Promise<void> {
    const editor = this.getActiveEditor();
    if (!editor) {
      throw new Error('No active editor');
    }

    await editor.edit(editBuilder => {
      editBuilder.replace(editor.selection, text);
    });
  }

  public async showDiff(original: string, modified: string, title: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
      content: modified,
      language: this.getCurrentLanguage() || 'plaintext'
    });

    await vscode.window.showTextDocument(doc, { preview: false });
  }
}
