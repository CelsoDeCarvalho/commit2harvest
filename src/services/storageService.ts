import { ApiCredentials, AppSettings, RepoProjectMap } from '../types';

const STORAGE_KEYS = {
  CREDENTIALS: 'c2h_credentials',
  APP_SETTINGS: 'c2h_app_settings',
  SYNCED_SHAS: 'c2h_synced_shas',
  REPO_PROJECT_MAP: 'c2h_repo_project_map',
  LAST_REPO: 'c2h_last_repo',
  LAST_BRANCH: 'c2h_last_branch',
  GITHUB_USER: 'c2h_github_user',
  THEME: 'c2h_theme',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  descriptionFormat: 'paragraph',
  entrySeparator: ': ',
  hoursDisplayFormat: 'natural',
};

export const storageService = {
  getCredentials(): ApiCredentials {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      const parsed = stored ? JSON.parse(stored) : {};
      return {
        githubToken: parsed.githubToken || import.meta.env.VITE_GITHUB_TOKEN || '',
        geminiApiKey: parsed.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '',
        harvestAccountId: parsed.harvestAccountId || import.meta.env.VITE_HARVEST_ACCOUNT_ID || '',
        harvestAccessToken: parsed.harvestAccessToken || import.meta.env.VITE_HARVEST_ACCESS_TOKEN || '',
        githubAuthorFilter: parsed.githubAuthorFilter || '',
      };
    } catch {
      return {
        githubToken: import.meta.env.VITE_GITHUB_TOKEN || '',
        geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
        harvestAccountId: import.meta.env.VITE_HARVEST_ACCOUNT_ID || '',
        harvestAccessToken: import.meta.env.VITE_HARVEST_ACCESS_TOKEN || '',
        githubAuthorFilter: '',
      };
    }
  },

  getGithubUser(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.GITHUB_USER) || '';
    } catch {
      return '';
    }
  },

  saveGithubUser(user: string): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.GITHUB_USER, user);
      } else {
        localStorage.removeItem(STORAGE_KEYS.GITHUB_USER);
      }
    } catch {
      // ignore
    }
  },

  saveCredentials(creds: ApiCredentials): void {
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(creds));
  },

  getSyncedShas(): Set<string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SYNCED_SHAS);
      if (!stored) return new Set<string>();
      const list = JSON.parse(stored);
      return new Set<string>(Array.isArray(list) ? list : []);
    } catch {
      return new Set<string>();
    }
  },

  isShaSynced(sha: string): boolean {
    return this.getSyncedShas().has(sha);
  },

  markShasSynced(shas: string[]): void {
    const current = this.getSyncedShas();
    shas.forEach((s) => current.add(s));
    localStorage.setItem(STORAGE_KEYS.SYNCED_SHAS, JSON.stringify(Array.from(current)));
  },

  unmarkShaSynced(sha: string): void {
    const current = this.getSyncedShas();
    current.delete(sha);
    localStorage.setItem(STORAGE_KEYS.SYNCED_SHAS, JSON.stringify(Array.from(current)));
  },

  clearSyncedShas(): void {
    localStorage.removeItem(STORAGE_KEYS.SYNCED_SHAS);
  },

  getRepoProjectMap(): RepoProjectMap {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REPO_PROJECT_MAP);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  },

  saveRepoProjectMapping(repoFullName: string, projectId: number, taskId: number): void {
    const current = this.getRepoProjectMap();
    current[repoFullName] = { projectId, taskId };
    localStorage.setItem(STORAGE_KEYS.REPO_PROJECT_MAP, JSON.stringify(current));
  },

  getMappingForRepo(repoFullName: string): { projectId: number; taskId: number } | null {
    const current = this.getRepoProjectMap();
    return current[repoFullName] || null;
  },

  getLastSelectedRepo(): { repo: string | null; branch: string | null } {
    return {
      repo: localStorage.getItem(STORAGE_KEYS.LAST_REPO),
      branch: localStorage.getItem(STORAGE_KEYS.LAST_BRANCH),
    };
  },

  saveLastSelectedRepo(repo: string, branch?: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_REPO, repo);
    if (branch) {
      localStorage.setItem(STORAGE_KEYS.LAST_BRANCH, branch);
    }
  },

  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (!stored) return { ...DEFAULT_APP_SETTINGS };
      const parsed = JSON.parse(stored);
      return {
        descriptionFormat: parsed.descriptionFormat === 'bullets' ? 'bullets' : 'paragraph',
        entrySeparator: typeof parsed.entrySeparator === 'string' ? parsed.entrySeparator : ': ',
        hoursDisplayFormat: parsed.hoursDisplayFormat === 'decimal' ? 'decimal' : 'natural',
      };
    } catch {
      return { ...DEFAULT_APP_SETTINGS };
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save app settings to localStorage', e);
    }
  },

  getTheme(): 'dark' | 'light' {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
      return 'dark';
    } catch {
      return 'dark';
    }
  },

  saveTheme(theme: 'dark' | 'light'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage', e);
    }
  },
};
