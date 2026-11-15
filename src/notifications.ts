import * as vscode from "vscode";
import { currentBranch } from "./git";

function cfg(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration("airCanada.notifications");
}
function on(key: string): boolean {
  return cfg().get<boolean>("enabled", true) && cfg().get<boolean>(key, true);
}

/** Cockpit-style announcements for workspace open, tasks and debug sessions. */
export function registerNotifications(context: vscode.ExtensionContext): void {
  void welcome();

  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (!on("tasks")) return;
      const name = e.execution.task.name;
      if (e.exitCode === 0) {
        void vscode.window.setStatusBarMessage(`✈ Wheels up — "${name}" completed`, 6000);
        return;
      }
      void vscode.window
        .showWarningMessage(`✈ Go-around — "${name}" exited with code ${e.exitCode ?? "?"}`, "Show Problems", "Show Terminal")
        .then((choice) => {
          if (choice === "Show Problems") void vscode.commands.executeCommand("workbench.actions.view.problems");
          if (choice === "Show Terminal") void vscode.commands.executeCommand("workbench.action.terminal.focus");
        });
    }),

    vscode.debug.onDidStartDebugSession((s) => {
      if (on("debug")) void vscode.window.setStatusBarMessage(`✈ Cleared for takeoff — debugging "${s.name}"`, 5000);
    }),
    vscode.debug.onDidTerminateDebugSession((s) => {
      if (on("debug")) void vscode.window.setStatusBarMessage(`✈ Landed — "${s.name}" ended`, 5000);
    }),
  );
}

async function welcome(): Promise<void> {
  if (!on("welcome")) return;
  if (!vscode.workspace.workspaceFolders?.length) return;

  const branch = await currentBranch();
  const flight = branch ? ` Flight **${branch}** is ready for departure.` : "";
  const choice = await vscode.window.showInformationMessage(
    `✈ Boarding complete — welcome aboard.${flight}`,
    "Pre-flight checklist",
    "Don't show again",
  );
  if (choice === "Don't show again") {
    await cfg().update("welcome", false, vscode.ConfigurationTarget.Global);
  } else if (choice === "Pre-flight checklist") {
    void vscode.commands.executeCommand("airCanada.openPreflight");
  }
}
