import { GitHubBranch, GitHubCommit, GitHubRepo } from '../types';

export class GitHubService {
  private token: string;

  constructor(token: string) {
    this.token = token.trim();
  }

  private get headers(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Commit2Harvest-Workbench',
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  async getAuthenticatedUser(): Promise<{
    login: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  }> {
    if (!this.token) {
      throw new Error('No GitHub token provided');
    }
    const response = await fetch('https://api.github.com/user', {
      headers: this.headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Bad credentials (401 Unauthorized)');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async testConnection(): Promise<{
    success: boolean;
    username?: string;
    name?: string;
    email?: string;
    error?: string;
  }> {
    try {
      if (!this.token) {
        return { success: false, error: 'No GitHub token provided' };
      }
      const data = await this.getAuthenticatedUser();
      return { success: true, username: data.login, name: data.name, email: data.email };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to GitHub' };
    }
  }

  async fetchRepositories(): Promise<GitHubRepo[]> {
    if (!this.token) {
      throw new Error('GitHub token is required to fetch user repositories');
    }

    const response = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member',
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
    }

    const repos: GitHubRepo[] = await response.json();
    return repos;
  }

  async fetchBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async fetchCommits(params: {
    owner: string;
    repo: string;
    branch?: string;
    since?: string; // ISO 8601
    until?: string; // ISO 8601
    author?: string; // GitHub username or email address
    maxCommits?: number;
  }): Promise<GitHubCommit[]> {
    const { owner, repo, branch, since, until, author, maxCommits = 300 } = params;

    const allCommits: GitHubCommit[] = [];
    let page = 1;
    const perPage = 100;

    while (allCommits.length < maxCommits) {
      const url = new URL(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`
      );
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));
      if (branch) url.searchParams.set('sha', branch);
      if (since) url.searchParams.set('since', since);
      if (until) url.searchParams.set('until', until);
      if (author && author.trim()) url.searchParams.set('author', author.trim());

      const response = await fetch(url.toString(), {
        headers: this.headers,
      });

      if (!response.ok) {
        const errText = await response.text();
        let msg = `${response.status} ${response.statusText}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.message) msg += `: ${parsed.message}`;
        } catch {
          // ignore
        }
        throw new Error(`Failed to fetch commits: ${msg}`);
      }

      const pageCommits: GitHubCommit[] = await response.json();
      allCommits.push(...pageCommits);

      // If fewer than 100 commits were returned, we have reached the last page
      if (pageCommits.length < perPage) {
        break;
      }
      page++;
    }

    return allCommits;
  }

  async fetchCommitsFromOtherRepos(params: {
    repos: GitHubRepo[];
    currentRepoFullName: string;
    since?: string;
    until?: string;
    author?: string;
    maxRepos?: number;
  }): Promise<GitHubCommit[]> {
    const { repos, currentRepoFullName, since, until, author, maxRepos = 15 } = params;
    if (!this.token) {
      return [];
    }

    const otherRepos = repos
      .filter((r) => r.full_name.toLowerCase() !== currentRepoFullName.toLowerCase())
      .slice(0, maxRepos);

    if (otherRepos.length === 0) {
      return [];
    }

    const promises = otherRepos.map(async (r) => {
      try {
        const [owner, name] = r.full_name.split('/');
        if (!owner || !name) return [];

        const commits = await this.fetchCommits({
          owner,
          repo: name,
          since,
          until,
          author,
          maxCommits: 40,
        });

        return commits.map((c) => ({
          ...c,
          repoName: r.name,
          repoFullName: r.full_name,
        }));
      } catch {
        return [];
      }
    });

    const results = await Promise.allSettled(promises);
    const combined: GitHubCommit[] = [];

    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        combined.push(...res.value);
      }
    }

    if (author && author.trim()) {
      const target = author.trim().toLowerCase();
      return combined.filter((c) => {
        const login = c.author?.login?.toLowerCase() || '';
        const name = c.commit?.author?.name?.toLowerCase() || '';
        const email = c.commit?.author?.email?.toLowerCase() || '';
        return (
          login === target ||
          name === target ||
          name.includes(target) ||
          email.includes(target)
        );
      });
    }

    return combined;
  }
}
