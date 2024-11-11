import React, { useEffect, useRef } from 'react';
import { Trash2, Edit2, Copy, Download, FolderPlus } from 'lucide-react';

interface FileContextMenuProps {
  x: number;
  y: number;
  isDirectory: boolean;
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onNewFolder?: () => void;
}

export default function FileContextMenu({
  x,
  y,
  isDirectory,
  onClose,
  onDelete,
  onRename,
  onCopy,
  onDownload,
  onNewFolder
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const MenuItem = ({ icon: Icon, label, onClick, className = '' }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={`w-full px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-[#2d2d2d] ${className}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#252526] rounded shadow-lg border border-[#2d2d2d] min-w-[160px] py-1"
      style={{
        left: x,
        top: y,
        maxHeight: '80vh',
        overflow: 'auto'
      }}
    >
      {isDirectory && onNewFolder && (
        <MenuItem icon={FolderPlus} label="New Folder" onClick={onNewFolder} />
      )}
      <MenuItem icon={Edit2} label="Rename" onClick={onRename} />
      <MenuItem icon={Copy} label="Copy Path" onClick={onCopy} />
      {!isDirectory && (
        <MenuItem icon={Download} label="Download" onClick={onDownload} />
      )}
      <MenuItem
        icon={Trash2}
        label="Delete"
        onClick={onDelete}
        className="text-red-400 hover:text-red-300"
      />
    </div>
  );
}