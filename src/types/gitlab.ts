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

export type MergeRequestState = 'opened' | 'closed' | 'locked' | 'merged';

export type MergeRequestScope = 'created_by_me' | 'assigned_to_me' | 'all';

export type MergeRequestOrderBy = 'created_at' | 'updated_at';

export type MergeRequestSort = 'asc' | 'desc';

export interface MergeRequestFilterOptions {
    state?: MergeRequestState;
    scope?: MergeRequestScope;
    search?: string;
    orderBy?: MergeRequestOrderBy;
    sort?: MergeRequestSort;
    projectId?: number | string;
}

export interface MergeRequestAuthor {
    id: number;
    username: string;
    name: string;
    avatar_url: string;
}

export interface MergeRequest {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string;
    state: MergeRequestState;
    created_at: string;
    updated_at: string;
    merged_at?: string;
    closed_at?: string;
    target_branch: string;
    source_branch: string;
    author: MergeRequestAuthor;
    assignee?: MergeRequestAuthor;
    assignees?: MergeRequestAuthor[];
    draft: boolean;
    web_url: string;
    has_conflicts: boolean;
    merge_status: string;
    user_notes_count: number;
    should_remove_source_branch: boolean;
    work_in_progress: boolean;
    merge_when_pipeline_succeeds: boolean;
} 