import React from 'react';
import { Loader2 } from 'lucide-react';

interface ChunkingProgressProps {
  progress: number;
  status: string;
  isComplete: boolean;
}

export default function ChunkingProgress({ progress, status, isComplete }: ChunkingProgressProps) {
  return (
    <div className="p-4 bg-[#1e1e1e] rounded-lg border border-[#2d2d2d]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#e1e1e1]">Processing Code Context</span>
        {!isComplete && (
          <Loader2 className="w-4 h-4 text-[#ff6b2b] animate-spin" />
        )}
      </div>
      
      <div className="w-full bg-[#2d2d2d] rounded-full h-2 mb-2">
        <div
          className="bg-gradient-to-r from-[#ff6b2b] to-[#ff8142] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <span className="text-xs text-[#8c8c8c]">{status}</span>
    </div>
  );
}