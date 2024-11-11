import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Code2, Brain, X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useChunkingStore } from '../store/chunkingStore';
import { CodeProcessor } from '../services/codeProcessor';
import ChunkingProgress from './ChunkingProgress';
import LogViewer from './LogViewer';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { chunker, maxChunkSize, maxChunks, setChunker, setMaxChunkSize, setMaxChunks } = useSettingsStore();
  const { 
    isProcessing, 
    progress, 
    status, 
    logs, 
    startProcessing, 
    completeProcessing, 
    setStatus, 
    clearLogs,
    setProgress,
    addLog 
  } = useChunkingStore();

  const [localChunker, setLocalChunker] = useState(chunker);
  const [localMaxChunkSize, setLocalMaxChunkSize] = useState(maxChunkSize);
  const [localMaxChunks, setLocalMaxChunks] = useState(maxChunks);
  const [showLogs, setShowLogs] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLocalChunker(chunker);
      setLocalMaxChunkSize(maxChunkSize);
      setLocalMaxChunks(maxChunks);
    }
  }, [isOpen, chunker, maxChunkSize, maxChunks]);

  const handleSave = async () => {
    try {
      startProcessing();
      clearLogs();
      
      addLog('Starting file tree building...', 'info', 'file-tree');
      
      // Update settings immediately
      setChunker(localChunker);
      setMaxChunkSize(localMaxChunkSize);
      setMaxChunks(localMaxChunks);

      // Process a sample file to verify settings
      const sampleContent = '// Sample content for testing\nfunction test() { return true; }';
      const result = await CodeProcessor.processCode([
        { path: 'test.ts', content: sampleContent }
      ], {
        chunker: localChunker,
        maxChunkSize: localMaxChunkSize,
        maxChunks: localMaxChunks
      });

      if (result.status === 'completed') {
        addLog('Settings applied successfully', 'success');
        setProgress(100);
        setStatus('Settings saved');
      } else {
        throw new Error('Processing failed');
      }

      completeProcessing();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus('Error saving settings');
      addLog(message, 'error');
      completeProcessing();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#252526] w-[600px] rounded-lg shadow-xl border border-[#2d2d2d] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d]">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-[#e1e1e1]">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2d2d2d] transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium text-[#e1e1e1] mb-4">Code Context Processing</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  localChunker === 'ast'
                    ? 'border-[#ff6b2b] bg-[#ff6b2b]/10'
                    : 'border-[#2d2d2d] hover:border-[#ff6b2b]/50'
                }`}
                onClick={() => !isProcessing && setLocalChunker('ast')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="w-5 h-5" />
                  <span className="font-medium">AST-Based Chunking</span>
                </div>
                <p className="text-sm text-[#8c8c8c]">
                  Analyzes code structure using Abstract Syntax Trees. Best for maintaining code hierarchy.
                </p>
              </div>

              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  localChunker === 'semantic'
                    ? 'border-[#ff6b2b] bg-[#ff6b2b]/10'
                    : 'border-[#2d2d2d] hover:border-[#ff6b2b]/50'
                }`}
                onClick={() => !isProcessing && setLocalChunker('semantic')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5" />
                  <span className="font-medium">Semantic Chunking</span>
                </div>
                <p className="text-sm text-[#8c8c8c]">
                  Uses AI embeddings to maintain semantic meaning. Best for understanding context.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#e1e1e1] mb-2">
                Maximum Chunk Size (characters)
              </label>
              <input
                type="number"
                value={localMaxChunkSize}
                onChange={(e) => setLocalMaxChunkSize(Number(e.target.value))}
                className="w-full bg-[#1e1e1e] rounded px-3 py-2 text-sm border border-[#2d2d2d] focus:outline-none focus:border-[#ff6b2b]"
                min={500}
                max={5000}
                disabled={isProcessing}
              />
              <p className="mt-1 text-xs text-[#8c8c8c]">
                Recommended: 2000 for AST-Based, 1000 for Semantic
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e1e1e1] mb-2">
                Maximum Chunks per Request
              </label>
              <input
                type="number"
                value={localMaxChunks}
                onChange={(e) => setLocalMaxChunks(Number(e.target.value))}
                className="w-full bg-[#1e1e1e] rounded px-3 py-2 text-sm border border-[#2d2d2d] focus:outline-none focus:border-[#ff6b2b]"
                min={1}
                max={10}
                disabled={isProcessing}
              />
              <p className="mt-1 text-xs text-[#8c8c8c]">
                Limit the number of code chunks sent with each request
              </p>
            </div>
          </div>

          {isProcessing && (
            <ChunkingProgress
              progress={progress}
              status={status}
              isComplete={progress === 100}
            />
          )}
          
          {(isProcessing || logs.length > 0) && (
            <LogViewer
              logs={logs}
              isExpanded={showLogs}
              onToggle={() => setShowLogs(!showLogs)}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-[#2d2d2d]">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={`
              px-4 py-2 text-sm rounded transition-colors
              ${isProcessing
                ? 'text-[#8c8c8c] cursor-not-allowed'
                : 'text-[#e1e1e1] hover:bg-[#2d2d2d]'
              }
            `}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className={`
              px-4 py-2 text-sm rounded transition-colors
              ${isProcessing
                ? 'bg-[#2d2d2d] text-[#8c8c8c] cursor-not-allowed'
                : 'bg-[#ff6b2b] hover:bg-[#ff8142] text-white'
              }
            `}
          >
            {isProcessing ? 'Processing...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}