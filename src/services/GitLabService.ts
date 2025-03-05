import { ConfigService } from "./ConfigServices";
import axios, { AxiosInstance } from 'axios';

export class GitLabService {
  private client: AxiosInstance;

  constructor(baseUrl?: string, token?: string) {
    this.client = axios.create({
      baseURL: `${baseUrl}/api/v4`,
      headers: {
        'Private-Token': token,
      }
    });
  }

  async init() {
    const baseUrl = await ConfigService.getGitlabBaseUrl();
    const token = await ConfigService.getGitlabToken();
    this.client = axios.create({
      baseURL: `${baseUrl}/api/v4`,
      headers: {
        'Private-Token': token,
      }
    });
  }

  async getProjects() {
    try {
      const response = await this.client.get('/projects', {
        params: {
          membership: true,
          per_page: 100,
        }
      });
      return response.data;
    }
    catch (error) {
      console.error('获取项目列表失败:', error);
      throw error;
    }
  }
}