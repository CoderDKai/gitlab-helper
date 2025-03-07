import * as vscode from 'vscode';
import { ConfigService } from "./ConfigServices";
import axios, { AxiosInstance } from 'axios';
import { GetBranchesParams } from './gitlab-api';

export class GitLabService {
  private client: AxiosInstance;
  private static instance: GitLabService;
  private projectId?: string;
  
  constructor(baseUrl?: string, token?: string, projectId?: string) {
    this.client = axios.create({
      baseURL: `${baseUrl}/api/v4`,
      headers: {
        'Private-Token': token,
      }
    });
    this.projectId = projectId;
  }

  static async getInstance() {
    if (!GitLabService.instance) {
      const baseUrl = await ConfigService.getGitlabBaseUrl();
      const token = await ConfigService.getGitlabToken();
      const encodedProjectId = await ConfigService.getURLEncodedProjectId();
      GitLabService.instance = new GitLabService(baseUrl, token, encodedProjectId);
    }
    return GitLabService.instance;
  }

  // 获取分支列表
  async getBranches(params: GetBranchesParams) {
    return this.client.get(`/projects/${this.projectId}/repository/branches`, { params });
  }

  async getMergeRequests(params: GetMergeRequestsParams) {
    
  }
}