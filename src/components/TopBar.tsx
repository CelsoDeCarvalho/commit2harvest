import React, { useState, useRef, useEffect } from 'react';
import { ConnectionStatus, DateRange, DateRangePreset } from '../types';
import {
  GitCommitHorizontal,
  Settings,
  Calendar,
  Sparkles,
  Layers,
  Database,
  ChevronDown,
  Check,
  Sun,
  Moon,
} from 'lucide-react';

interface TopBarProps {
  connectionStatus: ConnectionStatus;
  dateRange: DateRange;
  onDateRangeChange: (newRange: DateRange) => void;
  onOpenSettings: () => void;
  activePresetText?: string;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const PRESET_OPTIONS: { key: DateRangePreset; label: string; description?: string }[] = [
  { key: 'today', label: 'Today', description: 'Apenas commits de hoje' },
  { key: 'yesterday', label: 'Yesterday', description: 'Commits de ontem' },
  { key: 'this_week', label: 'This Week', description: 'Desde o início da semana' },
  { key: 'last_7_days', label: 'Last 7 Days', description: 'Últimos 7 dias móveis' },
  { key: 'this_month', label: 'This Month', description: 'Desde o dia 1 deste mês' },
  { key: 'this_year', label: 'This Year', description: 'Desde 1 de janeiro deste ano' },
  { key: 'custom', label: 'Custom Range', description: 'Intervalo de datas personalizado' },
];

export const TopBar: React.FC<TopBarProps> = ({
  connectionStatus,
  dateRange,
  onDateRangeChange,
  onOpenSettings,
  activePresetText,
  isDemoMode,
  onToggleDemoMode,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const rangeMenuRef = useRef<HTMLDivElement>(null);

  // Close Range Dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rangeMenuRef.current && !rangeMenuRef.current.contains(e.target as Node)) {
        setIsRangeMenuOpen(false);
      }
    };

    if (isRangeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRangeMenuOpen]);

  // Close Range Dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRangeMenuOpen) {
        setIsRangeMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRangeMenuOpen]);

  const handlePresetSelect = (preset: DateRangePreset) => {
    const now = new Date();
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let start = formatYMD(now);
    let end = formatYMD(now);

    if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      start = formatYMD(yesterday);
      end = formatYMD(yesterday);
    } else if (preset === 'this_week') {
      const monday = new Date(now);
      const day = now.getDay() || 7; // get current day of week (1=Monday ... 7=Sunday)
      monday.setDate(now.getDate() - (day - 1));
      start = formatYMD(monday);
      end = formatYMD(now);
    } else if (preset === 'last_7_days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      start = formatYMD(sevenDaysAgo);
      end = formatYMD(now);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = formatYMD(firstDay);
      end = formatYMD(now);
    } else if (preset === 'this_year') {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      start = formatYMD(firstDayOfYear);
      end = formatYMD(now);
    }

    onDateRangeChange({
      preset,
      startDate: start,
      endDate: end,
    });
    setIsRangeMenuOpen(false);
  };

  const activePresetItem =
    PRESET_OPTIONS.find((p) => p.key === dateRange.preset) || {
      key: 'custom',
      label: 'Custom Range',
    };

  const getStatusColor = (status: ConnectionStatus[keyof ConnectionStatus]) => {
    switch (status) {
      case 'connected':
        return 'text-[#238636]'; // Green
      case 'testing':
        return 'text-[#ff6c37] animate-pulse'; // Orange
      case 'error':
        return 'text-[#f85149]'; // Red
      default:
        return 'text-[#8b949e]'; // Gray
    }
  };

  return (
    <header className="h-12 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center justify-between select-none z-20 shrink-0">
      {/* Left: Branding & Version */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-[#ff6c37]">
          <GitCommitHorizontal className="w-5 h-5 stroke-[2.5]" />
          <span className="font-bold text-sm tracking-tight text-[#e6edf3] font-mono">
            Commit2Harvest
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#21262d] border border-[#30363d] text-[#8b949e] uppercase">
          v1.0 Workbench
        </span>

        {/* Active Repo-to-Harvest Preset Indicator */}
        <div className="hidden xl:flex items-center text-xs font-mono text-[#8b949e] space-x-1 pl-2 border-l border-[#30363d]">
          <Layers className="w-3.5 h-3.5 text-[#2f81f7]" />
          <span>Preset:</span>
          <span className="text-[#e6edf3] max-w-[200px] truncate" title={activePresetText || 'No preset mapped'}>
            {activePresetText || 'Default (Auto-detect)'}
          </span>
        </div>
      </div>

      {/* Center: Date Range Selector with Dropdown Menu */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-[#0d1117] border border-[#30363d] text-xs">
          <div className="px-2 py-1 text-[#8b949e] flex items-center space-x-1 border-r border-[#30363d]">
            <Calendar className="w-3.5 h-3.5 text-[#ff6c37]" />
            <span className="hidden sm:inline font-mono">Range:</span>
          </div>

          {/* Preset Dropdown Menu Trigger */}
          <div className="relative" ref={rangeMenuRef}>
            <button
              type="button"
              onClick={() => setIsRangeMenuOpen((prev) => !prev)}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono font-medium text-[#e6edf3] hover:bg-[#21262d] transition-colors"
            >
              <span className="text-[#ff6c37] font-semibold">{activePresetItem.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#8b949e] transition-transform ${
                  isRangeMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Range Presets Popover Menu */}
            {isRangeMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-[#161b22] border border-[#30363d] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#8b949e] border-b border-[#30363d] mb-1">
                  Intervalos Pré-definidos
                </div>
                {PRESET_OPTIONS.map((item) => {
                  const isSelected = dateRange.preset === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (item.key !== 'custom') {
                          handlePresetSelect(item.key);
                        } else {
                          onDateRangeChange({ ...dateRange, preset: 'custom' });
                          setIsRangeMenuOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors font-mono ${
                        isSelected
                          ? 'bg-[#1f242c] text-[#ff6c37] font-semibold'
                          : 'text-[#e6edf3] hover:bg-[#1f242c]/70'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{item.label}</span>
                        {item.description && (
                          <span className="text-[10px] text-[#8b949e] font-sans">
                            {item.description}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#ff6c37] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center px-1.5 py-0.5 space-x-1 border-l border-[#30363d]">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                onDateRangeChange({
                  ...dateRange,
                  preset: 'custom',
                  startDate: e.target.value,
                })
              }
              className="bg-transparent text-[#e6edf3] text-xs font-mono w-28 px-1 py-0.5 border border-transparent hover:border-[#30363d] focus:border-[#2f81f7] outline-none"
            />
            <span className="text-[#8b949e] font-mono text-xs">→</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                onDateRangeChange({
                  ...dateRange,
                  preset: 'custom',
                  endDate: e.target.value,
                })
              }
              className="bg-transparent text-[#e6edf3] text-xs font-mono w-28 px-1 py-0.5 border border-transparent hover:border-[#30363d] focus:border-[#2f81f7] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Right: Connection status pills + settings */}
      <div className="flex items-center space-x-2">
        {/* Demo Mode Toggle Button */}
        <button
          onClick={onToggleDemoMode}
          title={isDemoMode ? 'Demo Mode active (sample data loaded)' : 'Switch to Demo Mode'}
          className={`flex items-center space-x-1 px-2 py-1 text-xs font-mono border transition-colors ${
            isDemoMode
              ? 'bg-[#d29922]/20 border-[#d29922] text-[#d29922]'
              : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Database className="w-3 h-3" />
          <span className="hidden md:inline">{isDemoMode ? 'DEMO DATA' : 'DEMO'}</span>
        </button>

        {/* Postman-Style Connection Health Pills */}
        <div className="flex items-center space-x-1 bg-[#0d1117] border border-[#30363d] px-1 py-0.5">
          {/* GitHub Pill */}
          <div
            title={`GitHub API: ${connectionStatus.github}${connectionStatus.githubUser ? ` (@${connectionStatus.githubUser})` : ''}`}
            className="flex items-center space-x-1 px-1.5 py-0.5 text-[11px] font-mono text-[#8b949e] cursor-default"
          >
            <span className={`text-xs ${getStatusColor(connectionStatus.github)}`}>●</span>
            <span>GH</span>
          </div>

          <span className="text-[#30363d]">|</span>

          {/* Gemini Pill */}
          <div
            title={`Gemini 2.5 Flash: ${connectionStatus.gemini}`}
            className="flex items-center space-x-1 px-1.5 py-0.5 text-[11px] font-mono text-[#8b949e] cursor-default"
          >
            <span className={`text-xs ${getStatusColor(connectionStatus.gemini)}`}>●</span>
            <span className="flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-[#ff6c37]" />
              AI
            </span>
          </div>

          <span className="text-[#30363d]">|</span>

          {/* Harvest Pill */}
          <div
            title={`Harvest v2: ${connectionStatus.harvest}${connectionStatus.harvestUser ? ` (${connectionStatus.harvestUser})` : ''}`}
            className="flex items-center space-x-1 px-1.5 py-0.5 text-[11px] font-mono text-[#8b949e] cursor-default"
          >
            <span className={`text-xs ${getStatusColor(connectionStatus.harvest)}`}>●</span>
            <span>HV</span>
          </div>
        </div>

        {/* Light / Dark Mode Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="flex items-center space-x-1.5 px-2 py-1 text-xs font-mono text-[#8b949e] hover:text-[#e6edf3] bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] hover:border-[#8b949e] transition-colors"
            title={theme === 'dark' ? 'Mudar para Light Mode (Claro)' : 'Mudar para Dark Mode (Escuro)'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#ff6c37]" />
                <span className="hidden sm:inline text-[11px] font-semibold text-[#e6edf3]">LIGHT</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#ff6c37]" />
                <span className="hidden sm:inline text-[11px] font-semibold text-[#e6edf3]">DARK</span>
              </>
            )}
          </button>
        )}

        {/* Square Settings Button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-[#e6edf3] bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] hover:border-[#8b949e] transition-colors"
          title="Open API Keys & Settings"
        >
          <Settings className="w-3.5 h-3.5 text-[#ff6c37]" />
          <span className="font-mono text-xs">Settings</span>
        </button>
      </div>
    </header>
  );
};
