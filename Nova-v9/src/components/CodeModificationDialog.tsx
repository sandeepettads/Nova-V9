import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { CodeModification } from '../types/codeModification';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useChunkingStore } from '../store/chunkingStore';

interface CodeModificationDialogProps {
  modification: CodeModification;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function CodeModificationDialog({
  modification,
  onAccept,
  onReject,
  onClose
}: CodeModificationDialogProps) {
  const { writeFile } = useFileSystemStore();
  const { updateTabContent } = useWorkspaceStore();
  const { addLog } = useChunkingStore();

  const handleAccept = async () => {
    try {
      addLog('Applying code modifications', 'info', 'file-system');
      addLog(`Writing changes to file: ${modification.filePath}`, 'info', 'file-system');
      
      await writeFile(modification.filePath, modification.modifiedCode);
      addLog('File updated successfully', 'success', 'file-system');
      
      addLog('Updating editor content', 'info', 'editor');
      updateTabContent(modification.filePath, modification.modifiedCode);
      addLog('Editor content updated', 'success', 'editor');
      
      onAccept();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error applying modifications: ${errorMessage}`, 'error', 'file-system');
      console.error('Error applying modifications:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#252526] rounded-lg shadow-xl w-[800px] max-h-[80vh] flex flex-col border border-[#2d2d2d]">
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-[#e1e1e1]">Review Code Changes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2d2d2d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[#e1e1e1]">File: {modification.filePath}</h3>
            <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm whitespace-pre overflow-x-auto">
              {modification.changes.map((change, index) => (
                <div
                  key={index}
                  className={`${
                    change.type === 'addition' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {change.type === 'addition' ? '+ ' : '- '}{change.content}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[#e1e1e1]">Modified Code</h3>
            <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm whitespace-pre overflow-x-auto">
              {modification.modifiedCode}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-[#2d2d2d]">
          <button
            onClick={onReject}
            className="px-4 py-2 text-sm rounded hover:bg-[#2d2d2d] transition-colors text-[#e1e1e1]"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm rounded bg-green-600 hover:bg-green-700 transition-colors text-white flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Accept Changes
          </button>
        </div>
      </div>
    </div>
  );
}