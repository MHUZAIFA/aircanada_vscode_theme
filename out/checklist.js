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
exports.Checklist = void 0;
const vscode = __importStar(require("vscode"));
const KEY = "airCanada.checklist.tasks";
/**
 * "Flight Plan" — per-workspace task checklist store. Rendered by the Flight
 * Deck webview; this class only owns the data and the prompts.
 */
class Checklist {
    constructor(context) {
        this.context = context;
        this.emitter = new vscode.EventEmitter();
        this.onDidChange = this.emitter.event;
        this.updateContext();
    }
    get store() {
        return vscode.workspace.workspaceFolders?.length ? this.context.workspaceState : this.context.globalState;
    }
    /** Open tasks first (oldest at top), landed tasks after (most recent first). */
    get tasks() {
        const all = this.store.get(KEY, []);
        const open = all.filter((t) => !t.done).sort((a, b) => a.createdAt - b.createdAt);
        const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
        return [...open, ...done];
    }
    get openCount() {
        return this.tasks.filter((t) => !t.done).length;
    }
    find(arg) {
        const id = typeof arg === "string" ? arg : arg?.id;
        return this.tasks.find((t) => t.id === id);
    }
    async save(tasks) {
        await this.store.update(KEY, tasks);
        this.updateContext();
        this.emitter.fire();
    }
    // ------------------------------------------------------------ actions
    async add(title) {
        if (!title) {
            title = await vscode.window.showInputBox({
                title: "Flight plan — add task",
                placeHolder: "e.g. Fix the baggage-claim race condition",
                validateInput: (v) => (v.trim() ? undefined : "Task can't be empty"),
            });
        }
        if (!title?.trim())
            return;
        const task = {
            id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            title: title.trim(),
            done: false,
            createdAt: Date.now(),
        };
        await this.save([...this.tasks, task]);
    }
    async edit(arg) {
        const task = this.find(arg);
        if (!task)
            return;
        const title = await vscode.window.showInputBox({ title: "Edit task", value: task.title, validateInput: (v) => (v.trim() ? undefined : "Task can't be empty") });
        if (title === undefined || title.trim() === task.title)
            return;
        await this.save(this.tasks.map((t) => (t.id === task.id ? { ...t, title: title.trim() } : t)));
    }
    async toggle(arg) {
        const task = this.find(arg);
        if (task)
            await this.setDone(task.id, !task.done);
    }
    async setDone(id, done) {
        await this.save(this.tasks.map((t) => (t.id === id ? { ...t, done, doneAt: done ? Date.now() : undefined } : t)));
    }
    async remove(arg) {
        const task = this.find(arg);
        if (task)
            await this.save(this.tasks.filter((t) => t.id !== task.id));
    }
    async clearDone() {
        const n = this.tasks.filter((t) => t.done).length;
        if (!n)
            return;
        const ok = await vscode.window.showWarningMessage(`Remove ${n} landed task${n === 1 ? "" : "s"}?`, { modal: true }, "Remove");
        if (ok !== "Remove")
            return;
        await this.save(this.tasks.filter((t) => !t.done));
    }
    async clearAll() {
        if (!this.tasks.length)
            return;
        const ok = await vscode.window.showWarningMessage("Clear the whole flight plan?", { modal: true }, "Clear");
        if (ok !== "Clear")
            return;
        await this.save([]);
    }
    updateContext() {
        void vscode.commands.executeCommand("setContext", "airCanada.checklist.hasDone", this.tasks.some((t) => t.done));
    }
    dispose() {
        this.emitter.dispose();
    }
}
exports.Checklist = Checklist;
//# sourceMappingURL=checklist.js.map