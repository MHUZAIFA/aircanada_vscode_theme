"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const checklist_1 = require("./checklist");
const flightTracker_1 = require("./flightTracker");
const flyby_1 = require("./flyby");
const meetings_1 = require("./meetings");
const notifications_1 = require("./notifications");
const sessionView_1 = require("./sessionView");
function activate(context) {
    const tracker = new flightTracker_1.FlightTracker(context);
    const checklist = new checklist_1.Checklist(context);
    const flyby = new flyby_1.Flyby(context);
    const meetings = new meetings_1.Meetings(context, flyby);
    const deck = new sessionView_1.FlightDeckView(context, tracker, checklist, meetings);
    context.subscriptions.push(tracker, checklist, flyby, meetings, deck, vscode.window.registerWebviewViewProvider(sessionView_1.FlightDeckView.viewId, deck, { webviewOptions: { retainContextWhenHidden: true } }), 
    // --- flight (coding session) ---------------------------------------
    vscode.commands.registerCommand("airCanada.flight.openDeck", () => vscode.commands.executeCommand("airCanada.session.focus")), vscode.commands.registerCommand("airCanada.flight.board", () => tracker.board()), vscode.commands.registerCommand("airCanada.flight.start", (minutes) => tracker.start(typeof minutes === "number" ? minutes : undefined)), vscode.commands.registerCommand("airCanada.flight.pause", () => tracker.pause()), vscode.commands.registerCommand("airCanada.flight.resume", () => tracker.resume()), vscode.commands.registerCommand("airCanada.flight.toggle", () => tracker.toggle()), vscode.commands.registerCommand("airCanada.flight.reset", () => tracker.reset()), vscode.commands.registerCommand("airCanada.flight.cancel", () => tracker.cancel()), vscode.commands.registerCommand("airCanada.flight.extend", (minutes) => tracker.extend(typeof minutes === "number" ? minutes : 5)), vscode.commands.registerCommand("airCanada.flight.extendCustom", () => tracker.extendCustom()), vscode.commands.registerCommand("airCanada.flight.returnFlight", () => tracker.returnFlight()), vscode.commands.registerCommand("airCanada.flight.setRoute", () => tracker.setRoute()), vscode.commands.registerCommand("airCanada.flight.setDuration", () => tracker.setDuration()), vscode.commands.registerCommand("airCanada.flight.setAircraft", () => tracker.setAircraft()), 
    // --- flight plan (tasks) -------------------------------------------
    vscode.commands.registerCommand("airCanada.checklist.add", () => checklist.add()), vscode.commands.registerCommand("airCanada.checklist.edit", (t) => t && checklist.edit(t)), vscode.commands.registerCommand("airCanada.checklist.toggle", (t) => t && checklist.toggle(t)), vscode.commands.registerCommand("airCanada.checklist.remove", (t) => t && checklist.remove(t)), vscode.commands.registerCommand("airCanada.checklist.clearDone", () => checklist.clearDone()), vscode.commands.registerCommand("airCanada.checklist.clearAll", () => checklist.clearAll()), 
    // --- meeting reminders (manual, no calendar sync) ------------------
    vscode.commands.registerCommand("airCanada.meetings.add", () => meetings.add()), vscode.commands.registerCommand("airCanada.meetings.edit", (r) => r && meetings.edit(r)), vscode.commands.registerCommand("airCanada.meetings.remove", (r) => r && meetings.remove(r)), vscode.commands.registerCommand("airCanada.meetings.preview", (r) => r && meetings.preview(r)), vscode.commands.registerCommand("airCanada.meetings.join", (r) => r && meetings.join(r)), vscode.commands.registerCommand("airCanada.meetings.clearPast", () => meetings.clearPast()), vscode.commands.registerCommand("airCanada.meetings.demo", () => meetings.demo()), vscode.commands.registerCommand("airCanada.meetings.flybyAction", (action, cb) => cb?.(action)), 
    // --- misc ------------------------------------------------------------
    vscode.commands.registerCommand("airCanada.enableRecommendedSettings", enableRecommendedSettings), vscode.commands.registerCommand("airCanada.openPreflight", () => vscode.commands.executeCommand("workbench.action.openWalkthrough", `${context.extension.id}#airCanada.preflight`, false)));
    (0, notifications_1.registerNotifications)(context);
}
function deactivate() {
    // subscriptions handle cleanup
}
async function enableRecommendedSettings() {
    const editor = vscode.workspace.getConfiguration("editor");
    const target = vscode.ConfigurationTarget.Global;
    await Promise.all([
        editor.update("bracketPairColorization.enabled", true, target),
        editor.update("guides.bracketPairs", "active", target),
        editor.update("semanticHighlighting.enabled", true, target),
    ]);
    void vscode.window.setStatusBarMessage("✈ Approach lights on — bracket colours and semantic highlighting enabled", 6000);
}
//# sourceMappingURL=extension.js.map