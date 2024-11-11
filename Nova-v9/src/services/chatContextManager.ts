import { FileContext } from '../types/context';
import { useChunkingStore } from '../store/chunkingStore';
import { ErrorHandler } from '../utils/errorHandler';

export class ChatContextManager {
  private readonly logger = useChunkingStore.getState;

  async processContext(contexts: FileContext[]): Promise<FileContext[]> {
    const { addLog } = this.logger();
    
    try {
      addLog('Processing chat context...', 'info', 'chat');
      
      // Optimize for chat: Semantic chunking for better understanding
      const processedContexts = await Promise.all(
        contexts.map(async (context) => {
          const chunks = await this.semanticChunking(context);
          return {
            ...context,
            chunks
          };
        })
      );

      addLog(`Processed ${contexts.length} files for chat`, 'success', 'chat');
      return processedContexts;
    } catch (error) {
      throw ErrorHandler.handle(error, 'Processing chat context');
    }
  }

  private async semanticChunking(context: FileContext): Promise<string[]> {
    // Implement semantic chunking optimized for chat understanding
    const chunks = context.content.split(/\n\n+/);
    return chunks.filter(chunk => chunk.trim().length > 0);
  }
}