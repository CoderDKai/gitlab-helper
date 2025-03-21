import * as vscode from 'vscode';
import { GitLabAuthManager } from '../utils/authManager';
import { GitLabApiService } from '../utils/gitlabApi';
import { MergeRequest, MergeRequestFilterOptions, MergeRequestState } from '../types/gitlab';
import { checkGitRepository } from '../utils/gitUtils';

export class WelcomeWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'gitlabHelperWelcome';
    private _view?: vscode.WebviewView;
    private _authManager: GitLabAuthManager;
    private _apiService: GitLabApiService;
    private _currentMRs: MergeRequest[] = [];
    private _currentFilter: MergeRequestFilterOptions = {
        state: 'opened',
        sort: 'desc',
        orderBy: 'updated_at'
    };
    private _gitRepository: Awaited<ReturnType<typeof checkGitRepository>> = null;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        authManager: GitLabAuthManager,
        apiService: GitLabApiService
    ) {
        this._authManager = authManager;
        this._apiService = apiService;
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

        // 初始化视图
        this.initializeView();

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'login':
                    await this.handleLogin();
                    break;
                case 'logout':
                    await this._authManager.logout();
                    break;
                case 'refresh':
                    await this.refresh();
                    break;
                case 'openMR':
                    if (message.url) {
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                    }
                    break;
                case 'filterState':
                    if (message.state) {
                        this._currentFilter.state = message.state;
                        await this.loadMergeRequests();
                    }
                    break;
            }
        });
    }

    private async initializeView(): Promise<void> {
        if (!this._view) {
            return;
        }

        // 检查Git仓库
        this._gitRepository = await checkGitRepository();
        
        // 更新视图内容
        this._view.webview.html = this.getHtmlForWebview();
        
        // 如果已登录且有Git仓库，加载MR列表
        if (this._authManager.isAuthenticated && this._gitRepository) {
            await this.loadMergeRequests();
        }
    }

    private async loadMergeRequests(): Promise<void> {
        if (!this._view || !this._gitRepository) {
            return;
        }

        try {
            // 通知前端显示加载状态
            this._view.webview.postMessage({
                command: 'loading',
                loading: true
            });

            // 获取当前仓库的MR列表
            this._currentMRs = await this._apiService.getCurrentRepositoryMergeRequests(
                this._gitRepository,
                this._currentFilter
            );
            
            // 发送MR列表到前端
            this._view.webview.postMessage({
                command: 'updateMRs',
                mergeRequests: this._currentMRs
            });
        } catch (error) {
            console.error('加载MR列表失败:', error);
            vscode.window.showErrorMessage('加载MR列表失败: ' + (error instanceof Error ? error.message : String(error)));
            // 通知前端显示错误状态
            this._view.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        } finally {
            // 通知前端隐藏加载状态
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'loading',
                    loading: false
                });
            }
        }
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
                
                // 登录成功后重新初始化视图
                await this.initializeView();
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
            this._view.webview.html = this.getHtmlForWebview();
        }
    }

    // 添加刷新方法，供外部调用
    public refresh(): void {
        this.initializeView();
    }

    private getHtmlForWebview(): string {
        if (!this._authManager.isAuthenticated) {
            return this.getLoginHtml();
        }
        
        if (!this._gitRepository) {
            return this.getNoGitHtml();
        }
        
        return this.getMRListHtml();
    }

    private getLoginHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GitLab Helper</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 15px;
                    font-size: 13px;
                }
                .login-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 20px 0;
                }
                .title {
                    font-size: 14px;
                    margin-bottom: 20px;
                    font-weight: 500;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    border-radius: 2px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <p class="title">使用 GitLab 账号登录以查看 Merge Requests</p>
                <button id="loginButton">登录到 GitLab</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('loginButton').addEventListener('click', () => {
                    vscode.postMessage({ command: 'login' });
                });
            </script>
        </body>
        </html>`;
    }

    private getNoGitHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GitLab Helper</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 15px;
                    font-size: 13px;
                }
                .no-git-container {
                    padding: 20px 0;
                }
                .message {
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 10px;
                }
                .title {
                    font-size: 14px;
                    margin-bottom: 15px;
                    font-weight: 500;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    border-radius: 2px;
                    margin-top: 10px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="no-git-container">
                <h3 class="title">无法获取 Merge Requests</h3>
                <p class="message">当前工作区没有有效的 Git 仓库，或者无法识别为 GitLab 项目。</p>
                <p class="message">请打开包含 GitLab 仓库的工作区，然后刷新。</p>
                <button id="refreshButton">刷新</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('refreshButton').addEventListener('click', () => {
                    vscode.postMessage({ command: 'refresh' });
                });
            </script>
        </body>
        </html>`;
    }

    private getMRListHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GitLab Merge Requests</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 0;
                    margin: 0;
                    font-size: 13px;
                    height: 100vh;
                    overflow: hidden;
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 10px;
                    background-color: var(--vscode-sideBarSectionHeader-background);
                    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
                }
                .header-title {
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                }
                .header-actions {
                    display: flex;
                    gap: 8px;
                }
                .header-actions button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--vscode-foreground);
                    opacity: 0.7;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 16px;
                    height: 16px;
                }
                .header-actions button:hover {
                    opacity: 1;
                }
                .filter-bar {
                    display: flex;
                    padding: 4px 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    background-color: var(--vscode-sideBar-background);
                }
                .filter-item {
                    padding: 2px 8px;
                    cursor: pointer;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .filter-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .filter-item.active {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }
                .mr-section {
                    overflow-y: auto;
                    flex-grow: 1;
                }
                .mr-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .mr-item {
                    padding: 8px 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .mr-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .mr-title {
                    font-weight: 500;
                    word-break: break-all;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .mr-detail {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                .mr-branches {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .mr-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .mr-status {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .mr-status-badge {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                }
                .mr-status-badge.opened {
                    background-color: #2da44e;
                }
                .mr-status-badge.merged {
                    background-color: #8250df;
                }
                .mr-status-badge.closed {
                    background-color: #cf222e;
                }
                .mr-status-badge.draft {
                    background-color: #6e7781;
                }
                .mr-author {
                    color: var(--vscode-foreground);
                    font-weight: 500;
                }
                .empty-message {
                    padding: 20px;
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                }
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.2);
                    display: none;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .loading-spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: var(--vscode-button-background);
                    animation: spin 1s ease-in-out infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .error-message {
                    padding: 10px;
                    color: var(--vscode-errorForeground);
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    margin: 10px;
                    border-radius: 3px;
                    display: none;
                }
                .icon {
                    width: 16px;
                    height: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .arrow-icon {
                    font-family: monospace;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="header-title">Merge Requests</div>
                    <div class="header-actions">
                        <button title="刷新" id="refresh-button">
                            <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <path d="M13.45 6.22a5.16 5.16 0 00-9.32-1.37A5.6 5.6 0 003 7H1a7.5 7.5 0 0113.74-2.73A7.56 7.56 0 0116 8h-2c0-.6-.18-1.46-.55-1.78zM5.32 9h2.2A3.5 3.5 0 0116 8h2a5.5 5.5 0 01-11 1.34A6.15 6.15 0 016 7h2a4.2 4.2 0 00-.68 2zM5.5 7a4.5 4.5 0 014.5-4.5v1A3.5 3.5 0 006.5 7h-1z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="filter-bar">
                    <div class="filter-item active" data-state="opened">开放的</div>
                    <div class="filter-item" data-state="merged">已合并</div>
                    <div class="filter-item" data-state="closed">已关闭</div>
                </div>
                <div id="error-message" class="error-message"></div>
                <div class="mr-section">
                    <ul id="mr-list" class="mr-list">
                        <!-- MR列表将在这里动态生成 -->
                    </ul>
                    <div id="empty-message" class="empty-message" style="display: none;">
                        没有找到符合条件的 Merge Requests
                    </div>
                </div>
                <div id="loading-overlay" class="loading-overlay">
                    <div class="loading-spinner"></div>
                </div>
            </div>
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    const mrList = document.getElementById('mr-list');
                    const emptyMessage = document.getElementById('empty-message');
                    const loadingOverlay = document.getElementById('loading-overlay');
                    const errorMessage = document.getElementById('error-message');
                    const refreshButton = document.getElementById('refresh-button');
                    const filterItems = document.querySelectorAll('.filter-item');
                    
                    // 添加事件监听器
                    refreshButton.addEventListener('click', () => {
                        vscode.postMessage({ command: 'refresh' });
                    });
                    
                    // 过滤器事件
                    filterItems.forEach(item => {
                        item.addEventListener('click', () => {
                            filterItems.forEach(i => i.classList.remove('active'));
                            item.classList.add('active');
                            vscode.postMessage({
                                command: 'filterState',
                                state: item.dataset.state
                            });
                        });
                    });
                    
                    // 处理从扩展接收的消息
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.command) {
                            case 'updateMRs':
                                updateMergeRequestList(message.mergeRequests);
                                break;
                            case 'loading':
                                loadingOverlay.style.display = message.loading ? 'flex' : 'none';
                                break;
                            case 'error':
                                errorMessage.textContent = message.message;
                                errorMessage.style.display = 'block';
                                break;
                        }
                    });
                    
                    // 更新MR列表
                    function updateMergeRequestList(mergeRequests) {
                        // 清空错误消息
                        errorMessage.style.display = 'none';
                        
                        // 清空列表
                        mrList.innerHTML = '';
                        
                        // 如果没有MR，显示空消息
                        if (!mergeRequests || mergeRequests.length === 0) {
                            emptyMessage.style.display = 'block';
                            return;
                        }
                        
                        // 隐藏空消息
                        emptyMessage.style.display = 'none';
                        
                        // 添加MR到列表
                        mergeRequests.forEach(mr => {
                            const li = document.createElement('li');
                            li.className = 'mr-item';
                            li.addEventListener('click', () => {
                                vscode.postMessage({
                                    command: 'openMR',
                                    url: mr.web_url
                                });
                            });
                            
                            // 状态徽章类
                            let statusClass = mr.state;
                            let statusText = mr.state;
                            
                            // 如果是draft，添加draft标记
                            if (mr.draft) {
                                statusClass = 'draft';
                                statusText = 'Draft';
                            }
                            
                            li.innerHTML = \`
                                <div class="mr-title">\${mr.title}</div>
                                <div class="mr-detail">
                                    <div class="mr-branches">
                                        <span>\${mr.source_branch}</span>
                                        <span class="arrow-icon">→</span>
                                        <span>\${mr.target_branch}</span>
                                    </div>
                                </div>
                                <div class="mr-info">
                                    <div class="mr-status">
                                        <span class="mr-status-badge \${statusClass}"></span>
                                        <span>\${statusText}</span>
                                    </div>
                                    <div>
                                        <span class="mr-author">\${mr.author.name}</span>
                                        <span>\${formatDate(mr.created_at)}</span>
                                    </div>
                                </div>
                            \`;
                            
                            mrList.appendChild(li);
                        });
                    }
                    
                    // 日期格式化函数 - 根据距离当前时间显示不同格式
                    function formatDate(dateString) {
                        const date = new Date(dateString);
                        const now = new Date();
                        const diff = now.getTime() - date.getTime();
                        const minutes = Math.floor(diff / (1000 * 60));
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        
                        // 判断是否是同一年
                        const isCurrentYear = now.getFullYear() === date.getFullYear();
                        
                        // 年份差
                        const yearDiff = now.getFullYear() - date.getFullYear();
                        
                        // 小于1小时
                        if (minutes < 60) {
                            return minutes <= 1 ? '刚刚' : \`\${minutes}m\`;
                        }
                        
                        // 小于24小时
                        if (hours < 24) {
                            return \`\${hours}h\${minutes % 60}m\`;
                        }
                        
                        // 昨天
                        if (days === 1) {
                            return '昨天';
                        }
                        
                        // 7天内
                        if (days < 7) {
                            return \`\${days} 天前\`;
                        }
                        
                        // 两周内
                        if (days < 14) {
                            return '上周';
                        }
                        
                        // 一个月内
                        if (days < 30) {
                            return \`\${Math.floor(days / 7)} 周前\`;
                        }
                        
                        // 两个月内
                        if (days < 60) {
                            return '上个月';
                        }
                        
                        // 一年内
                        if (isCurrentYear) {
                            return \`\${Math.floor(days / 30)} 个月前\`;
                        }
                        
                        // 去年
                        if (yearDiff === 1) {
                            return '去年';
                        }
                        
                        // 多年前
                        return \`\${yearDiff} 年前\`;
                    }
                })();
            </script>
        </body>
        </html>`;
    }
} 