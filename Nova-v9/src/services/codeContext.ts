import { FileNode } from '../types/files';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useChunkingStore } from '../store/chunkingStore';

export class CodeContextManager {
  private static readonly SUPPORTED_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.scss', '.less',
    '.vue', '.svelte', '.java', '.py', '.rb', '.php', '.go', '.rs',
    '.cs', '.cpp', '.c', '.h', '.hpp', '.json', '.yaml', '.yml',
    '.xml', '.toml', '.ini', '.sh', '.bash', '.zsh', '.ps1',
    '.md', '.mdx', '.txt', '.sql', '.graphql', '.prisma', '.env',
    '.config'
  ]);

  static async getOpenFiles(): Promise<FileNode[]> {
    const { readDir, readFile } = useFileSystemStore.getState();
    const { addLog } = useChunkingStore.getState();
    const processedFiles: FileNode[] = [];

    async function traverseDirectory(path: string): Promise<void> {
      try {
        const files = await readDir(path);
        addLog(`Scanning directory: ${path}`, 'info');

        if (!files || files.length === 0) {
          addLog(`Directory is empty: ${path}`, 'info');
          return;
        }

        for (const file of files) {
          const fullPath = path === '/' ? `/${file}` : `${path}/${file}`;
          const isDirectory = !file.includes('.');

          if (isDirectory) {
            if (!['node_modules', '.git', 'dist', 'build', 'coverage', 'responses'].includes(file)) {
              await traverseDirectory(fullPath);
            }
          } else {
            const ext = '.' + file.split('.').pop()?.toLowerCase();
            if (CodeContextManager.SUPPORTED_EXTENSIONS.has(ext)) {
              try {
                const content = await readFile(fullPath);
                if (content) {
                  processedFiles.push({
                    path: fullPath,
                    name: file,
                    isDirectory: false,
                    content // Store content directly in the FileNode
                  });
                  addLog(`Found processable file: ${fullPath}`, 'info');
                }
              } catch (error) {
                addLog(`Error reading file ${fullPath}: ${error.message}`, 'warning');
              }
            }
          }
        }
      } catch (error) {
        addLog(`Error scanning directory ${path}: ${error.message}`, 'error');
      }
    }

    try {
      await traverseDirectory('/');
      if (processedFiles.length === 0) {
        addLog('No processable files found. Please check if your files have supported extensions.', 'warning');
      } else {
        addLog(`Found ${processedFiles.length} processable files`, 'success');
      }
      return processedFiles;
    } catch (error) {
      addLog(`Error scanning files: ${error.message}`, 'error');
      return [];
    }
  }

  static async getFileContent(path: string): Promise<string> {
    const { readFile } = useFileSystemStore.getState();
    const { addLog } = useChunkingStore.getState();
    
    try {
      const content = await readFile(path);
      if (!content) {
        throw new Error('File is empty or unreadable');
      }
      addLog(`Successfully read file: ${path}`, 'info');
      return content;
    } catch (error) {
      addLog(`Error reading file ${path}: ${error.message}`, 'error');
      throw error;
    }
  }

  static async getContextForPaths(paths: string[]): Promise<FileNode[]> {
    const { addLog } = useChunkingStore.getState();
    const allFiles = await this.getOpenFiles();

    if (paths.includes('Codebase') || paths.includes('/')) {
      addLog('Loading entire codebase context', 'info');
      return allFiles;
    }

    const matchingFiles = allFiles.filter(file => {
      return paths.some(path => {
        path = path.startsWith('@') ? path.slice(1) : path;
        // For directories, match all files under that directory
        if (!path.includes('.')) {
          return file.path.startsWith(path);
        }
        // For specific files, match exactly
        return file.path === path;
      });
    });

    if (matchingFiles.length === 0) {
      addLog('No matching files found for the specified paths', 'warning');
    } else {
      addLog(`Found ${matchingFiles.length} matching files`, 'success');
    }

    return matchingFiles;
  }
}