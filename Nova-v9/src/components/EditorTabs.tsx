import React from 'react';
import { X, Circle, FileCode, MessageSquare, Eye } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { getFileIcon } from '../utils/fileIcons';

export default function EditorTabs() {
  const { tabs, activeTabId, closeTab, setActiveTab, togglePreview } = useWorkspaceStore();

  return (
    <div className="h-9 bg-[#252526] flex items-center border-b border-[#2d2d2d] select-none">
      <div className="flex-1 flex overflow-x-auto custom-scrollbar">
        {tabs.length === 0 ? (
          <div className="px-4 text-sm text-[#6e6e6e]">No open editors</div>
        ) : (
          tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const Icon = tab.type === 'preview' ? Eye : 
                        tab.type === 'file' ? getFileIcon(tab.path || '') : 
                        MessageSquare;

            return (
              <div
                key={tab.id}
                className={`
                  flex items-center h-[34px] min-w-[120px] max-w-[200px]
                  border-r border-[#2d2d2d] group relative
                  ${isActive ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d] hover:bg-[#2d2d2d]'}
                  cursor-pointer
                `}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="flex-1 flex items-center gap-2 px-3 overflow-hidden">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${
                    tab.type === 'preview' ? 'text-blue-400' :
                    tab.type === 'response' ? 'text-[#007acc]' : ''
                  }`} />
                  <span className="truncate text-sm text-[#e1e1e1]">
                    {tab.type === 'preview' ? `Preview: ${tab.title}` : tab.title}
                  </span>
                  {tab.isDirty && (
                    <Circle className="w-2 h-2 flex-shrink-0 fill-current" />
                  )}
                </div>
                <button
                  className={`
                    w-8 h-[34px] flex items-center justify-center flex-shrink-0
                    hover:bg-[#2d2d2d] transition-colors
                    ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
      {activeTabId && tabs.find(t => t.id === activeTabId)?.type === 'file' && (
        <button
          onClick={() => togglePreview(activeTabId)}
          className="px-3 py-1 flex items-center gap-1 text-sm hover:bg-[#2d2d2d] transition-colors mr-2"
          title="Open Preview (⌘P)"
        >
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </button>
      )}
    </div>
  );
}