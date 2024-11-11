import { FileContext } from '../types/context';
import { BaseContextManager } from './baseContextManager';
import { ChatContextManager } from './chatContextManager';
import { CodeModificationContextManager } from './codeModificationContextManager';
import { useChunkingStore } from '../store/chunkingStore';
import { ErrorHandler } from '../utils/errorHandler';

export class ContextManager {
  private static readonly logger = useChunkingStore.getState;
  private static instance: ContextManager;

  private baseManager: BaseContextManager;
  private chatManager: ChatContextManager;
  private codeModManager: CodeModificationContextManager;

  private constructor() {
    this.baseManager = new BaseContextManager();
    this.chatManager = new ChatContextManager();
    this.codeModManager = new CodeModificationContextManager();
  }

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  async buildContext(references: string[], type: 'chat' | 'modification'): Promise<FileContext[]> {
    const { addLog } = ContextManager.logger();
    
    try {
      addLog('Building context...', 'info', 'context');
      
      // Use base manager for common operations
      const baseContext = await this.baseManager.resolveReferences(references);
      
      // Use specialized manager based on type
      if (type === 'chat') {
        return this.chatManager.processContext(baseContext);
      } else {
        return this.codeModManager.processContext(baseContext);
      }
    } catch (error) {
      throw ErrorHandler.handle(error, 'Building context');
    }
  }

  async getFileContent(path: string): Promise<string> {
    return this.baseManager.getFileContent(path);
  }

  async validatePath(path: string): Promise<boolean> {
    return this.baseManager.validatePath(path);
  }
}