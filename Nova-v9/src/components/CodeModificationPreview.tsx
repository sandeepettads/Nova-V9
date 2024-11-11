import React from 'react';
import { Check, X } from 'lucide-react';
import { CodeModification } from '../types/codeModification';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useChunkingStore } from '../store/chunkingStore';

interface CodeModificationPreviewProps {
  modification: CodeModification;
  onAccept: () => void;
  onReject: () => void;
}

export default function CodeModificationPreview({
  modification,
  onAccept,
  onReject
}: CodeModificationPreviewProps) {
  const { writeFile } = useFileSystemStore();
  const { updateTabContent } = useWorkspaceStore();
  const { addLog } = useChunkingStore();

  const handleAccept = async () => {
    try {
      addLog('Applying code modifications...', 'info', 'processing');
      await writeFile(modification.filePath, modification.modifiedCode);
      updateTabContent(modification.filePath, modification.modifiedCode);
      addLog('Code modifications applied successfully', 'success', 'processing');
      onAccept();
    } catch (error) {
      addLog(`Error applying modifications: ${error}`, 'error', 'processing');
    }
  };

  return (
    <div className="absolute inset-0 bg-[#1e1e1e] flex flex-col">
      <div className="flex items-center justify-between p-2 bg-[#252526] border-b border-[#2d2d2d]">
        <span className="text-sm text-[#e1e1e1]">Review Changes: {modification.filePath}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="px-3 py-1 text-sm rounded hover:bg-[#2d2d2d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleAccept}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-1 font-mono text-sm">
          {modification.changes.map((change, index) => (
            <div
              key={index}
              className={`px-2 ${
                change.type === 'addition' 
                  ? 'bg-green-950/30 text-green-400' 
                  : 'bg-red-950/30 text-red-400'
              }`}
            >
              {change.type === 'addition' ? '+ ' : '- '}
              {change.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}