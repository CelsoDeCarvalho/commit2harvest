import React, { useState } from 'react';
import { TelemetryLog } from '../types';
import { Terminal, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

interface StatusBarProps {
  logs: TelemetryLog[];
  selectedCommitCount: number;
  totalHours: number;
  readyTaskCount: number;
  syncedTaskCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  logs,
  selectedCommitCount,
  totalHours,
  readyTaskCount,
  syncedTaskCount,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

  const getLogIcon = (level?: TelemetryLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-[#238636]" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-[#f85149]" />;
      case 'warn':
        return <AlertTriangle className="w-3 h-3 text-[#d29922]" />;
      default:
        return <Info className="w-3 h-3 text-[#2f81f7]" />;
    }
  };

  return (
    <>
      {/* Expandable Console Drawer */}
      {isDrawerOpen && (
        <div className="h-44 bg-[#0d1117] border-t border-[#30363d] flex flex-col font-mono text-xs select-text z-30">
          <div className="h-7 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between select-none">
            <div className="flex items-center space-x-2 text-[#8b949e]">
              <Terminal className="w-3.5 h-3.5 text-[#ff6c37]" />
              <span className="font-semibold text-xs uppercase tracking-wider text-[#e6edf3]">
                Workbench HTTP Telemetry & Event Console
              </span>
              <span className="text-[10px] text-[#8b949e]">({logs.length} events)</span>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-[#8b949e] hover:text-[#e6edf3] p-1"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#0d1117] divide-y divide-[#30363d]/30">
            {logs.length === 0 ? (
              <div className="text-[#8b949e] italic py-2">No activity recorded yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="pt-1 flex items-start space-x-2 text-[11px] leading-tight">
                  <span className="text-[#8b949e] shrink-0">{log.timestamp}</span>
                  <span className="shrink-0 mt-0.5">{getLogIcon(log.level)}</span>
                  {log.statusCode && (
                    <span
                      className={`shrink-0 px-1 py-0.2 border text-[10px] ${
                        String(log.statusCode).startsWith('2')
                          ? 'border-[#238636] text-[#238636] bg-[#238636]/10'
                          : 'border-[#f85149] text-[#f85149] bg-[#f85149]/10'
                      }`}
                    >
                      {log.statusCode}
                    </span>
                  )}
                  {log.endpoint && (
                    <span className="text-[#8b949e] shrink-0 font-semibold">{log.endpoint}</span>
                  )}
                  <span
                    className={
                      log.level === 'error'
                        ? 'text-[#f85149]'
                        : log.level === 'success'
                        ? 'text-[#238636]'
                        : log.level === 'warn'
                        ? 'text-[#d29922]'
                        : 'text-[#e6edf3]'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Persistent 28px Bottom Bar */}
      <footer className="h-7 border-t border-[#30363d] bg-[#161b22] px-3 flex items-center justify-between text-xs font-mono select-none shrink-0 z-20">
        {/* Left: Last Action Status + Console Toggle */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="flex items-center space-x-1 text-[#8b949e] hover:text-[#e6edf3] px-1 py-0.5 bg-[#0d1117] border border-[#30363d] transition-colors shrink-0"
            title="Toggle telemetry event log"
          >
            <Terminal className="w-3 h-3 text-[#ff6c37]" />
            <span className="text-[10px] uppercase font-semibold">CONSOLE</span>
            {isDrawerOpen ? (
              <ChevronDown className="w-2.5 h-2.5" />
            ) : (
              <ChevronUp className="w-2.5 h-2.5" />
            )}
          </button>

          <span className="text-[#30363d]">|</span>

          {lastLog ? (
            <div className="flex items-center space-x-1.5 truncate">
              {getLogIcon(lastLog.level)}
              {lastLog.statusCode && (
                <span className="text-[#238636] font-bold">[{lastLog.statusCode}]</span>
              )}
              {lastLog.endpoint && <span className="text-[#8b949e]">{lastLog.endpoint}</span>}
              <span
                className={`truncate ${
                  lastLog.level === 'error'
                    ? 'text-[#f85149]'
                    : lastLog.level === 'success'
                    ? 'text-[#238636]'
                    : lastLog.level === 'warn'
                    ? 'text-[#d29922]'
                    : 'text-[#e6edf3]'
                }`}
              >
                {lastLog.message}
              </span>
            </div>
          ) : (
            <span className="text-[#8b949e]">READY</span>
          )}
        </div>

        {/* Right: Metrics & Telemetry Summary */}
        <div className="flex items-center space-x-3 text-[11px] text-[#8b949e] shrink-0 font-mono">
          <span>
            Selected:{' '}
            <strong className="text-[#ff6c37] font-semibold">{selectedCommitCount}</strong> commits
          </span>
          <span className="text-[#30363d]">|</span>
          <span>
            Ready: <strong className="text-[#2f81f7]">{readyTaskCount}</strong>
          </span>
          {syncedTaskCount > 0 && (
            <>
              <span className="text-[#30363d]">|</span>
              <span>
                Synced: <strong className="text-[#238636]">{syncedTaskCount}</strong>
              </span>
            </>
          )}
          <span className="text-[#30363d]">|</span>
          <span>
            Total:{' '}
            <strong className="text-[#e6edf3] font-semibold tabular-nums">
              {totalHours.toFixed(2)} hrs
            </strong>
          </span>
        </div>
      </footer>
    </>
  );
};
