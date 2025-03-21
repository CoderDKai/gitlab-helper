import * as vscode from 'vscode';
import { GitLabCredentials, GitLabUser } from '../types/gitlab';

const SECRET_STORAGE_KEY = 'gitlab-credentials';
const GITLAB_API_URL = 'https://gitlab.com/api/v4';

export class GitLabAuthManager {
    private context: vscode.ExtensionContext;
    private _credentials: GitLabCredentials | undefined;
    private _onDidChangeAuthentication = new vscode.EventEmitter<void>();
    
    readonly onDidChangeAuthentication = this._onDidChangeAuthentication.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadCredentials();
    }

    private async loadCredentials(): Promise<void> {
        try {
            const savedCredentials = await this.context.secrets.get(SECRET_STORAGE_KEY);
            if (savedCredentials) {
                this._credentials = JSON.parse(savedCredentials);
            }
        } catch (error) {
            console.error('Failed to load GitLab credentials:', error);
        }
    }

    public get isAuthenticated(): boolean {
        return !!this._credentials?.token;
    }

    public async authenticate(): Promise<boolean> {
        const token = await vscode.window.showInputBox({
            prompt: '请输入您的 GitLab Personal Access Token',
            placeHolder: 'glpat-xxxxxxxxxxxx',
            password: true,
            ignoreFocusOut: true
        });

        if (!token) {
            return false;
        }

        const gitlabUrl = await vscode.window.showInputBox({
            prompt: '请输入您的 GitLab 实例 URL (可选，默认为 https://gitlab.com)',
            placeHolder: 'https://gitlab.com',
            ignoreFocusOut: true
        });

        const instanceUrl = this.normalizeUrl(gitlabUrl || 'https://gitlab.com');

        const credentials: GitLabCredentials = {
            token,
            url: instanceUrl
        };

        // 验证 token 是否有效
        try {
            const user = await this.validateToken(credentials);
            if (user) {
                await this.saveCredentials(credentials);
                vscode.window.showInformationMessage(`成功以 ${user.name} (${user.username}) 的身份登录 GitLab`);
                return true;
            } else {
                vscode.window.showErrorMessage('无效的 GitLab Personal Access Token');
                return false;
            }
        } catch (error) {
            console.error('GitLab 认证失败:', error);
            vscode.window.showErrorMessage('GitLab 认证失败: ' + (error instanceof Error ? error.message : String(error)));
            return false;
        }
    }

    // 规范化 URL，移除结尾的斜杠
    private normalizeUrl(url: string): string {
        return url.replace(/\/+$/, '');
    }

    public async validateToken(credentials: GitLabCredentials): Promise<GitLabUser | null> {
        const baseUrl = this.normalizeUrl(credentials.url || 'https://gitlab.com');
        const apiUrl = `${baseUrl}/api/v4`;
        
        try {
            const response = await fetch(`${apiUrl}/user`, {
                headers: {
                    'Private-Token': credentials.token
                }
            });

            if (!response.ok) {
                throw new Error(`GitLab API 返回错误: ${response.status}`);
            }

            return await response.json() as GitLabUser;
        } catch (error) {
            console.error('验证 GitLab token 失败:', error);
            throw new Error('无法连接到 GitLab API');
        }
    }

    public async saveCredentials(credentials: GitLabCredentials): Promise<void> {
        try {
            // 确保 URL 格式正确
            const normalizedCredentials = {
                ...credentials,
                url: this.normalizeUrl(credentials.url || 'https://gitlab.com')
            };
            
            await this.context.secrets.store(SECRET_STORAGE_KEY, JSON.stringify(normalizedCredentials));
            this._credentials = normalizedCredentials;
            this._onDidChangeAuthentication.fire();
        } catch (error) {
            console.error('Failed to save GitLab credentials:', error);
            throw new Error('Failed to save GitLab credentials');
        }
    }

    public async logout(): Promise<void> {
        try {
            await this.context.secrets.delete(SECRET_STORAGE_KEY);
            this._credentials = undefined;
            this._onDidChangeAuthentication.fire();
            vscode.window.showInformationMessage('已成功登出 GitLab');
        } catch (error) {
            console.error('Failed to logout:', error);
            throw new Error('Failed to logout');
        }
    }

    public async getCurrentUser(): Promise<GitLabUser | null> {
        if (!this.isAuthenticated) {
            return null;
        }

        return this.validateToken(this._credentials!);
    }

    public getApiUrl(): string {
        if (!this._credentials?.url) {
            return GITLAB_API_URL;
        }
        return `${this.normalizeUrl(this._credentials.url)}/api/v4`;
    }

    public getToken(): string | undefined {
        return this._credentials?.token;
    }
} 