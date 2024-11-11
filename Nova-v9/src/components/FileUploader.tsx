import React, { useRef } from 'react';
import { Upload, FolderPlus } from 'lucide-react';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useChunkingStore } from '../store/chunkingStore';

interface FileUploaderProps {
  onFilesUploaded: () => Promise<void>;
}

export default function FileUploader({ onFilesUploaded }: FileUploaderProps) {
  const { writeFile, createDir, initialize, clearFileSystem } = useFileSystemStore();
  const { addLog } = useChunkingStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    try {
      addLog('Initializing file system...', 'info');
      await initialize();
      await clearFileSystem();

      for (const file of Array.from(files)) {
        try {
          addLog(`Reading file: ${file.name}`, 'info');
          const content = await readFileContent(file);
          
          const filePath = `/${file.name}`;
          addLog(`Writing file: ${filePath}`, 'info');
          await writeFile(filePath, content);
          addLog(`Successfully uploaded: ${filePath}`, 'success');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Failed to upload ${file.name}: ${message}`, 'error');
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
      addLog('File upload completed', 'success');
      await onFilesUploaded();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error uploading files: ${message}`, 'error');
    }
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    try {
      addLog('Initializing file system...', 'info');
      await initialize();
      await clearFileSystem();

      const processedPaths = new Set<string>();
      const rootFolder = files[0].webkitRelativePath.split('/')[0];

      // First, create the root folder
      addLog(`Creating root folder: ${rootFolder}`, 'info');
      await createDir(`/${rootFolder}`);
      processedPaths.add(`/${rootFolder}`);

      for (const file of Array.from(files)) {
        try {
          const relativePath = file.webkitRelativePath;
          if (!relativePath) {
            addLog(`Invalid path for file: ${file.name}`, 'warning');
            continue;
          }

          // Keep the full path including the root folder
          const fullPath = `/${relativePath}`;
          const dirs = relativePath.split('/');
          
          // Create all necessary directories
          let currentPath = '';
          for (let i = 0; i < dirs.length - 1; i++) {
            currentPath += '/' + dirs[i];
            if (!processedPaths.has(currentPath)) {
              addLog(`Creating directory: ${currentPath}`, 'info');
              await createDir(currentPath);
              processedPaths.add(currentPath);
            }
          }

          addLog(`Reading file: ${relativePath}`, 'info');
          const content = await readFileContent(file);
          
          addLog(`Writing file: ${fullPath}`, 'info');
          await writeFile(fullPath, content);
          addLog(`Successfully uploaded: ${fullPath}`, 'success');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Failed to process ${file.webkitRelativePath}: ${message}`, 'error');
        }
      }

      if (folderInputRef.current) folderInputRef.current.value = '';
      addLog('Folder upload completed', 'success');
      await onFilesUploaded();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error uploading folder: ${message}`, 'error');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
          multiple
          accept="*/*"
        />
        <label
          htmlFor="file-upload"
          className="p-1 hover:bg-[#2d2d2d] rounded cursor-pointer transition-colors flex items-center gap-1"
          title="Upload files"
        >
          <Upload className="w-4 h-4" />
        </label>
      </div>
      <div className="relative">
        <input
          ref={folderInputRef}
          type="file"
          onChange={handleFolderUpload}
          className="hidden"
          id="folder-upload"
          webkitdirectory=""
          directory=""
          multiple
        />
        <label
          htmlFor="folder-upload"
          className="p-1 hover:bg-[#2d2d2d] rounded cursor-pointer transition-colors flex items-center gap-1"
          title="Upload folder"
        >
          <FolderPlus className="w-4 h-4" />
        </label>
      </div>
    </div>
  );
}