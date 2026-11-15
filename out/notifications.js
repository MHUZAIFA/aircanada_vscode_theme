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
exports.registerNotifications = registerNotifications;
const vscode = __importStar(require("vscode"));
const git_1 = require("./git");
function cfg() {
    return vscode.workspace.getConfiguration("airCanada.notifications");
}
function on(key) {
    return cfg().get("enabled", true) && cfg().get(key, true);
}
/** Cockpit-style announcements for workspace open, tasks and debug sessions. */
function registerNotifications(context) {
    void welcome();
    context.subscriptions.push(vscode.tasks.onDidEndTaskProcess((e) => {
        if (!on("tasks"))
            return;
        const name = e.execution.task.name;
        if (e.exitCode === 0) {
            void vscode.window.setStatusBarMessage(`✈ Wheels up — "${name}" completed`, 6000);
            return;
        }
        void vscode.window
            .showWarningMessage(`✈ Go-around — "${name}" exited with code ${e.exitCode ?? "?"}`, "Show Problems", "Show Terminal")
            .then((choice) => {
            if (choice === "Show Problems")
                void vscode.commands.executeCommand("workbench.actions.view.problems");
            if (choice === "Show Terminal")
                void vscode.commands.executeCommand("workbench.action.terminal.focus");
        });
    }), vscode.debug.onDidStartDebugSession((s) => {
        if (on("debug"))
            void vscode.window.setStatusBarMessage(`✈ Cleared for takeoff — debugging "${s.name}"`, 5000);
    }), vscode.debug.onDidTerminateDebugSession((s) => {
        if (on("debug"))
            void vscode.window.setStatusBarMessage(`✈ Landed — "${s.name}" ended`, 5000);
    }));
}
async function welcome() {
    if (!on("welcome"))
        return;
    if (!vscode.workspace.workspaceFolders?.length)
        return;
    const branch = await (0, git_1.currentBranch)();
    const flight = branch ? ` Flight **${branch}** is ready for departure.` : "";
    const choice = await vscode.window.showInformationMessage(`✈ Boarding complete — welcome aboard.${flight}`, "Pre-flight checklist", "Don't show again");
    if (choice === "Don't show again") {
        await cfg().update("welcome", false, vscode.ConfigurationTarget.Global);
    }
    else if (choice === "Pre-flight checklist") {
        void vscode.commands.executeCommand("airCanada.openPreflight");
    }
}
//# sourceMappingURL=notifications.js.map