import React from 'react';
import { Terminal } from 'lucide-react';

const ConsolePanel: React.FC = () => {
  return (
    <div className="h-32 flex-shrink-0 bg-[#1e1e1e] border-t border-[#2d2d2d] w-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2d2d2d] bg-[#252526]">
        <Terminal className="w-4 h-4" />
        <span className="text-xs font-medium text-[#cccccc]">Console</span>
      </div>
      <div className="p-2 font-mono text-sm text-[#cccccc] h-[calc(100%-32px)] overflow-auto">
        <div className="whitespace-pre-wrap">
          {"> System initialized\n> Ready for input..."}
        </div>
      </div>
    </div>
  );
};

export default ConsolePanel;