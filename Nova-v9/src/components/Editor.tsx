import React from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { getLanguageFromPath } from '../utils/languages';
import EditorTabs from './EditorTabs';
import Preview from './Preview';
import LoadingOverlay from './LoadingOverlay';
import { useChunkingStore } from '../store/chunkingStore';

export default function Editor() {
  const { 
    tabs, 
    activeTabId, 
    updateTabContent, 
    setTabDirty,
    pendingModification,
    clearPendingModification 
  } = useWorkspaceStore();

  const { addLog } = useChunkingStore();
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !activeTabId) return;
    updateTabContent(activeTabId, value);
    setTabDirty(activeTabId, true);
  };

  const getModifiedEditorOptions = () => ({
    readOnly: true,
    renderSideBySide: true,
    diffWordWrap: 'on',
    scrollBeyondLastLine: false,
    diffEditor: {
      renderSideBySide: true,
      enableSplitViewResizing: true,
      renderIndicators: true,
      originalEditable: false,
      renderMarginRevertIcon: true,
      ignoreTrimWhitespace: false
    },
    minimap: { enabled: false },
    lineNumbers: 'on',
    renderValidationDecorations: "off",
    padding: { top: 10 },
    automaticLayout: true,
    colorDecorators: true,
    "diffEditor.removedTextBackground": "#ff000033",
    "diffEditor.insertedTextBackground": "#00ff0033",
    "diffEditor.renderSideBySide": true,
    "diffEditor.maxComputationTime": 5000,
    "diffEditor.maxFileSize": 50000000
  });

  const handleAcceptChanges = async () => {
    if (!pendingModification || !activeTab) return;
    
    try {
      addLog('Applying code modifications...', 'info');
      updateTabContent(activeTab.id, pendingModification.modifiedCode);
      addLog('Code modifications applied successfully', 'success');
      clearPendingModification();
    } catch (error) {
      addLog(`Error applying modifications: ${error}`, 'error');
    }
  };

  const getMergedContent = () => {
    if (!activeTab || !pendingModification) return '';

    const changes = pendingModification.changes || [];
    let content = activeTab.content;
    let offset = 0;

    // Sort changes by line number to apply them in order
    changes.sort((a, b) => (a.lineNumber || 0) - (b.lineNumber || 0));

    changes.forEach(change => {
      if (change.type === 'addition') {
        const insertPosition = change.lineNumber ? 
          content.split('\n').slice(0, change.lineNumber - 1).join('\n').length :
          content.length;
        content = content.slice(0, insertPosition + offset) + 
                 '\n' + change.content + 
                 content.slice(insertPosition + offset);
        offset += change.content.length + 1;
      } else if (change.type === 'deletion') {
        const startPosition = content.indexOf(change.content, offset);
        if (startPosition !== -1) {
          content = content.slice(0, startPosition) + 
                   content.slice(startPosition + change.content.length);
          offset -= change.content.length;
        }
      }
    });

    return content;
  };

  if (!activeTab) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[#cccccc] bg-[#1e1e1e]">
        Select a file to edit
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <EditorTabs />
      <div className="flex-1 relative">
        {activeTab.type === 'preview' ? (
          <Preview content={activeTab.content} />
        ) : pendingModification && activeTab.path === pendingModification.filePath ? (
          <div className="h-full flex flex-col">
            <div className="flex-1">
              <MonacoEditor
                height="100%"
                original={activeTab.content}
                modified={getMergedContent()}
                language={getLanguageFromPath(activeTab.path || '')}
                theme="vs-dark"
                options={getModifiedEditorOptions()}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-[#252526] border-t border-[#2d2d2d]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500/30 rounded" />
                  <span className="text-sm text-[#cccccc]">Removed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500/30 rounded" />
                  <span className="text-sm text-[#cccccc]">Added</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => clearPendingModification()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                >
                  Reject Changes
                </button>
                <button
                  onClick={handleAcceptChanges}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                >
                  Accept Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <MonacoEditor
            height="100%"
            language={getLanguageFromPath(activeTab.path || '')}
            theme="vs-dark"
            value={activeTab.content}
            onChange={handleEditorChange}
            options={{
              readOnly: activeTab.type === 'response',
              fontSize: 13,
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'all',
              lineNumbers: 'on',
              renderValidationDecorations: "off",
              padding: { top: 10 },
              automaticLayout: true,
              wordWrap: activeTab.type === 'response' ? 'on' : 'off'
            }}
          />
        )}
      </div>
    </div>
  );
}