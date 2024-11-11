import { FileContext } from '../types/context';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useChunkingStore } from '../store/chunkingStore';
import { FileSystemUtils } from '../utils/fileSystem';
import { ErrorHandler } from '../utils/errorHandler';

export class BaseContextManager {
  private readonly logger = useChunkingStore.getState;
  private readonly fs = useFileSystemStore.getState;

  async resolveReferences(references: string[]): Promise<FileContext[]> {
    const { addLog } = this.logger();
    const contexts: FileContext[] = [];

    try {
      // Handle special cases
      if (references.includes('Codebase') || references.includes('/')) {
        return this.processDirectory('/');
      }

      for (const ref of references) {
        const cleanRef = this.cleanReference(ref);
        const resolvedPaths = await this.resolvePath(cleanRef);
        
        for (const path of resolvedPaths) {
          const content = await this.getFileContent(path);
          if (content) {
            contexts.push(this.createContext(path, content));
          }
        }
      }

      return contexts;
    } catch (error) {
      throw ErrorHandler.handle(error, 'Resolving references');
    }
  }

  private cleanReference(ref: string): string {
    return ref.startsWith('@') ? ref.slice(1) : ref;
  }

  private async resolvePath(path: string): Promise<string[]> {
    const paths = [
      path,
      path.startsWith('/') ? path : `/${path}`,
      path.replace(/\s+/g, '')
    ];

    const validPaths = [];
    for (const p of paths) {
      if (await this.validatePath(p)) {
        validPaths.push(p);
      }
    }

    return validPaths;
  }

  async validatePath(path: string): Promise<boolean> {
    return FileSystemUtils.exists(path);
  }

  async getFileContent(path: string): Promise<string> {
    return FileSystemUtils.readFileContent(path);
  }

  private async processDirectory(path: string): Promise<FileContext[]> {
    const { addLog } = this.logger();
    const contexts: FileContext[] = [];

    try {
      const entries = await FileSystemUtils.listDirectory(path);
      
      for (const entry of entries) {
        if (this.shouldSkipEntry(entry)) continue;

        const fullPath = this.buildPath(path, entry);
        if (await FileSystemUtils.isDirectory(fullPath)) {
          const subContexts = await this.processDirectory(fullPath);
          contexts.push(...subContexts);
        } else if (this.isProcessableFile(entry)) {
          const content = await this.getFileContent(fullPath);
          contexts.push(this.createContext(fullPath, content));
        }
      }

      return contexts;
    } catch (error) {
      throw ErrorHandler.handle(error, `Processing directory: ${path}`);
    }
  }

  private shouldSkipEntry(entry: string): boolean {
    return entry.startsWith('.') || 
           entry === 'node_modules' || 
           entry === 'dist';
  }

  private buildPath(base: string, entry: string): string {
    return base === '/' ? `/${entry}` : `${base}/${entry}`;
  }

  private isProcessableFile(filename: string): boolean {
    const processableExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.scss',
      '.json', '.md', '.txt', '.yaml', '.yml', '.xml', '.svg'
    ];
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return processableExtensions.includes(ext);
  }

  protected createContext(path: string, content: string): FileContext {
    return {
      path,
      content,
      relativePath: path.startsWith('/') ? path.slice(1) : path,
      type: path.split('.').pop()?.toLowerCase() || ''
    };
  }
}