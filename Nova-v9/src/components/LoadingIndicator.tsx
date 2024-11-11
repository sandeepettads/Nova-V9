import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  message: string;
}

export default function LoadingIndicator({ message }: LoadingIndicatorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
      <div className="bg-[#252526] rounded-lg shadow-xl p-6 border border-[#2d2d2d] flex items-center gap-4">
        <Loader2 className="w-6 h-6 text-[#ff6b2b] animate-spin" />
        <span className="text-[#e1e1e1]">{message}</span>
      </div>
    </div>
  );
}