import React, { useState, useEffect } from 'react';
import { Upload, FolderPlus, AlertCircle } from 'lucide-react';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useChunkingStore } from '../store/chunkingStore';
import FileTreeNode from './FileTreeNode';
import FileUploader from './FileUploader';
import FileSearch from './FileSearch';
import FileLoadingState from './FileLoadingState';
import FileExplorerErrorBoundary from './FileExplorerErrorBoundary';

interface FileTreeProps {
  onFileSelect?: (path: string, content: string) => void;
  className?: string;
}

export default function FileTree({ onFileSelect, className = '' }: FileTreeProps) {
  const [rootFiles, setRootFiles] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { initialize, readDir, readFile } = useFileSystemStore();
  const { addLog } = useChunkingStore();

  useEffect(() => {
    const initFS = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        
        await initialize();
        addLog('File system initialized', 'success');
        
        await loadFiles();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize file system';
        console.error('File system initialization error:', err);
        setError(message);
        addLog(`Initialization error: ${message}`, 'error');
      } finally {
        setIsInitializing(false);
      }
    };

    initFS();
  }, [initialize, addLog]);

  const loadFiles = async () => {
    try {
      setError(null);
      const files = await readDir('/');
      
      const userFiles = files
        .filter(file => {
          const isSystemFile = file.startsWith('.') || 
                             file === 'node_modules' || 
                             file === 'dist' || 
                             file === 'build' ||
                             file === 'responses';
          return !isSystemFile;
        })
        .sort((a, b) => {
          const aIsDir = !a.includes('.');
          const bIsDir = !b.includes('.');
          if (aIsDir && !bIsDir) return -1;
          if (!aIsDir && bIsDir) return 1;
          return a.localeCompare(b);
        });
      
      setRootFiles(userFiles);
      
      if (userFiles.length > 0) {
        addLog(`Loaded ${userFiles.length} files`, 'success');
      } else {
        addLog('No files found in root directory', 'info');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load files';
      console.error('Error reading root directory:', err);
      setError(message);
      addLog(`Error loading files: ${message}`, 'error');
      setRootFiles([]);
    }
  };

  const handleFileSelect = async (path: string) => {
    try {
      const content = await readFile(path);
      if (content === null || content === undefined) {
        throw new Error('Failed to read file content');
      }

      if (onFileSelect) {
        onFileSelect(path, content);
        addLog(`Opened file: ${path}`, 'success');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      console.error('Error reading file:', err);
      setError(message);
      addLog(`Error reading file: ${message}`, 'error');
    }
  };

  const handleFilesUploaded = async () => {
    setIsInitializing(true);
    try {
      await loadFiles();
      addLog('File tree refreshed after upload', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh files';
      console.error('Error refreshing files:', err);
      setError(message);
      addLog(`Error refreshing files: ${message}`, 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query.toLowerCase());
  };

  const filterFiles = (files: string[]): string[] => {
    if (!searchQuery) return files;
    return files.filter(file => file.toLowerCase().includes(searchQuery));
  };

  if (isInitializing) {
    return <FileLoadingState message="Initializing file system..." />;
  }

  return (
    <FileExplorerErrorBoundary onRetry={loadFiles}>
      <div className={`h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] ${className}`}>
        <div className="p-2 border-b border-[#2d2d2d] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Files</span>
            <FileUploader onFilesUploaded={handleFilesUploaded} />
          </div>
          <FileSearch onSearch={handleSearch} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <span className="text-sm text-red-400">{error}</span>
                <button 
                  onClick={() => loadFiles()}
                  className="px-3 py-1.5 text-sm bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : rootFiles.length > 0 ? (
            filterFiles(rootFiles).map((file, index) => (
              <FileTreeNode
                key={`/${file}`}
                name={file}
                path={`/${file}`}
                isDirectory={!file.includes('.')}
                level={0}
                isLast={index === rootFiles.length - 1}
                onFileSelect={handleFileSelect}
              />
            ))
          ) : (
            <div className="h-full flex items-center justify-center p-4 text-center">
              <div className="bg-[#252526] rounded-lg p-6 max-w-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-3">
                    <Upload className="w-8 h-8 text-[#007acc]" />
                    <FolderPlus className="w-8 h-8 text-[#007acc]" />
                  </div>
                  <div>
                    <h3 className="text-[#e1e1e1] font-medium mb-2">No files yet</h3>
                    <p className="text-sm text-[#8c8c8c] mb-4">
                      Upload files or folders to get started
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <label 
                      htmlFor="file-upload"
                      className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded cursor-pointer text-sm transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload File
                    </label>
                    <label
                      htmlFor="folder-upload"
                      className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded cursor-pointer text-sm transition-colors flex items-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Upload Folder
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FileExplorerErrorBoundary>
  );
}