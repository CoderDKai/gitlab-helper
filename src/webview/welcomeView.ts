import * as vscode from 'vscode';
import { GitLabAuthManager } from '../utils/authManager';

export class WelcomeWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'gitlabHelperWelcome';
    private _view?: vscode.WebviewView;
    private _authManager: GitLabAuthManager;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        authManager: GitLabAuthManager
    ) {
        this._authManager = authManager;
        this._authManager.onDidChangeAuthentication(() => {
            if (this._view) {
                this.updateView();
            }
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'login':
                    await this.handleLogin();
                    break;
                case 'logout':
                    await this._authManager.logout();
                    break;
            }
        });
    }

    private async handleLogin(): Promise<void> {
        // 首先输入 GitLab 实例地址
        const gitlabUrl = await vscode.window.showInputBox({
            prompt: '请输入您的 GitLab 实例 URL',
            placeHolder: 'https://gitlab.com',
            ignoreFocusOut: true
        });

        // 处理实例地址
        const instanceUrl = this.normalizeUrl(gitlabUrl || 'https://gitlab.com');

        // 然后输入 Access Token
        const token = await vscode.window.showInputBox({
            prompt: '请输入您的 GitLab Personal Access Token',
            placeHolder: 'glpat-xxxxxxxxxxxx',
            password: true,
            ignoreFocusOut: true
        });

        if (!token) {
            return; // 用户取消
        }

        // 尝试登录
        const credentials = {
            token,
            url: instanceUrl
        };

        try {
            const user = await this._authManager.validateToken(credentials);
            if (user) {
                await this._authManager.saveCredentials(credentials);
                vscode.window.showInformationMessage(`成功以 ${user.name} (${user.username}) 的身份登录 GitLab`);
            } else {
                vscode.window.showErrorMessage('无效的 GitLab Personal Access Token');
            }
        } catch (error) {
            vscode.window.showErrorMessage('GitLab 认证失败: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    // 规范化 URL，移除结尾的斜杠
    private normalizeUrl(url: string): string {
        return url.replace(/\/+$/, '');
    }

    private updateView(): void {
        if (this._view) {
            this._view.webview.html = this.getHtmlForWebview(this._view.webview);
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        if (this._authManager.isAuthenticated) {
            return this.getLoggedInHtml();
        } else {
            return this.getLoginHtml();
        }
    }

    private getLoginHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .title {
                    font-size: 1.2em;
                    margin-bottom: 20px;
                    font-weight: 500;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    font-size: 0.9em;
                    cursor: pointer;
                    border-radius: 2px;
                    margin-top: 10px;
                    min-width: 120px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .container {
                    max-width: 300px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <p class="title">Welcome to the GitLab Helper extension!</p>
                <button id="loginButton">登录到 GitLab</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('loginButton').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'login'
                    });
                });
            </script>
        </body>
        </html>`;
    }

    private getLoggedInHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                }
            </style>
        </head>
        <body>
            <div>
                <!-- 登录成功后的内容将在这里展示 -->
            </div>
        </body>
        </html>`;
    }
} 