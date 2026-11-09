export interface ApiCredentials {
  githubToken: string;
  geminiApiKey: string;
  harvestAccountId: string;
  harvestAccessToken: string;
  githubAuthorFilter?: string;
}

export type ConnectionHealth = 'idle' | 'connected' | 'disconnected' | 'testing' | 'error';

export interface ConnectionStatus {
  github: ConnectionHealth;
  gemini: ConnectionHealth;
  harvest: ConnectionHealth;
  githubUser?: string;
  harvestUser?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  private: boolean;
  default_branch: string;
  updated_at: string;
  description: string | null;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer?: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
  repoName?: string;
  repoFullName?: string;
}

export interface GeminiTaskItem {
  id: string;
  businessTitle: string;
  businessDescription: string;
  suggestedHours: number;
  spentDate: string; // YYYY-MM-DD
  sourceCommitShas: string[];
}

export interface HarvestTaskAssignment {
  id: number;
  billable: boolean;
  is_active: boolean;
  task: {
    id: number;
    name: string;
  };
}

export interface HarvestProjectAssignment {
  id: number;
  is_active: boolean;
  project: {
    id: number;
    name: string;
    code: string;
  };
  client: {
    id: number;
    name: string;
    currency: string;
  };
  task_assignments: HarvestTaskAssignment[];
}

export interface HarvestTimeEntryPayload {
  project_id: number;
  task_id: number;
  spent_date: string;
  hours: number;
  notes: string;
}

export interface HarvestTimeEntryResponse {
  id: number;
  spent_date: string;
  hours: number;
  notes: string;
  project: {
    id: number;
    name: string;
  };
  task: {
    id: number;
    name: string;
  };
  client: {
    id: number;
    name: string;
  };
}

export interface WorkbenchTask {
  id: string;
  businessTitle: string;
  businessDescription: string;
  spentDate: string;
  hours: number;
  projectId: number | null;
  taskId: number | null;
  sourceCommitShas: string[];
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  harvestEntryId?: number;
  repoFullName?: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  statusCode?: number | string;
  endpoint?: string;
}

export type RepoProjectMap = Record<
  string,
  {
    projectId: number;
    taskId: number;
  }
>;

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_7_days'
  | 'this_month'
  | 'this_year'
  | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}
