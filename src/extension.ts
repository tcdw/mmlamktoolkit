import * as vscode from "vscode";
import { registerCommands } from "./command";
import { subscribeToDocumentChanges } from "./diagnostics";
import { activateTokenizer } from "./semanticHighlight";
import { MmlHoverProvider } from "./hover";
import { subscribeCompletionItem } from "./completionItem";

export function activate(context: vscode.ExtensionContext) {
  if ((vscode.workspace.getConfiguration("mmlamktoolkit").get("AddmusickPath") as string) === "") {
    const message = vscode.window.showWarningMessage('"Addmusick Path" is undefined.', "Go to Config");
    message.then(() => {
      vscode.commands.executeCommand("workbench.action.openSettings", "mmlamktoolkit");
    });
  }

  //Commands
  registerCommands(context);

  //Diagnostics
  const mmlDiagnostics = vscode.languages.createDiagnosticCollection("mml");
  subscribeToDocumentChanges(context, mmlDiagnostics);

  //SemanticHighlight
  activateTokenizer(context);

  //HoverProvider
  context.subscriptions.push(vscode.languages.registerHoverProvider("mml", new MmlHoverProvider()));

  //CompletionItem
  subscribeCompletionItem(context);
}

export function deactivate() {}
