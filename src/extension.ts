import * as vscode from 'vscode';
import { MergeRequestCommand } from './commands/MergeCommand';

export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		MergeRequestCommand.register(context),
	);
}

export function deactivate() {}
