import * as vscode from 'vscode';
import { GitLabAuthManager } from '../utils/authManager';

export function registerAuthCommands(context: vscode.ExtensionContext, authManager: GitLabAuthManager): void {
    // 注册登录命令
    const loginCommand = vscode.commands.registerCommand('gitlab-helper.login', async () => {
        if (authManager.isAuthenticated) {
            const action = await vscode.window.showInformationMessage(
                '您已经登录到 GitLab。是否要切换账号？',
                '切换账号',
                '取消'
            );

            if (action !== '切换账号') {
                return;
            }

            await authManager.logout();
        }

        await authManager.authenticate();
    });

    // 注册登出命令
    const logoutCommand = vscode.commands.registerCommand('gitlab-helper.logout', async () => {
        if (!authManager.isAuthenticated) {
            vscode.window.showInformationMessage('您当前未登录 GitLab');
            return;
        }

        const action = await vscode.window.showWarningMessage(
            '确定要登出 GitLab 吗？',
            '确定',
            '取消'
        );

        if (action === '确定') {
            await authManager.logout();
        }
    });

    // 添加到上下文中
    context.subscriptions.push(loginCommand, logoutCommand);
} 