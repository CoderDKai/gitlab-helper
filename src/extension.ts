// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { WelcomeWebviewProvider } from './webview/welcomeView';
import { GitLabAuthManager } from './utils/authManager';
import { GitLabApiService } from './utils/gitlabApi';
import { registerAuthCommands } from './commands/authCommands';
import { registerTreeViewMenus } from './treeViewMenus';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gitlab-helper" is now active!');

	// 初始化认证管理器
	const authManager = new GitLabAuthManager(context);
	
	// 初始化GitLab API服务
	const gitlabApiService = new GitLabApiService(authManager);

	// 注册认证相关命令
	registerAuthCommands(context, authManager);
	
	// 注册树视图菜单
	registerTreeViewMenus(context, authManager);

	// 注册欢迎页面的 WebView
	const welcomeWebviewProvider = new WelcomeWebviewProvider(context.extensionUri, authManager, gitlabApiService);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			WelcomeWebviewProvider.viewType,
			welcomeWebviewProvider
		)
	);

	// 注册刷新MR列表命令
	context.subscriptions.push(
		vscode.commands.registerCommand('gitlab-helper.refreshMRs', () => {
			// 通知 WebView 刷新 MR 列表
			welcomeWebviewProvider.refresh();
		})
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('gitlab-helper.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from gitlab-helper!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
