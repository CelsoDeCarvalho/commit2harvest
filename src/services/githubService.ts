import { GitHubBranch, GitHubCommit, GitHubRepo } from '../types';

// Files whose diffs say nothing useful about the work done.
const NOISE_FILE =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|composer\.lock|Cargo\.lock|poetry\.lock)$|(^|\/)(dist|build|node_modules|vendor)\/|\.min\.(js|css)$|\.(map|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|pdf|zip)$/i;

// Commit contents never change, so summaries are cached for the session.
const changeSummaryCache = new Map<string, string>();

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n... (truncated)`;
}

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

  /**
   * Fetch the code changes (files + diff excerpt) of each commit and attach them as
   * `changeSummary`, so the AI can describe what was really done, not only the message.
   * Commits whose details cannot be fetched are returned unchanged.
   */
  async attachChangeSummaries(
    commits: GitHubCommit[],
    fallbackRepoFullName: string,
    totalCharBudget = 48000
  ): Promise<{ commits: GitHubCommit[]; withChanges: number }> {
    if (!this.token || commits.length === 0) return { commits, withChanges: 0 };

    // Split the prompt budget across commits so large selections stay within model limits.
    const perCommitBudget = Math.max(600, Math.min(4000, Math.floor(totalCharBudget / commits.length)));
    const result: GitHubCommit[] = [...commits];
    let withChanges = 0;
    let next = 0;

    const worker = async () => {
      while (next < commits.length) {
        const index = next++;
        const commit = commits[index];
        const repoFullName = commit.repoFullName || fallbackRepoFullName;
        try {
          const summary = await this.getChangeSummary(repoFullName, commit.sha, perCommitBudget);
          if (summary) {
            result[index] = { ...commit, changeSummary: summary };
            withChanges++;
          }
        } catch (err) {
          console.warn(`Could not fetch changes for ${commit.sha.substring(0, 7)}:`, err);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(5, commits.length) }, worker));
    return { commits: result, withChanges };
  }

  private async getChangeSummary(repoFullName: string, sha: string, budget: number): Promise<string> {
    const cacheKey = `${repoFullName}@${sha}`;
    const cached = changeSummaryCache.get(cacheKey);
    if (cached !== undefined) return truncate(cached, budget);

    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) return '';

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${sha}`,
      { headers: this.headers }
    );
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const data = await response.json();
    const files: any[] = data.files || [];
    const relevant = files.filter((f) => !NOISE_FILE.test(f.filename));
    const additions = files.reduce((sum, f) => sum + (f.additions || 0), 0);
    const deletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0);

    const lines: string[] = [`${files.length} files changed (+${additions} / -${deletions})`];
    for (const f of relevant) {
      lines.push(`[${f.status}] ${f.filename} (+${f.additions}/-${f.deletions})`);
    }
    const skipped = files.length - relevant.length;
    if (skipped > 0) lines.push(`(${skipped} generated/lock/asset files omitted)`);

    // Diff excerpt: hunk headers and changed lines only, which carry the meaning.
    for (const f of relevant) {
      if (!f.patch) continue;
      lines.push(`--- ${f.filename}`);
      for (const line of String(f.patch).split('\n')) {
        if (line.startsWith('@@')) {
          const context = line.replace(/^@@[^@]*@@\s*/, '');
          if (context) lines.push(`@@ ${context.slice(0, 120)}`);
        } else if ((line.startsWith('+') || line.startsWith('-')) && line.trim().length > 1) {
          lines.push(line.slice(0, 160));
        }
      }
    }

    const summary = lines.join('\n');
    changeSummaryCache.set(cacheKey, summary);
    return truncate(summary, budget);
  }

  async fetchCommitsFromOtherRepos(params: {
    repos: GitHubRepo[];
    currentRepoFullName: string;
    since?: string;
    until?: string;
    targetDay?: string; // Format: YYYY-MM-DD
    author?: string;
    maxRepos?: number;
  }): Promise<GitHubCommit[]> {
    const { repos, currentRepoFullName, since, until, targetDay, author, maxRepos = 15 } = params;
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
          maxCommits: 50,
        });

        // Strict filter for this specific repository:
        // 1. Author matching (if provided)
        // 2. Exact Day matching (YYYY-MM-DD) if targetDay is provided
        const matchingCommits = commits.filter((c) => {
          if (author && author.trim()) {
            const target = author.trim().toLowerCase();
            const login = c.author?.login?.toLowerCase() || '';
            const name = c.commit?.author?.name?.toLowerCase() || '';
            const email = c.commit?.author?.email?.toLowerCase() || '';
            const matchesAuthor =
              login === target ||
              name === target ||
              name.includes(target) ||
              email.includes(target);
            if (!matchesAuthor) return false;
          }

          if (targetDay && targetDay.length === 10) {
            const commitDay = (c.commit?.author?.date || '').substring(0, 10);
            if (commitDay !== targetDay) return false;
          }

          return true;
        });

        // If this repository has NO commits on this specific day, do NOT bring the repo
        if (matchingCommits.length === 0) {
          return [];
        }

        return matchingCommits.map((c) => ({
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

    return combined;
  }
}
