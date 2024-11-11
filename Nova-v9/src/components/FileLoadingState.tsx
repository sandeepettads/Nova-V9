import React from 'react';
import { Loader2 } from 'lucide-react';

interface FileLoadingStateProps {
  message: string;
}

export default function FileLoadingState({ message }: FileLoadingStateProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-[#007acc] animate-spin" />
        <span className="text-sm text-[#8c8c8c]">{message}</span>
      </div>
    </div>
  );
}