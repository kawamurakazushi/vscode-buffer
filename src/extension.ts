// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

let state: { uri: string }[] = [];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-buffer" is now active!');
  const documents = vscode.window.tabGroups.all
    .flatMap(({ tabs }) =>
      tabs.map((tab) => {
        if (
          tab.input instanceof vscode.TabInputText ||
          tab.input instanceof vscode.TabInputNotebook
        ) {
          return {
            uri: tab.input.uri.path,
          };
        }

        if (
          tab.input instanceof vscode.TabInputTextDiff ||
          tab.input instanceof vscode.TabInputNotebookDiff
        ) {
          return {
            uri: tab.input.original.path,
          };
        }
        // others tabs e.g. Settings or web views don't have URI
        return null;
      })
    )
    .filter((d) => d !== null)
    .reverse();
  const uniqueDocuments = Array.from(
    new Map(documents.map((doc) => [doc.uri, doc])).values()
  );

  state = uniqueDocuments;

  vscode.window.onDidChangeActiveTextEditor((e) => {
    const uri = e?.document.uri.path;
    if (!uri) return;
    state = state.filter((d) => d.uri !== uri);
    state.unshift({ uri });
  });

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "buffer.list",

    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const docs = state.filter((d) => {
        return d.uri !== activeEditor?.document.uri.path;
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;

      // Create a list of file names to show in the quick pick
      const fileItems = docs.map((d) => {
        const label = removeProjectRootPath(d.uri);
        return {
          label: label,
          uri: d.uri,
        };
      });

      // Show the quick pick with the list of files
      const selectedFile = await vscode.window.showQuickPick(fileItems, {
        placeHolder: "Select a file to open",
        title: removeProjectRootPath(
          activeEditor?.document.uri.path || "buffer"
        ),
      });

      if (selectedFile) {
        // Open the selected file in the current active editor group
        const document = await vscode.workspace.openTextDocument(
          selectedFile.uri
        );
        await vscode.window.showTextDocument(
          document,
          vscode.ViewColumn.Active
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

const removeProjectRootPath = (uri: string) => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      if (uri.startsWith(folder.uri.fsPath)) {
        return uri.substring(folder.uri.fsPath.length + 1); // Remove the workspace folder path from the file name
      }
    }
  }
  return uri;
};

// This method is called when your extension is deactivated
export function deactivate() {}
