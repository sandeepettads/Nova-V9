import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder } from 'lucide-react';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useChunkingStore } from '../store/chunkingStore';

interface FileTreeNodeProps {
  name: string;
  path: string;
  isDirectory: boolean;
  level: number;
  isLast: boolean;
  onFileSelect: (path: string) => void;
}

export default function FileTreeNode({
  name,
  path,
  isDirectory,
  level,
  isLast,
  onFileSelect
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const [children, setChildren] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { readDir } = useFileSystemStore();
  const { addLog } = useChunkingStore();

  useEffect(() => {
    if (isDirectory && isExpanded) {
      loadChildren();
    }
  }, [isDirectory, isExpanded, path]);

  const loadChildren = async () => {
    if (!isDirectory) return;

    try {
      const entries = await readDir(path);
      const sortedEntries = entries
        .filter(entry => !entry.startsWith('.') && entry !== 'node_modules')
        .sort((a, b) => {
          const aIsDir = !a.includes('.');
          const bIsDir = !b.includes('.');
          if (aIsDir && !bIsDir) return -1;
          if (!aIsDir && bIsDir) return 1;
          return a.localeCompare(b);
        });
      
      setChildren(sortedEntries);
      setError(null);
      
      // Auto-expand first level directories
      if (level === 0) {
        setIsExpanded(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load directory contents';
      console.error(`Error reading directory ${path}:`, err);
      setError(message);
      addLog(`Error loading directory ${path}: ${message}`, 'error');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(path);
    }
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    }
  };

  if (path === '/responses' || path.startsWith('/responses/')) {
    return null;
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 hover:bg-[#2d2d2d] cursor-pointer text-[#cccccc] transition-colors duration-200 ${
          isExpanded ? 'bg-[#2d2d2d]' : ''
        }`}
        style={{ paddingLeft: `${(level + 1) * 12}px` }}
        onClick={handleClick}
      >
        <span className="w-4" onClick={handleIconClick}>
          {isDirectory && (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}
        </span>
        {isDirectory ? <Folder size={16} /> : <FileText size={16} />}
        <span className="ml-1 text-sm truncate">{name}</span>
      </div>

      {isDirectory && isExpanded && (
        <div>
          {error ? (
            <div className="text-xs text-red-400 py-1 px-4" style={{ paddingLeft: `${(level + 2) * 12}px` }}>
              {error}
            </div>
          ) : (
            children.map((child, index) => (
              <FileTreeNode
                key={`${path}/${child}`}
                name={child}
                path={`${path}/${child}`}
                isDirectory={!child.includes('.')}
                level={level + 1}
                isLast={index === children.length - 1}
                onFileSelect={onFileSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}