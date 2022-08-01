import * as vscode from "vscode";

export function registerCommands(context: vscode.ExtensionContext): void {
  function commandPetiteMM(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
    if ((textEditor.document.getText().match(/;/g) ?? []).length > 8) {
      vscode.window.showWarningMessage("Too many channels!");
    } else {
    }
  }

  context.subscriptions.push(vscode.commands.registerTextEditorCommand("mmlamktoolkit.petitemm", commandPetiteMM));
}
