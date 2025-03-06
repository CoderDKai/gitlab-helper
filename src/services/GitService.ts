import * as vscode from 'vscode';
import { Branch } from './git.d';

export class GitService {
  private gitExtension = vscode.extensions.getExtension('vscode.')?.exports;

  async getBranches(): Promise<Branch[]> {
    if (!this.gitExtension) {
      vscode.window.showErrorMessage('Git 扩展未安装');
      return [];
    }
    
    // 获取 Git API, 版本 1
    const git = this.gitExtension.getAPI(1);
    const repositories = git.repositories;
    if (repositories.length === 0) {
      vscode.window.showErrorMessage('当前工作区没有打开 Git 仓库！');
      return [];
    }

    const currentRepository = repositories[0];

    const remoteBranches = await currentRepository.getBranches({
      remote: true
    });
    return remoteBranches;
  }
}