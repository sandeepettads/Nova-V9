import { FileContext } from '../types/context';
import { useChunkingStore } from '../store/chunkingStore';
import { ErrorHandler } from '../utils/errorHandler';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export class CodeModificationContextManager {
  private readonly logger = useChunkingStore.getState;

  async processContext(contexts: FileContext[]): Promise<FileContext[]> {
    const { addLog } = this.logger();
    
    try {
      addLog('Processing code modification context...', 'info', 'modification');
      
      // Optimize for code modification: AST-based chunking for precise changes
      const processedContexts = await Promise.all(
        contexts.map(async (context) => {
          const chunks = await this.astChunking(context);
          return {
            ...context,
            chunks
          };
        })
      );

      addLog(`Processed ${contexts.length} files for modification`, 'success', 'modification');
      return processedContexts;
    } catch (error) {
      throw ErrorHandler.handle(error, 'Processing modification context');
    }
  }

  private async astChunking(context: FileContext): Promise<any[]> {
    try {
      const ast = parse(context.content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy']
      });

      const chunks: any[] = [];

      // @ts-ignore - Types compatibility
      traverse(ast, {
        FunctionDeclaration(path: any) {
          chunks.push({
            type: 'function',
            content: context.content.slice(path.node.start, path.node.end),
            location: { start: path.node.start, end: path.node.end }
          });
        },
        ClassDeclaration(path: any) {
          chunks.push({
            type: 'class',
            content: context.content.slice(path.node.start, path.node.end),
            location: { start: path.node.start, end: path.node.end }
          });
        }
      });

      return chunks;
    } catch (error) {
      // Fallback to simple chunking if AST parsing fails
      return [{
        type: 'file',
        content: context.content,
        location: { start: 0, end: context.content.length }
      }];
    }
  }
}