import React from 'react';
import { Terminal } from 'lucide-react';

interface ConsoleProps {
  output: string[];
}

export default function Console({ output }: ConsoleProps) {
  return (
    <div className="h-[200px] bg-[#1e1e1e] overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 p-2 border-b border-[#2d2d2d] bg-[#252526]">
        <Terminal className="w-4 h-4" />
        <span className="text-xs font-medium">Console</span>
      </div>
      <div className="p-2 font-mono text-sm space-y-1">
        {output.map((line, index) => (
          <div key={index} className="text-[#cccccc]">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}