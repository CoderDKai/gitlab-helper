import * as vscode from 'vscode';
import { GitLabService } from '../services/GitLabService';

export class MergeRequestCommand {
  static register(context: vscode.ExtensionContext) {
    return vscode.commands.registerCommand('gitlab-helper.createNewMergeRequest', async () => {
      const gitlabService = await GitLabService.getInstance();
      const branches = await gitlabService.getBranches({
        per_page: 100,
      });
      console.log(branches);
    });
  }
}