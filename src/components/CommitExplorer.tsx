import React, { useState, useMemo } from 'react';
import { GitHubBranch, GitHubCommit, GitHubRepo } from '../types';
import {
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  CheckCheck,
  FolderGit2,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react';
import { SearchableRepoSelect } from './SearchableRepoSelect';
import { SearchableBranchSelect } from './SearchableBranchSelect';

interface CommitExplorerProps {
  repos: GitHubRepo[];
  selectedRepo: string;
  onSelectRepo: (repoFullName: string) => void;
  branches: GitHubBranch[];
  selectedBranch: string;
  onSelectBranch: (branchName: string) => void;
  commits: GitHubCommit[];
  isLoadingCommits: boolean;
  onRefreshCommits: () => void;
  selectedCommitShas: Set<string>;
  onToggleCommitSelect: (sha: string) => void;
  onSelectAllCommits: (shas: string[]) => void;
  onDeselectAllCommits: () => void;
  isShaSynced: (sha: string) => boolean;
  currentAuthor?: string;
}

export const CommitExplorer: React.FC<CommitExplorerProps> = ({
  repos,
  selectedRepo,
  onSelectRepo,
  branches,
  selectedBranch,
  onSelectBranch,
  commits,
  isLoadingCommits,
  onRefreshCommits,
  selectedCommitShas,
  onToggleCommitSelect,
  onSelectAllCommits,
  onDeselectAllCommits,
  isShaSynced,
  currentAuthor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hideSynced, setHideSynced] = useState(false);
  const [expandedCommitSha, setExpandedCommitSha] = useState<string | null>(null);

  // Filter commits based on search query and hideSynced
  const filteredCommits = useMemo(() => {
    return commits.filter((c) => {
      const isSynced = isShaSynced(c.sha);
      if (hideSynced && isSynced) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const msg = c.commit.message.toLowerCase();
      const author = (c.commit.author?.name || '').toLowerCase();
      const sha = c.sha.toLowerCase();
      return msg.includes(q) || author.includes(q) || sha.includes(q);
    });
  }, [commits, hideSynced, searchQuery, isShaSynced]);

  const unsyncedFilteredCommits = useMemo(() => {
    return filteredCommits.filter((c) => !isShaSynced(c.sha));
  }, [filteredCommits, isShaSynced]);

  const areAllFilteredSelected =
    filteredCommits.length > 0 &&
    filteredCommits.every((c) => selectedCommitShas.has(c.sha));

  const areAllUnsyncedSelected =
    unsyncedFilteredCommits.length > 0 &&
    unsyncedFilteredCommits.every((c) => selectedCommitShas.has(c.sha));

  const formatCommitDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'agora';
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr.substring(0, 10);
    }
  };

  return (
    <aside className="w-full lg:w-5/12 border-r border-[#30363d] bg-[#161b22] flex flex-col h-full select-none shrink-0">
      {/* Pane Section Header */}
      <div className="h-8 px-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
          <FolderGit2 className="w-3.5 h-3.5 text-[#2f81f7]" />
          <span>SOURCE: GITHUB COMMITS</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-[#8b949e]">
          <span>{commits.length} commits</span>
          <button
            onClick={onRefreshCommits}
            disabled={isLoadingCommits}
            className="p-1 hover:text-[#e6edf3] hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors"
            title="Refresh Commits"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingCommits ? 'animate-spin text-[#ff6c37]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toolbar: Searchable Repository & Branch Selectors */}
      <div className="p-2 border-b border-[#30363d] bg-[#161b22] space-y-2">
        <div className="flex items-center space-x-1.5">
          <SearchableRepoSelect
            repos={repos}
            selectedRepo={selectedRepo}
            onSelectRepo={onSelectRepo}
          />

          <div className="w-36 sm:w-44 shrink-0">
            <SearchableBranchSelect
              branches={branches}
              selectedBranch={selectedBranch}
              onSelectBranch={onSelectBranch}
            />
          </div>
        </div>

        {/* Author filter verification banner */}
        <div className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] px-2 py-1 text-[11px] font-mono">
          <div className="flex items-center space-x-1.5 truncate min-w-0 pr-1">
            <ShieldCheck className="w-3 h-3 text-[#238636] shrink-0" />
            <span className="text-[#8b949e] shrink-0">Autor:</span>
            <span className="text-[#e6edf3] font-semibold truncate">
              @{currentAuthor || 'meus commits'}
            </span>
          </div>
          <span className="text-[10px] text-[#238636] bg-[#238636]/15 border border-[#238636]/40 px-1 py-0.2 shrink-0">
            Apenas os meus commits
          </span>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Filtrar commits por mensagem, autor ou SHA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] pl-7 pr-2 py-1 text-xs font-mono text-[#e6edf3] placeholder-[#484f58] focus:border-[#2f81f7] outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3]"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Sub-bar: Selection and Status Controls */}
      <div className="h-8 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={areAllFilteredSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectAllCommits(filteredCommits.map((c) => c.sha));
                } else {
                  onDeselectAllCommits();
                }
              }}
              className="accent-[#ff6c37] cursor-pointer h-3.5 w-3.5 border border-[#30363d] bg-[#0d1117]"
            />
            <span className="text-[#8b949e] font-mono text-[11px]">
              Select All ({filteredCommits.length})
            </span>
          </label>

          {unsyncedFilteredCommits.length > 0 && (
            <button
              onClick={() => {
                if (areAllUnsyncedSelected) {
                  onDeselectAllCommits();
                } else {
                  onSelectAllCommits(unsyncedFilteredCommits.map((c) => c.sha));
                }
              }}
              className="text-[11px] font-mono text-[#2f81f7] hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              <span>Unsynced only ({unsyncedFilteredCommits.length})</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1 text-[11px] font-mono text-[#8b949e] cursor-pointer">
            <input
              type="checkbox"
              checked={hideSynced}
              onChange={(e) => setHideSynced(e.target.checked)}
              className="accent-[#ff6c37] cursor-pointer h-3 w-3"
            />
            <span>Hide Synced</span>
          </label>
          <span className="text-[#30363d]">|</span>
          <span className="font-mono text-[11px] text-[#ff6c37]">
            {selectedCommitShas.size} selected
          </span>
        </div>
      </div>

      {/* Commit Table List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#30363d] bg-[#0d1117]">
        {isLoadingCommits ? (
          <div className="p-8 text-center text-xs font-mono text-[#8b949e] flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#ff6c37]" />
            <span>FETCHING COMMITS FROM GITHUB...</span>
          </div>
        ) : filteredCommits.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#8b949e] flex flex-col items-center justify-center space-y-2">
            <FolderGit2 className="w-6 h-6 text-[#484f58]" />
            <span>Nenhum commit encontrado para os critérios selecionados.</span>
            <span className="text-[11px] text-[#484f58]">
              Tente alargar o intervalo de datas ou mudar de branch.
            </span>
          </div>
        ) : (
          filteredCommits.map((commit) => {
            const isSelected = selectedCommitShas.has(commit.sha);
            const isSynced = isShaSynced(commit.sha);
            const isExpanded = expandedCommitSha === commit.sha;
            const shortSha = commit.sha.substring(0, 7);
            const commitMessageFirstLine = commit.commit.message.split('\n')[0];
            const authorName = commit.commit.author?.name || commit.author?.login || 'Unknown';

            return (
              <div
                key={commit.sha}
                className={`transition-colors border-b border-[#30363d] ${
                  isSelected ? 'bg-[#1f242c]' : 'bg-[#161b22] hover:bg-[#1f242c]/60'
                }`}
              >
                {/* Commit Row Header */}
                <div className="px-3 py-1.5 flex items-center justify-between space-x-2 text-xs">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleCommitSelect(commit.sha)}
                      className="accent-[#ff6c37] cursor-pointer h-3.5 w-3.5 border border-[#30363d] bg-[#0d1117] shrink-0"
                    />

                    {/* Expand/Collapse details chevron */}
                    <button
                      onClick={() => setExpandedCommitSha(isExpanded ? null : commit.sha)}
                      className="text-[#8b949e] hover:text-[#e6edf3] p-0.5"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Commit Message */}
                    <span
                      onClick={() => setExpandedCommitSha(isExpanded ? null : commit.sha)}
                      className="text-xs text-[#e6edf3] font-normal truncate cursor-pointer hover:text-[#2f81f7] transition-colors"
                      title={commit.commit.message}
                    >
                      {commitMessageFirstLine}
                    </span>
                  </div>

                  {/* Right-aligned metadata */}
                  <div className="flex items-center space-x-2 shrink-0 font-mono text-xs">
                    {/* Synced Badge */}
                    {isSynced && (
                      <span className="bg-[#238636]/20 border border-[#238636]/50 text-[#238636] px-1 py-0.2 text-[10px] font-mono tracking-tight">
                        SYNCED
                      </span>
                    )}

                    {/* Monospace 7-char SHA badge */}
                    <a
                      href={commit.html_url || `https://github.com/${selectedRepo}/commit/${commit.sha}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#21262d] border border-[#30363d] px-1.5 py-0.5 text-xs font-mono text-[#2f81f7] hover:border-[#2f81f7] flex items-center space-x-1"
                      title="Ver commit no GitHub"
                    >
                      <span>{shortSha}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>

                    {/* Relative date */}
                    <span className="text-[#8b949e] text-[11px] min-w-[28px] text-right">
                      {formatCommitDate(commit.commit.author.date)}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-8 py-2 bg-[#0d1117] border-t border-[#30363d] space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#8b949e] text-[11px]">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-[#8b949e]" />
                        <span className="text-[#e6edf3]">{authorName}</span>
                        <span>&lt;{commit.commit.author?.email}&gt;</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{commit.commit.author.date}</span>
                      </div>
                    </div>

                    <div className="p-2 bg-[#161b22] border border-[#30363d] text-[#e6edf3] font-sans text-xs whitespace-pre-wrap select-text">
                      {commit.commit.message}
                    </div>

                    <div className="text-[10px] text-[#8b949e] flex justify-between">
                      <span>Full SHA: {commit.sha}</span>
                      <button
                        onClick={() => onToggleCommitSelect(commit.sha)}
                        className="text-[#ff6c37] hover:underline cursor-pointer"
                      >
                        {isSelected ? 'Desmarcar este commit' : 'Selecionar este commit'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
