import React, { useState } from 'react';
import { Sparkles, Settings } from 'lucide-react';
import SettingsPanel from './SettingsPanel';

export default function LogoBar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <div className="h-12 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ff6b2b]" />
          <div className="text-lg font-semibold flex items-center">
            <span className="bg-gradient-to-r from-[#ff6b2b] to-[#ff8142] text-transparent bg-clip-text">
              NoVA
            </span>
            <span className="bg-gradient-to-r from-[#ffa07a] to-[#ffb399] text-transparent bg-clip-text ml-1">
              Platform
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="hover:text-gray-200 cursor-pointer transition-colors">Documentation</span>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1 hover:text-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}