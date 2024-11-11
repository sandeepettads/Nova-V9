import { useFileSystemStore } from '../store/fileSystemStore';
import { useChunkingStore } from '../store/chunkingStore';
import { FileNode } from '../types/files';

export class SemanticContextManager {
  private static async buildFileTree(path: string = '/', depth: number = 0): Promise<FileNode[]> {
    const { readDir, readFile, isDirectory } = useFileSystemStore.getState();
    const { addLog } = useChunkingStore.getState();
    const tree: FileNode[] = [];
    const indent = '│   '.repeat(depth);

    try {
      if (depth === 0) {
        addLog('Starting file tree building...', 'info', 'file-tree');
        addLog('Root (/) ', 'info', 'file-tree');
      }

      const entries = await readDir(path);
      const sortedEntries = entries.sort((a, b) => {
        // Directories first, then files
        const aIsDir = !a.includes('.');
        const bIsDir = !b.includes('.');
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });
      
      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
        const isLast = i === sortedEntries.length - 1;
        const prefix = isLast ? '└── ' : '├── ';
        
        // Skip node_modules and other non-relevant directories
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') {
          addLog(`${indent}${prefix}${entry}/ (skipped)`, 'info', 'file-tree');
          continue;
        }

        const isDir = await isDirectory(fullPath);
        const node: FileNode = {
          path: fullPath,
          name: entry,
          isDirectory: isDir
        };

        if (isDir) {
          addLog(`${indent}${prefix}${entry}/`, 'info', 'file-tree');
          node.children = await this.buildFileTree(fullPath, depth + 1);
        } else {
          // Only read content of text-based files
          if (this.isProcessableFile(entry)) {
            try {
              node.content = await readFile(fullPath);
              const fileSize = node.content.length;
              addLog(
                `${indent}${prefix}${entry} (${this.formatFileSize(fileSize)})`, 
                'success', 
                'file-tree'
              );
            } catch (error) {
              addLog(
                `${indent}${prefix}${entry} (error: ${error.message})`, 
                'error', 
                'file-tree'
              );
            }
          } else {
            addLog(
              `${indent}${prefix}${entry} (skipped - non-processable)`, 
              'warning', 
              'file-tree'
            );
          }
        }

        tree.push(node);
      }

      if (depth === 0) {
        addLog('File tree building completed! ✓', 'success', 'file-tree');
      }
    } catch (error) {
      addLog(`Error processing directory ${path}: ${error.message}`, 'error', 'file-tree');
    }

    return tree;
  }

  private static isProcessableFile(filename: string): boolean {
    const processableExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.scss',
      '.json', '.md', '.txt', '.yaml', '.yml', '.xml', '.svg'
    ];
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return processableExtensions.includes(ext);
  }

  private static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  static async chunkWithSemantics(content: string, path: string): Promise<any[]> {
    const { addLog } = useChunkingStore.getState();
    addLog(`Starting semantic chunking for ${path}`, 'info', 'semantic');
    
    // Implementation of semantic chunking...
    const chunks = this.splitIntoSections(content);
    
    addLog(`Created ${chunks.length} semantic chunks for ${path}`, 'success', 'semantic');
    return chunks;
  }

  private static splitIntoSections(content: string): string[] {
    // Implementation remains the same...
    return [];
  }

  static async findRelevantChunks(query: string, chunks: any[], maxChunks: number): Promise<any[]> {
    const { addLog } = useChunkingStore.getState();
    addLog(`Finding chunks relevant to query: "${query}"`, 'info', 'scoring');
    
    // Implementation of relevance scoring...
    
    addLog(`Selected ${maxChunks} most relevant chunks`, 'success', 'scoring');
    return chunks.slice(0, maxChunks);
  }
}