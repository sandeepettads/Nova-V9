import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: 'file-tree' | 'processing' | 'semantic' | 'analysis' | 'scoring';
}

interface LogViewerProps {
  logs: LogEntry[];
  isExpanded: boolean;
  onToggle: () => void;
}

export default function LogViewer({ logs, isExpanded, onToggle }: LogViewerProps) {
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-[#8c8c8c]';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return '•';
    }
  };

  return (
    <div className="border-t border-[#2d2d2d] mt-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 hover:bg-[#2d2d2d] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#e1e1e1]">Processing Logs</span>
          <span className="text-xs bg-[#2d2d2d] px-2 py-0.5 rounded-full">
            {logs.length} entries
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      
      {isExpanded && (
        <div className="max-h-[400px] overflow-y-auto bg-[#1e1e1e] p-3 rounded-b-lg font-mono">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`flex items-start gap-2 text-xs mb-1 ${
                log.message.startsWith('│') || log.message.startsWith('└') || log.message.startsWith('├')
                  ? 'font-mono'
                  : ''
              }`}
            >
              <span className="text-[#4a4a4a] min-w-[70px] flex-shrink-0">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span className={`${getLogColor(log.type)} flex-shrink-0`}>
                {getLogIcon(log.type)}
              </span>
              <span 
                className={`${getLogColor(log.type)} break-all ${
                  log.category ? 'pl-1 border-l border-[#2d2d2d]' : ''
                }`}
              >
                {log.message}
                {log.category && (
                  <span className="ml-2 text-[#666] italic">
                    [{log.category}]
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}