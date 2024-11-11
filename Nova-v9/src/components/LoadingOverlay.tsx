import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message: string;
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-xl p-6 border border-[#2d2d2d] flex items-center gap-4">
        <div className="relative">
          <Loader2 className="w-6 h-6 text-[#ff6b2b] animate-spin" />
          <div className="absolute inset-0 animate-ping opacity-50">
            <Loader2 className="w-6 h-6 text-[#ff6b2b]" />
          </div>
        </div>
        <span className="text-[#e1e1e1] font-medium">{message}</span>
      </div>
    </div>
  );
}