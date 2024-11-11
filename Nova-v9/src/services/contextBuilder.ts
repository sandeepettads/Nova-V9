import { useFileSystemStore } from '../store/fileSystemStore';
import { useChunkingStore } from '../store/chunkingStore';
import { FileSystemUtils } from '../utils/fileSystem';

export interface FileContext {
  path: string;
  content: string;
  relativePath: string;
  type: string;
}

export class ContextBuilder {
  private static readonly logger = useChunkingStore.getState;
  private static readonly fs = useFileSystemStore.getState;

  static async buildContext(references: string[]): Promise<FileContext[]> {
    const { addLog } = this.logger();
    const { readFile } = this.fs();
    
    try {
      addLog('Building file context...', 'info', 'context');
      const contexts: FileContext[] = [];

      // Handle special cases first
      if (references.includes('Codebase') || references.includes('/')) {
        addLog('Processing entire codebase', 'info', 'context');
        return this.processDirectory('/');
      }

      for (const reference of references) {
        try {
          // Clean and normalize reference
          const cleanRef = reference.startsWith('@') ? reference.slice(1) : reference;
          const normalizedPath = this.normalizePath(cleanRef);
          
          addLog(`Processing reference: ${normalizedPath}`, 'info', 'context');

          // Try exact path first
          try {
            const content = await readFile(normalizedPath);
            addLog(`Found file at exact path: ${normalizedPath}`, 'success', 'context');
            contexts.push(this.createContext(normalizedPath, content));
            continue;
          } catch (error) {
            addLog(`File not found at exact path: ${normalizedPath}`, 'info', 'context');
          }

          // Try with spaces preserved for directory names
          const spacePreservedPath = cleanRef.startsWith('/') ? cleanRef : `/${cleanRef}`;
          try {
            const content = await readFile(spacePreservedPath);
            addLog(`Found file with preserved spaces: ${spacePreservedPath}`, 'success', 'context');
            contexts.push(this.createContext(spacePreservedPath, content));
            continue;
          } catch (error) {
            addLog(`File not found with preserved spaces: ${spacePreservedPath}`, 'info', 'context');
          }

          // Check if it's a directory
          const pathsToCheck = [normalizedPath, spacePreservedPath];
          let dirFound = false;
          
          for (const pathToCheck of pathsToCheck) {
            const isDir = await FileSystemUtils.isDirectory(pathToCheck);
            if (isDir) {
              addLog(`Found directory: ${pathToCheck}`, 'info', 'context');
              const dirContexts = await this.processDirectory(pathToCheck);
              contexts.push(...dirContexts);
              dirFound = true;
              break;
            }
          }

          if (!dirFound) {
            addLog(`Unable to resolve reference: ${reference}`, 'warning', 'context');
          }
        } catch (error) {
          addLog(`Error processing reference: ${reference}`, 'error', 'context');
        }
      }

      if (contexts.length === 0) {
        throw new Error('No valid file contexts found');
      }

      addLog(`Built context for ${contexts.length} files`, 'success', 'context');
      return contexts;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error building context: ${message}`, 'error', 'context');
      throw error;
    }
  }

  private static async processDirectory(path: string): Promise<FileContext[]> {
    const { addLog } = this.logger();
    const { readDir, readFile } = this.fs();
    const contexts: FileContext[] = [];

    try {
      const entries = await readDir(path);
      addLog(`Scanning directory: ${path}`, 'info', 'context');

      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') {
          continue;
        }

        const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
        
        try {
          const isDir = await FileSystemUtils.isDirectory(fullPath);
          
          if (isDir) {
            const subContexts = await this.processDirectory(fullPath);
            contexts.push(...subContexts);
          } else if (this.isProcessableFile(entry)) {
            const content = await readFile(fullPath);
            contexts.push(this.createContext(fullPath, content));
            addLog(`Added file to context: ${fullPath}`, 'success', 'context');
          }
        } catch (error) {
          addLog(`Error processing entry ${fullPath}`, 'warning', 'context');
        }
      }

      return contexts;
    } catch (error) {
      addLog(`Error reading directory ${path}`, 'error', 'context');
      throw error;
    }
  }

  private static createContext(path: string, content: string): FileContext {
    return {
      path,
      content,
      relativePath: path.startsWith('/') ? path.slice(1) : path,
      type: path.split('.').pop()?.toLowerCase() || ''
    };
  }

  private static normalizePath(path: string): string {
    // Remove @ if present
    path = path.startsWith('@') ? path.slice(1) : path;
    
    // Ensure leading slash
    path = path.startsWith('/') ? path : `/${path}`;
    
    // Clean up multiple slashes
    path = path.replace(/\/+/g, '/');
    
    // Remove trailing slash
    path = path.endsWith('/') ? path.slice(0, -1) : path;
    
    return path;
  }

  private static isProcessableFile(filename: string): boolean {
    const processableExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.scss',
      '.json', '.md', '.txt', '.yaml', '.yml', '.xml', '.svg'
    ];
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return processableExtensions.includes(ext);
  }
}