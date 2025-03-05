import * as vscode from 'vscode';
import { ProjectCommand } from './commands/ProjectCommand';

export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		ProjectCommand.register(context)
	);
}

export function deactivate() {}
