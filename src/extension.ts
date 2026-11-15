import * as vscode from "vscode";
import { Checklist, Task } from "./checklist";
import { FlightTracker } from "./flightTracker";
import { Flyby, FlybyAction } from "./flyby";
import { Meetings, Reminder } from "./meetings";
import { registerNotifications } from "./notifications";
import { FlightDeckView } from "./sessionView";

export function activate(context: vscode.ExtensionContext): void {
  const tracker = new FlightTracker(context);
  const checklist = new Checklist(context);
  const flyby = new Flyby(context);
  const meetings = new Meetings(context, flyby);
  const deck = new FlightDeckView(context, tracker, checklist, meetings);

  context.subscriptions.push(
    tracker,
    checklist,
    flyby,
    meetings,
    deck,
    vscode.window.registerWebviewViewProvider(FlightDeckView.viewId, deck, { webviewOptions: { retainContextWhenHidden: true } }),

    // --- flight (coding session) ---------------------------------------
    vscode.commands.registerCommand("airCanada.flight.openDeck", () => vscode.commands.executeCommand("airCanada.session.focus")),
    vscode.commands.registerCommand("airCanada.flight.board", () => tracker.board()),
    vscode.commands.registerCommand("airCanada.flight.start", (minutes?: number) =>
      tracker.start(typeof minutes === "number" ? minutes : undefined),
    ),
    vscode.commands.registerCommand("airCanada.flight.pause", () => tracker.pause()),
    vscode.commands.registerCommand("airCanada.flight.resume", () => tracker.resume()),
    vscode.commands.registerCommand("airCanada.flight.toggle", () => tracker.toggle()),
    vscode.commands.registerCommand("airCanada.flight.reset", () => tracker.reset()),
    vscode.commands.registerCommand("airCanada.flight.cancel", () => tracker.cancel()),
    vscode.commands.registerCommand("airCanada.flight.extend", (minutes: number) => tracker.extend(typeof minutes === "number" ? minutes : 5)),
    vscode.commands.registerCommand("airCanada.flight.extendCustom", () => tracker.extendCustom()),
    vscode.commands.registerCommand("airCanada.flight.returnFlight", () => tracker.returnFlight()),
    vscode.commands.registerCommand("airCanada.flight.setRoute", () => tracker.setRoute()),
    vscode.commands.registerCommand("airCanada.flight.setDuration", () => tracker.setDuration()),
    vscode.commands.registerCommand("airCanada.flight.setAircraft", () => tracker.setAircraft()),

    // --- flight plan (tasks) -------------------------------------------
    vscode.commands.registerCommand("airCanada.checklist.add", () => checklist.add()),
    vscode.commands.registerCommand("airCanada.checklist.edit", (t: Task | string) => t && checklist.edit(t)),
    vscode.commands.registerCommand("airCanada.checklist.toggle", (t: Task | string) => t && checklist.toggle(t)),
    vscode.commands.registerCommand("airCanada.checklist.remove", (t: Task | string) => t && checklist.remove(t)),
    vscode.commands.registerCommand("airCanada.checklist.clearDone", () => checklist.clearDone()),
    vscode.commands.registerCommand("airCanada.checklist.clearAll", () => checklist.clearAll()),

    // --- meeting reminders (manual, no calendar sync) ------------------
    vscode.commands.registerCommand("airCanada.meetings.add", () => meetings.add()),
    vscode.commands.registerCommand("airCanada.meetings.edit", (r: Reminder | string) => r && meetings.edit(r)),
    vscode.commands.registerCommand("airCanada.meetings.remove", (r: Reminder | string) => r && meetings.remove(r)),
    vscode.commands.registerCommand("airCanada.meetings.preview", (r: Reminder | string) => r && meetings.preview(r)),
    vscode.commands.registerCommand("airCanada.meetings.join", (r: Reminder | string) => r && meetings.join(r)),
    vscode.commands.registerCommand("airCanada.meetings.clearPast", () => meetings.clearPast()),
    vscode.commands.registerCommand("airCanada.meetings.demo", () => meetings.demo()),
    vscode.commands.registerCommand("airCanada.meetings.flybyAction", (action: FlybyAction, cb?: (a: FlybyAction) => void) => cb?.(action)),

    // --- misc ------------------------------------------------------------
    vscode.commands.registerCommand("airCanada.enableRecommendedSettings", enableRecommendedSettings),
    vscode.commands.registerCommand("airCanada.openPreflight", () =>
      vscode.commands.executeCommand("workbench.action.openWalkthrough", `${context.extension.id}#airCanada.preflight`, false),
    ),
  );

  registerNotifications(context);
}

export function deactivate(): void {
  // subscriptions handle cleanup
}

async function enableRecommendedSettings(): Promise<void> {
  const editor = vscode.workspace.getConfiguration("editor");
  const target = vscode.ConfigurationTarget.Global;
  await Promise.all([
    editor.update("bracketPairColorization.enabled", true, target),
    editor.update("guides.bracketPairs", "active", target),
    editor.update("semanticHighlighting.enabled", true, target),
  ]);
  void vscode.window.setStatusBarMessage("✈ Approach lights on — bracket colours and semantic highlighting enabled", 6000);
}
