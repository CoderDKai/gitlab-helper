import * as vscode from 'vscode';
import { GitService } from '../services/GitService';

export class GitCommand {
  static register(context: vscode.ExtensionContext) {
    return vscode.commands.registerCommand('gitlab-helper.git', async () => {
      const gitService = new GitService();
      const branches = await gitService.getBranches();
      console.log(branches);
    });
  }
}