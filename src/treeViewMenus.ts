import * as vscode from 'vscode';
import { GitLabAuthManager } from './utils/authManager';

export function registerTreeViewMenus(context: vscode.ExtensionContext, authManager: GitLabAuthManager) {
    // 设置按钮
    const settingsCommand = vscode.commands.registerCommand('gitlab-helper.viewMenu.settings', async () => {
        const items: vscode.QuickPickItem[] = [
            { 
                label: '退出登录',
                description: '退出当前 GitLab 账号',
                detail: authManager.isAuthenticated ? '您当前已登录 GitLab' : '您当前未登录 GitLab'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            title: 'GitLab 助手设置',
            placeHolder: '请选择设置选项'
        });

        if (selected) {
            if (selected.label === '退出登录') {
                await logout();
            }
        }
    });

    // 退出登录命令
    const logoutCommand = vscode.commands.registerCommand('gitlab-helper.viewMenu.logout', logout);

    // 退出登录函数
    async function logout() {
        if (authManager.isAuthenticated) {
            const action = await vscode.window.showWarningMessage(
                '确定要登出 GitLab 吗？',
                '确定',
                '取消'
            );

            if (action === '确定') {
                await authManager.logout();
            }
        } else {
            vscode.window.showInformationMessage('您当前未登录 GitLab');
        }
    }

    context.subscriptions.push(settingsCommand, logoutCommand);
} 