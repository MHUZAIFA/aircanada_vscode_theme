import * as vscode from "vscode";

/** Minimal slice of the built-in Git extension API we rely on. */
interface GitApi {
  repositories: Array<{ state: { HEAD?: { name?: string } } }>;
}
interface GitExtension {
  getAPI(version: 1): GitApi;
}

/** Current branch of the first repository, or undefined if git isn't available. */
export async function currentBranch(): Promise<string | undefined> {
  try {
    const ext = vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!ext) return undefined;
    const exports = ext.isActive ? ext.exports : await ext.activate();
    const api = exports.getAPI(1);
    return api.repositories[0]?.state.HEAD?.name;
  } catch {
    return undefined;
  }
}
