import * as vscode from 'vscode';

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
}