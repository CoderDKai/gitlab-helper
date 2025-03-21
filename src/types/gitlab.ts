export interface GitLabCredentials {
    token: string;
    url?: string;
}

export interface GitLabUser {
    id: number;
    name: string;
    username: string;
    avatar_url: string;
    email: string;
}

export interface AuthenticationSessionData {
    id: string;
    account: {
        label: string;
        id: string;
    };
    scopes: string[];
    accessToken: string;
} 