import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { useChunkingStore } from '../store/chunkingStore';

interface ProcessingOptions {
  chunker: 'ast' | 'semantic';
  maxChunkSize: number;
  maxChunks: number;
}

interface ProcessingResult {
  status: 'completed' | 'error';
  chunks?: any[];
  error?: string;
}

export class CodeProcessor {
  private static readonly MAX_TOKENS_PER_REQUEST = 6000; // Leave room for response
  private static readonly CHARS_PER_TOKEN = 4; // Approximate

  static async processCode(files: any[], options: ProcessingOptions): Promise<ProcessingResult> {
    const { addLog } = useChunkingStore.getState();
    
    try {
      let totalTokens = 0;
      const processedChunks: any[] = [];

      addLog('Starting code processing...', 'info');

      // Process files in order of importance
      const sortedFiles = this.prioritizeFiles(files);

      for (const file of sortedFiles) {
        const chunks = options.chunker === 'ast' 
          ? await this.processASTChunks(file)
          : await this.processSemanticChunks(file);

        // Process and add chunks while respecting token limits
        for (const chunk of chunks) {
          const chunkTokens = Math.ceil(chunk.content.length / this.CHARS_PER_TOKEN);
          
          if (totalTokens + chunkTokens > this.MAX_TOKENS_PER_REQUEST) {
            addLog('Reached token limit, stopping chunk processing', 'warning');
            break;
          }

          processedChunks.push(chunk);
          totalTokens += chunkTokens;
        }

        if (totalTokens >= this.MAX_TOKENS_PER_REQUEST) break;
      }

      // Trim chunks to respect maxChunks setting
      const finalChunks = processedChunks.slice(0, options.maxChunks);
      
      addLog(`Processed ${finalChunks.length} chunks (${totalTokens} tokens)`, 'success');

      return {
        status: 'completed',
        chunks: finalChunks
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error processing code: ${message}`, 'error');
      return { status: 'error', error: message };
    }
  }

  private static prioritizeFiles(files: any[]): any[] {
    return files.sort((a, b) => {
      const scoreA = this.getFileImportance(a);
      const scoreB = this.getFileImportance(b);
      return scoreB - scoreA;
    });
  }

  private static getFileImportance(file: any): number {
    const path = file.path.toLowerCase();
    let score = 0;

    // Prioritize key files
    if (path.includes('index.')) score += 5;
    if (path.includes('app.')) score += 4;
    if (path.includes('main.')) score += 4;
    if (path.includes('types.')) score += 3;
    if (path.includes('context')) score += 3;
    if (path.includes('store')) score += 3;
    if (path.includes('component')) score += 2;
    if (path.includes('util')) score += 1;

    // Prioritize TypeScript files
    if (path.endsWith('.ts') || path.endsWith('.tsx')) score += 2;
    if (path.endsWith('.js') || path.endsWith('.jsx')) score += 1;

    return score;
  }

  private static async processASTChunks(file: any): Promise<any[]> {
    try {
      const ast = parse(file.content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy']
      });

      const chunks: any[] = [];

      // @ts-ignore - Traverse types compatibility
      traverse(ast, {
        FunctionDeclaration(path: any) {
          chunks.push({
            type: 'function',
            path: file.path,
            content: file.content.slice(path.node.start, path.node.end)
          });
        },
        ClassDeclaration(path: any) {
          chunks.push({
            type: 'class',
            path: file.path,
            content: file.content.slice(path.node.start, path.node.end)
          });
        },
        TSInterfaceDeclaration(path: any) {
          chunks.push({
            type: 'interface',
            path: file.path,
            content: file.content.slice(path.node.start, path.node.end)
          });
        },
        TSTypeAliasDeclaration(path: any) {
          chunks.push({
            type: 'type',
            path: file.path,
            content: file.content.slice(path.node.start, path.node.end)
          });
        }
      });

      return chunks;

    } catch (error) {
      console.error(`Error processing ${file.path}:`, error);
      return [{
        type: 'file',
        path: file.path,
        content: file.content
      }];
    }
  }

  private static async processSemanticChunks(file: any): Promise<any[]> {
    const chunks: any[] = [];
    const lines = file.content.split('\n');
    let currentChunk = '';
    let bracketCount = 0;

    for (const line of lines) {
      const openBrackets = (line.match(/{/g) || []).length;
      const closeBrackets = (line.match(/}/g) || []).length;
      bracketCount += openBrackets - closeBrackets;

      currentChunk += line + '\n';

      if (bracketCount === 0 && this.isChunkBreakpoint(line)) {
        if (currentChunk.trim()) {
          chunks.push({
            type: 'semantic',
            path: file.path,
            content: currentChunk.trim()
          });
        }
        currentChunk = '';
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        type: 'semantic',
        path: file.path,
        content: currentChunk.trim()
      });
    }

    return chunks;
  }

  private static isChunkBreakpoint(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.endsWith('}') ||
      trimmed.endsWith(';') ||
      trimmed.endsWith('*/') ||
      trimmed.length === 0 ||
      /^(import|export|interface|type|function|class|const|let|var)/.test(trimmed)
    );
  }
}