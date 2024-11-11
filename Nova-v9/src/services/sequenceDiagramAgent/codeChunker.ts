import { useChunkingStore } from '../../store/chunkingStore';
import { ErrorHandler } from '../../utils/errorHandler';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { CodeChunk } from './types';

export class CodeChunker {
  private readonly logger = useChunkingStore.getState;
  private readonly MAX_CHUNKS = 15;
  private readonly MAX_CHUNK_SIZE = 2000;

  async chunkCode(contexts: any[]): Promise<CodeChunk[]> {
    const { addLog } = this.logger();

    try {
      addLog('Starting code chunking process...', 'info');

      const chunks: CodeChunk[] = [];
      const processedFiles = new Set<string>();

      // First pass: Process TypeScript/JavaScript files
      for (const context of contexts) {
        if (this.isProcessableFile(context.path)) {
          const fileChunks = await this.processFile(context);
          chunks.push(...fileChunks);
          processedFiles.add(context.path);
          addLog(`Processed ${context.path}`, 'info');
        }
      }

      // Second pass: Add other relevant files
      for (const context of contexts) {
        if (!processedFiles.has(context.path) && this.isRelevantFile(context.path)) {
          chunks.push({
            type: 'file',
            path: context.path,
            content: this.truncateContent(context.content)
          });
          addLog(`Added ${context.path} as raw content`, 'info');
        }
      }

      const optimizedChunks = this.optimizeChunks(chunks);
      addLog(`Created ${optimizedChunks.length} code chunks for analysis`, 'info');
      
      return optimizedChunks;

    } catch (error) {
      throw ErrorHandler.handle(error, 'Chunking code');
    }
  }

  private async processFile(context: any): Promise<CodeChunk[]> {
    try {
      const ast = parse(context.content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy']
      });

      const chunks: CodeChunk[] = [];

      // @ts-ignore - Types compatibility
      traverse(ast, {
        FunctionDeclaration: this.createVisitor(chunks, context, 'function'),
        ClassDeclaration: this.createVisitor(chunks, context, 'class'),
        ExportDefaultDeclaration: this.createVisitor(chunks, context, 'export'),
        ImportDeclaration: this.createVisitor(chunks, context, 'import')
      });

      return chunks;

    } catch (error) {
      console.warn(`Falling back to simple chunking for ${context.path}`);
      return [{
        type: 'file',
        path: context.path,
        content: this.truncateContent(context.content)
      }];
    }
  }

  private createVisitor(chunks: CodeChunk[], context: any, type: string) {
    return (path: any) => {
      const content = context.content.slice(path.node.start, path.node.end);
      if (content.length <= this.MAX_CHUNK_SIZE) {
        chunks.push({
          type,
          path: context.path,
          content
        });
      }
    };
  }

  private optimizeChunks(chunks: CodeChunk[]): CodeChunk[] {
    return chunks
      .sort((a, b) => this.getChunkImportance(b) - this.getChunkImportance(a))
      .slice(0, this.MAX_CHUNKS);
  }

  private getChunkImportance(chunk: CodeChunk): number {
    let score = 0;
    const content = chunk.content.toLowerCase();

    // Score based on type
    switch (chunk.type) {
      case 'class': score += 5; break;
      case 'function': score += 4; break;
      case 'export': score += 3; break;
      case 'import': score += 2; break;
    }

    // Score based on content
    if (content.includes('component')) score += 3;
    if (content.includes('service')) score += 3;
    if (content.includes('api')) score += 2;
    if (content.includes('store')) score += 2;
    if (content.includes('context')) score += 2;
    if (content.includes('async')) score += 1;
    if (content.includes('await')) score += 1;

    return score;
  }

  private isProcessableFile(path: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(path) &&
           !path.includes('.test.') &&
           !path.includes('.spec.');
  }

  private isRelevantFile(path: string): boolean {
    const relevantExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.graphql'];
    const ext = path.split('.').pop()?.toLowerCase();
    return ext ? relevantExtensions.includes(`.${ext}`) : false;
  }

  private truncateContent(content: string): string {
    return content.length > this.MAX_CHUNK_SIZE
      ? content.slice(0, this.MAX_CHUNK_SIZE) + '...'
      : content;
  }
}