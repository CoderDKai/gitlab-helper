import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitRepo {
    rootPath: string;
    remoteUrl: string | null;
    gitlabProjectId?: string;
    gitlabHost?: string;
}

/**
 * 检查是否在Git仓库中，并获取Git仓库信息
 */
export async function checkGitRepository(): Promise<GitRepo | null> {
    // 获取当前工作目录
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
    }

    try {
        const rootPath = workspaceFolders[0].uri.fsPath;
        
        // 检查是否是Git仓库
        try {
            await execAsync('git rev-parse --is-inside-work-tree', { cwd: rootPath });
        } catch (error) {
            // 不是Git仓库
            return null;
        }
        
        // 获取Git仓库根目录
        const { stdout: gitRoot } = await execAsync('git rev-parse --show-toplevel', { cwd: rootPath });
        const repoRoot = gitRoot.trim();
        
        // 获取远程仓库URL
        let remoteUrl = null;
        try {
            const { stdout } = await execAsync('git remote get-url origin', { cwd: repoRoot });
            remoteUrl = stdout.trim();
        } catch (error) {
            // 没有远程仓库
        }
        
        // 解析GitLab项目信息
        const gitlabInfo = parseGitLabInfo(remoteUrl);
        
        return {
            rootPath: repoRoot,
            remoteUrl,
            ...gitlabInfo
        };
    } catch (error) {
        console.error('Failed to check Git repository:', error);
        return null;
    }
}

/**
 * 从Git远程URL解析GitLab项目信息
 */
function parseGitLabInfo(remoteUrl: string | null): { gitlabProjectId?: string, gitlabHost?: string } {
    if (!remoteUrl) {
        return {};
    }
    
    // 支持HTTP和SSH格式的GitLab URL
    // HTTP: https://gitlab.com/namespace/project.git
    // SSH: git@gitlab.com:namespace/project.git
    
    try {
        let gitlabHost = '';
        let projectPath = '';
        
        if (remoteUrl.startsWith('http')) {
            // HTTP URL
            const url = new URL(remoteUrl);
            gitlabHost = url.origin;
            projectPath = url.pathname.replace(/\.git$/, '').replace(/^\//, '');
        } else if (remoteUrl.startsWith('git@')) {
            // SSH URL
            const match = remoteUrl.match(/git@([^:]+):(.+?)(?:\.git)?$/);
            if (match) {
                gitlabHost = `https://${match[1]}`;
                projectPath = match[2];
            }
        }
        
        if (gitlabHost && projectPath) {
            // GitLab API需要项目路径进行URL编码
            const encodedProjectPath = encodeURIComponent(projectPath);
            return {
                gitlabProjectId: encodedProjectPath,
                gitlabHost
            };
        }
    } catch (error) {
        console.error('Failed to parse GitLab info:', error);
    }
    
    return {};
} 