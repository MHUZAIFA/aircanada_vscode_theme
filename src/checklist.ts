import * as vscode from "vscode";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  doneAt?: number;
}

const KEY = "airCanada.checklist.tasks";

/**
 * "Flight Plan" — per-workspace task checklist store. Rendered by the Flight
 * Deck webview; this class only owns the data and the prompts.
 */
export class Checklist implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.updateContext();
  }

  private get store(): vscode.Memento {
    return vscode.workspace.workspaceFolders?.length ? this.context.workspaceState : this.context.globalState;
  }

  /** Open tasks first (oldest at top), landed tasks after (most recent first). */
  get tasks(): Task[] {
    const all = this.store.get<Task[]>(KEY, []);
    const open = all.filter((t) => !t.done).sort((a, b) => a.createdAt - b.createdAt);
    const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
    return [...open, ...done];
  }
  get openCount(): number {
    return this.tasks.filter((t) => !t.done).length;
  }

  private find(arg: Task | string): Task | undefined {
    const id = typeof arg === "string" ? arg : arg?.id;
    return this.tasks.find((t) => t.id === id);
  }

  private async save(tasks: Task[]): Promise<void> {
    await this.store.update(KEY, tasks);
    this.updateContext();
    this.emitter.fire();
  }

  // ------------------------------------------------------------ actions

  async add(title?: string): Promise<void> {
    if (!title) {
      title = await vscode.window.showInputBox({
        title: "Flight plan — add task",
        placeHolder: "e.g. Fix the baggage-claim race condition",
        validateInput: (v) => (v.trim() ? undefined : "Task can't be empty"),
      });
    }
    if (!title?.trim()) return;
    const task: Task = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      done: false,
      createdAt: Date.now(),
    };
    await this.save([...this.tasks, task]);
  }

  async edit(arg: Task | string): Promise<void> {
    const task = this.find(arg);
    if (!task) return;
    const title = await vscode.window.showInputBox({ title: "Edit task", value: task.title, validateInput: (v) => (v.trim() ? undefined : "Task can't be empty") });
    if (title === undefined || title.trim() === task.title) return;
    await this.save(this.tasks.map((t) => (t.id === task.id ? { ...t, title: title.trim() } : t)));
  }

  async toggle(arg: Task | string): Promise<void> {
    const task = this.find(arg);
    if (task) await this.setDone(task.id, !task.done);
  }

  async setDone(id: string, done: boolean): Promise<void> {
    await this.save(this.tasks.map((t) => (t.id === id ? { ...t, done, doneAt: done ? Date.now() : undefined } : t)));
  }

  async remove(arg: Task | string): Promise<void> {
    const task = this.find(arg);
    if (task) await this.save(this.tasks.filter((t) => t.id !== task.id));
  }

  async clearDone(): Promise<void> {
    const n = this.tasks.filter((t) => t.done).length;
    if (!n) return;
    const ok = await vscode.window.showWarningMessage(`Remove ${n} landed task${n === 1 ? "" : "s"}?`, { modal: true }, "Remove");
    if (ok !== "Remove") return;
    await this.save(this.tasks.filter((t) => !t.done));
  }

  async clearAll(): Promise<void> {
    if (!this.tasks.length) return;
    const ok = await vscode.window.showWarningMessage("Clear the whole flight plan?", { modal: true }, "Clear");
    if (ok !== "Clear") return;
    await this.save([]);
  }

  private updateContext(): void {
    void vscode.commands.executeCommand("setContext", "airCanada.checklist.hasDone", this.tasks.some((t) => t.done));
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
