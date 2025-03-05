import * as vscode from 'vscode';
import { GitLabService } from '../services/GitLabService';

export class ProjectCommand {
  static register(context: vscode.ExtensionContext) {
    return vscode.commands.registerCommand('gitlab-helper.projects', async () => {
      const outputChannel = vscode.window.createOutputChannel('Gitlab Projects');
      outputChannel.show();

      try {
        const gitlabService = new GitLabService();
        await gitlabService.init();
        const projects = await gitlabService.getProjects();
        outputChannel.appendLine('获取项目列表成功');
        for (const project of projects) {
          outputChannel.appendLine(`- ${project.name}`);
        }
        vscode.window.showInformationMessage(`获取到${projects.length}个项目`);
      }
      catch (error) {
        vscode.window.showErrorMessage('获取项目列表失败');
        outputChannel.appendLine(`错误: ${error}`);
      }
    });
  }
  
}