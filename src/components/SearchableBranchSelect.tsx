import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GitHubBranch } from '../types';
import { Search, ChevronDown, Check, GitBranch } from 'lucide-react';

interface SearchableBranchSelectProps {
  branches: GitHubBranch[];
  selectedBranch: string;
  onSelectBranch: (branchName: string) => void;
  disabled?: boolean;
}

export const SearchableBranchSelect: React.FC<SearchableBranchSelectProps> = ({
  branches,
  selectedBranch,
  onSelectBranch,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Autofocus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter branches by query
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const q = searchQuery.toLowerCase().trim();
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, searchQuery]);

  const handleSelect = (branchName: string) => {
    onSelectBranch(branchName);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative min-w-[130px]" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled || branches.length === 0}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between bg-[#0d1117] border border-[#30363d] hover:border-[#8b949e] px-2 py-1 text-xs font-mono text-[#e6edf3] transition-colors focus:border-[#2f81f7] outline-none disabled:opacity-50"
        title={selectedBranch || '(sem branch)'}
      >
        <div className="flex items-center space-x-1 truncate min-w-0 pr-1">
          <GitBranch className="w-3 h-3 text-[#8b949e] shrink-0" />
          <span className="truncate">{selectedBranch || '(nenhuma)'}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8b949e] shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 sm:w-64 bg-[#161b22] border border-[#30363d] shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box Header */}
          <div className="p-2 border-b border-[#30363d] bg-[#0d1117] flex items-center space-x-1.5">
            <Search className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Pesquisar branch..."
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

          {/* Branches Scrollable List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-[#30363d]/50 bg-[#161b22]">
            {filteredBranches.length === 0 ? (
              <div className="p-3 text-center text-xs font-mono text-[#8b949e]">
                Nenhuma branch encontrada para "{searchQuery}"
              </div>
            ) : (
              filteredBranches.map((b) => {
                const isSelected = b.name === selectedBranch;
                return (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => handleSelect(b.name)}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#1f242c] text-[#ff6c37]'
                        : 'text-[#e6edf3] hover:bg-[#1f242c]/70'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate min-w-0 pr-2">
                      <GitBranch
                        className={`w-3 h-3 shrink-0 ${
                          isSelected ? 'text-[#ff6c37]' : 'text-[#8b949e]'
                        }`}
                      />
                      <span className="truncate">{b.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#ff6c37] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: Count */}
          <div className="p-1.5 px-3 border-t border-[#30363d] bg-[#0d1117] text-[10px] font-mono text-[#8b949e]">
            {filteredBranches.length} de {branches.length} branches
          </div>
        </div>
      )}
    </div>
  );
};
