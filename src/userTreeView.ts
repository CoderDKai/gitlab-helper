import * as vscode from 'vscode';
import { GitLabAuthManager } from './utils/authManager';
import { GitLabUser } from './types/gitlab';

export class UserTreeProvider implements vscode.TreeDataProvider<UserTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<UserTreeItem | undefined | null | void> = new vscode.EventEmitter<UserTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<UserTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private authManager: GitLabAuthManager;
    private currentUser: GitLabUser | null = null;

    constructor(authManager: GitLabAuthManager) {
        this.authManager = authManager;
        
        // 监听认证状态变化
        this.authManager.onDidChangeAuthentication(() => {
            this.refresh();
        });
        
        // 初始加载用户信息
        this.loadUserInfo();
    }

    private async loadUserInfo(): Promise<void> {
        if (this.authManager.isAuthenticated) {
            this.currentUser = await this.authManager.getCurrentUser();
        } else {
            this.currentUser = null;
        }
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: UserTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<UserTreeItem[]> {
        if (this.authManager.isAuthenticated) {
            if (!this.currentUser) {
                try {
                    this.currentUser = await this.authManager.getCurrentUser();
                } catch (error) {
                    // 处理获取用户信息失败的情况
                    vscode.window.showErrorMessage(`获取用户信息失败: ${error instanceof Error ? error.message : String(error)}`);
                    return [new NotLoggedInItem()];
                }
            }

            if (this.currentUser) {
                const userItem = new UserProfileItem(this.currentUser);
                const logoutItem = new LogoutItem();
                return [userItem, logoutItem];
            }
        }

        return [new NotLoggedInItem()];
    }
}

class UserTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = label;
    }
}

class UserProfileItem extends UserTreeItem {
    constructor(user: GitLabUser) {
        super(
            `${user.name} (${user.username})`,
            'user-profile',
            vscode.TreeItemCollapsibleState.None
        );
        
        this.description = '已登录';
        this.iconPath = user.avatar_url 
            ? vscode.Uri.parse(user.avatar_url) 
            : new vscode.ThemeIcon('account');
            
        this.contextValue = 'userLoggedIn';
    }
}

class LogoutItem extends UserTreeItem {
    constructor() {
        super(
            '登出 GitLab',
            'logout',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'gitlab-helper.logout',
                title: '登出 GitLab'
            }
        );
        
        this.iconPath = new vscode.ThemeIcon('sign-out');
        this.contextValue = 'logoutAction';
    }
}

class NotLoggedInItem extends UserTreeItem {
    constructor() {
        super(
            '登录到 GitLab',
            'login',
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'gitlab-helper.login',
                title: '登录到 GitLab'
            }
        );
        
        this.iconPath = new vscode.ThemeIcon('sign-in');
        this.contextValue = 'loginAction';
    }
} 