import * as vscode from 'vscode';

export class WelcomeTreeProvider implements vscode.TreeDataProvider<WelcomeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<WelcomeItem | undefined | null | void> = new vscode.EventEmitter<WelcomeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<WelcomeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    getTreeItem(element: WelcomeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<WelcomeItem[]> {
        const items: WelcomeItem[] = [
            new WelcomeItem(
                '欢迎使用 GitLab Helper',
                'welcome',
                vscode.TreeItemCollapsibleState.None
            ),
            new WelcomeItem(
                '开始使用',
                'getting-started',
                vscode.TreeItemCollapsibleState.None
            ),
            new WelcomeItem(
                '查看文档',
                'documentation',
                vscode.TreeItemCollapsibleState.None
            ),
        ];
        return Promise.resolve(items);
    }
}

class WelcomeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = label;
    }
} 