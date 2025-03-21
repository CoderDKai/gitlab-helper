import * as vscode from 'vscode';
import { GitLabAuthManager } from './authManager';
import { MergeRequest, MergeRequestFilterOptions } from '../types/gitlab';
import { GitRepo } from './gitUtils';

export interface GitLabProject {
    id: number;
    name: string;
    name_with_namespace: string;
    path: string;
    path_with_namespace: string;
    web_url: string;
    avatar_url?: string;
    description?: string;
}

export class GitLabApiService {
    private authManager: GitLabAuthManager;

    constructor(authManager: GitLabAuthManager) {
        this.authManager = authManager;
    }

    /**
     * 获取当前项目的Merge Requests列表
     * @param options 过滤选项
     * @returns Merge Requests数组
     */
    public async getMergeRequests(options: MergeRequestFilterOptions = {}): Promise<MergeRequest[]> {
        if (!this.authManager.isAuthenticated) {
            throw new Error('用户未登录');
        }

        const apiUrl = this.authManager.getApiUrl();
        const token = this.authManager.getToken();

        let endpoint = '';
        if (options.projectId) {
            // 获取特定项目的MRs
            endpoint = `${apiUrl}/projects/${options.projectId}/merge_requests`;
        } else {
            // 获取全局MRs
            endpoint = `${apiUrl}/merge_requests`;
        }

        // 构建查询参数
        const params = new URLSearchParams();
        
        if (options.state) {
            params.append('state', options.state);
        }
        
        if (options.scope) {
            params.append('scope', options.scope);
        }
        
        if (options.search) {
            params.append('search', options.search);
        }
        
        if (options.orderBy) {
            params.append('order_by', options.orderBy);
        }
        
        if (options.sort) {
            params.append('sort', options.sort);
        }

        // 添加分页参数，默认每页100条
        params.append('per_page', '100');

        const url = `${endpoint}?${params.toString()}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Private-Token': token!,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`GitLab API错误: ${response.status} ${response.statusText}`);
            }

            return await response.json() as MergeRequest[];
        } catch (error) {
            console.error('获取Merge Requests失败:', error);
            throw new Error(`获取Merge Requests失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 获取当前Git仓库的Merge Requests
     * @param gitRepo Git仓库信息
     * @param options 过滤选项
     * @returns Merge Requests数组
     */
    public async getCurrentRepositoryMergeRequests(gitRepo: GitRepo, options: MergeRequestFilterOptions = {}): Promise<MergeRequest[]> {
        if (!gitRepo.gitlabProjectId) {
            throw new Error('无法获取GitLab项目ID，请确保这是一个GitLab仓库');
        }
        // 如果用户设置的GitLab实例与Git仓库中的GitLab实例不匹配，尝试使用Git中的实例地址
        const currentApiBaseUrl = this.authManager.getCredentials()?.url;
        if (gitRepo.gitlabHost && (!currentApiBaseUrl || !gitRepo.gitlabHost.includes(currentApiBaseUrl))) {
            console.log(`Git仓库使用的GitLab实例 (${gitRepo.gitlabHost}) 与当前配置的不匹配 (${currentApiBaseUrl || '未配置'})`);
        }

        // 使用项目ID获取MR列表
        return this.getMergeRequests({
            ...options,
            projectId: gitRepo.gitlabProjectId
        });
    }

    /**
     * 获取当前用户的项目列表
     * @returns 项目列表
     */
    public async getProjects(): Promise<GitLabProject[]> {
        if (!this.authManager.isAuthenticated) {
            throw new Error('用户未登录');
        }

        const apiUrl = this.authManager.getApiUrl();
        const token = this.authManager.getToken();

        const url = `${apiUrl}/projects?membership=true&per_page=100`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Private-Token': token!,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`GitLab API错误: ${response.status} ${response.statusText}`);
            }

            return await response.json() as GitLabProject[];
        } catch (error) {
            console.error('获取项目列表失败:', error);
            throw new Error(`获取项目列表失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 获取当前项目信息
     * @param projectId 项目ID
     * @returns 项目信息
     */
    public async getProject(projectId: number | string): Promise<GitLabProject> {
        if (!this.authManager.isAuthenticated) {
            throw new Error('用户未登录');
        }

        const apiUrl = this.authManager.getApiUrl();
        const token = this.authManager.getToken();

        const url = `${apiUrl}/projects/${encodeURIComponent(String(projectId))}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Private-Token': token!,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`GitLab API错误: ${response.status} ${response.statusText}`);
            }

            return await response.json() as GitLabProject;
        } catch (error) {
            console.error('获取项目信息失败:', error);
            throw new Error(`获取项目信息失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 