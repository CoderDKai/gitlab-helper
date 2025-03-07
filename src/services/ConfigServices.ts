import * as vscode from 'vscode';
import { GetBranchesRequest } from './gitlab-api';
import * as cp from 'child_process';

export class ConfigService {
  static async getGitlabToken(): Promise<string> {
    const config = vscode.workspace.getConfiguration('gitlabHelper');
    let token = config.get<string>('personalToken');
    
    if (!token) {
      token = await vscode.window.showInputBox({
        prompt: '请输入您的 GitLab 个人访问令牌(需要api权限)',
        ignoreFocusOut: true,
      });

      if (token) {
        await config.update('personalToken', token, true);
      }
    }
    return token || '';
  }

  static async getGitlabBaseUrl(): Promise<string> {
    const config = vscode.workspace.getConfiguration('gitlabHelper');
    const baseUrl = config.get<string>('instanceUrl');
    if (!baseUrl) {
      const result = await vscode.window.showInputBox({
        prompt: '请输入您的GitLab服务器实例的URL',
        value: 'https://gitlab.com',
        ignoreFocusOut: true,
      });

      if (result) {
        await config.update('instanceUrl', result.endsWith('/') ? result.slice(0, -1) : result, true);
      }
    }
    return baseUrl || 'https://gitlab.com';
  }

  
  // 获取git远程仓库的url
  private static getGitRemoteUrl(repoPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cp.exec('git remote get-url origin', {cwd: repoPath}, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  // 从git远程仓库的url中提取项目id
  private static async extractEncodedProjectIdFromUrl(url: string): Promise<string> {
    const baseURL = await ConfigService.getGitlabBaseUrl();
    const hostname = new URL(baseURL).hostname;
    // 支持两种格式
    // 1. SSH: git@gitlab.com:username/project-name.git
    // 2. HTTP: https://gitlab.com/username/project-name.git
    const regex = new RegExp(`${hostname}[/:](.+?)\\.git$`);
    const match = url.match(regex);
    if (match && match[1]) {
      return encodeURIComponent(match[1]);
    }
    return '';
  }

  static async getURLEncodedProjectId() {
    const rootPath = vscode.workspace.rootPath;
    if (!rootPath) {
      return '';
    }
    const gitRemoteUrl = await ConfigService.getGitRemoteUrl(rootPath);
    const encodedProjectId = await ConfigService.extractEncodedProjectIdFromUrl(gitRemoteUrl);
    return encodedProjectId;
  }
}