import React, { useState } from 'react';
import FileTree from './FileTree';
import Editor from './Editor';
import ConsolePanel from './ConsolePanel';
import PanelResizer from './PanelResizer';
import { useWorkspaceStore } from '../store/workspaceStore';

export default function WorkspacePanel() {
  const [explorerWidth, setExplorerWidth] = useState(384);
  const { addTab } = useWorkspaceStore();

  const handleFileSelect = (path: string, content: string) => {
    addTab({
      path,
      content,
      type: 'file'
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
      <div className="flex-1 flex min-h-0">
        <div 
          style={{ width: `${explorerWidth}px` }}
          className="flex-shrink-0 border-r border-[#2d2d2d] overflow-hidden transition-all duration-200"
        >
          <FileTree onFileSelect={handleFileSelect} />
        </div>
        <PanelResizer
          position={explorerWidth}
          onResize={setExplorerWidth}
          minWidth={240}
          maxWidth={480}
        />
        <div className="flex-1 overflow-hidden">
          <Editor />
        </div>
      </div>
      <ConsolePanel />
    </div>
  );
}