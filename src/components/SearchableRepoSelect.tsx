import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GitHubRepo } from '../types';
import { Search, ChevronDown, Check, FolderGit2, Lock, Plus } from 'lucide-react';

interface SearchableRepoSelectProps {
  repos: GitHubRepo[];
  selectedRepo: string;
  onSelectRepo: (repoFullName: string) => void;
  disabled?: boolean;
}

export const SearchableRepoSelect: React.FC<SearchableRepoSelectProps> = ({
  repos,
  selectedRepo,
  onSelectRepo,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowManualInput(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setShowManualInput(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Autofocus search input when opening
  useEffect(() => {
    if (isOpen && !showManualInput) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, showManualInput]);

  // Find currently selected repo object (if present in repos list)
  const currentRepoObj = useMemo(
    () => repos.find((r) => r.full_name.toLowerCase() === selectedRepo.toLowerCase()),
    [repos, selectedRepo]
  );

  // Filter repos by search query
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repos;
    const q = searchQuery.toLowerCase().trim();
    return repos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [repos, searchQuery]);

  const handleSelect = (repoFullName: string) => {
    onSelectRepo(repoFullName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleSelect(manualInput.trim());
      setShowManualInput(false);
      setManualInput('');
    }
  };

  return (
    <div className="relative flex-1 min-w-0" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between bg-[#0d1117] border border-[#30363d] hover:border-[#8b949e] px-2 py-1 text-xs font-mono text-[#e6edf3] transition-colors focus:border-[#2f81f7] outline-none disabled:opacity-50"
        title={selectedRepo || 'Selecionar repositório...'}
      >
        <div className="flex items-center space-x-1.5 truncate min-w-0 pr-1">
          <FolderGit2 className="w-3.5 h-3.5 text-[#2f81f7] shrink-0" />
          <span className="truncate font-semibold">
            {selectedRepo || 'Selecionar repositório...'}
          </span>
          {currentRepoObj?.private && (
            <Lock className="w-2.5 h-2.5 text-[#8b949e] shrink-0" />
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8b949e] shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full sm:min-w-[380px] max-w-[500px] bg-[#161b22] border border-[#30363d] shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box Header */}
          <div className="p-2 border-b border-[#30363d] bg-[#0d1117] flex items-center space-x-1.5">
            <Search className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Pesquisar repositórios (ex: semis, dhis2)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-mono text-[#e6edf3] placeholder-[#484f58] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#8b949e] hover:text-[#e6edf3] text-xs px-1"
              >
                ×
              </button>
            )}
          </div>

          {/* Repositories Scrollable List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-[#30363d]/50 bg-[#161b22]">
            {filteredRepos.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-[#8b949e] space-y-2">
                <div>Nenhum repositório corresponde a "{searchQuery}"</div>
                {searchQuery.trim().includes('/') && (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchQuery.trim())}
                    className="px-2 py-1 bg-[#21262d] border border-[#30363d] text-[#2f81f7] hover:border-[#2f81f7] text-xs font-mono inline-block transition-colors"
                  >
                    Usar "{searchQuery.trim()}" diretamente
                  </button>
                )}
              </div>
            ) : (
              filteredRepos.map((r) => {
                const isSelected = r.full_name.toLowerCase() === selectedRepo.toLowerCase();
                return (
                  <button
                    key={r.id || r.full_name}
                    type="button"
                    onClick={() => handleSelect(r.full_name)}
                    className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#1f242c] text-[#ff6c37]'
                        : 'text-[#e6edf3] hover:bg-[#1f242c]/70'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-semibold truncate">{r.full_name}</span>
                        {r.private ? (
                          <span className="text-[10px] text-[#8b949e] flex items-center">
                            <Lock className="w-2.5 h-2.5 mr-0.5" />
                            privado
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                            público
                          </span>
                        )}
                      </div>
                      {r.description && (
                        <span className="text-[10px] text-[#8b949e] truncate font-sans mt-0.5">
                          {r.description}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#ff6c37] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: Count & Custom Manual Repo entry */}
          <div className="p-2 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-between text-xs font-mono">
            {showManualInput ? (
              <form onSubmit={handleManualSubmit} className="w-full flex items-center space-x-1">
                <input
                  type="text"
                  placeholder="owner/repo..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  autoFocus
                  className="flex-1 bg-[#161b22] border border-[#30363d] px-2 py-0.5 text-xs font-mono text-[#e6edf3] placeholder-[#484f58] outline-none focus:border-[#2f81f7]"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] text-xs border border-[#30363d]"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <span className="text-[11px] text-[#8b949e]">
                  {filteredRepos.length} de {repos.length} repositórios
                </span>
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="text-[11px] text-[#2f81f7] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Outro repositório</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
