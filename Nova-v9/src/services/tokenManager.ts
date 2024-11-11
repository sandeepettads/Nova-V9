import { useChunkingStore } from '../store/chunkingStore';
import { ErrorHandler } from '../utils/errorHandler';

interface TokenOptions {
  maxTokens: number;
  depth: number;
  focus?: string;
}

export class TokenManager {
  private static instance: TokenManager;
  private readonly logger = useChunkingStore.getState;
  private readonly CHARS_PER_TOKEN = 4;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async processContexts(contexts: any[], options: TokenOptions): Promise<any[]> {
    const { addLog } = this.logger();
    
    try {
      addLog('Processing contexts with token management...', 'info');

      // Score and prioritize contexts
      const scoredContexts = this.scoreContexts(contexts, options.focus);
      
      // Calculate tokens and chunk if needed
      const chunkedContexts = await this.chunkContexts(scoredContexts, options.maxTokens);
      
      // Process dependencies up to specified depth
      const processedContexts = await this.processDependencies(chunkedContexts, options.depth);

      addLog(`Processed ${processedContexts.length} contexts within token limits`, 'success');
      return processedContexts;

    } catch (error) {
      throw ErrorHandler.handle(error, 'Processing contexts');
    }
  }

  private scoreContexts(contexts: any[], focus?: string): any[] {
    return contexts.map(context => ({
      ...context,
      score: this.calculateContextScore(context, focus)
    })).sort((a, b) => b.score - a.score);
  }

  private calculateContextScore(context: any, focus?: string): number {
    let score = 0;

    // Score based on file type
    if (context.path.endsWith('.ts') || context.path.endsWith('.tsx')) score += 5;
    if (context.path.endsWith('.js') || context.path.endsWith('.jsx')) score += 4;
    
    // Score based on content relevance
    if (context.content.includes('class')) score += 3;
    if (context.content.includes('function')) score += 2;
    if (context.content.includes('import') || context.content.includes('export')) score += 1;

    // Score based on focus
    if (focus && context.path.includes(focus)) score += 10;

    return score;
  }

  private async chunkContexts(contexts: any[], maxTokens: number): Promise<any[]> {
    const chunks: any[] = [];
    let currentChunk: any[] = [];
    let currentTokens = 0;

    for (const context of contexts) {
      const contextTokens = Math.ceil(context.content.length / this.CHARS_PER_TOKEN);
      
      if (currentTokens + contextTokens > maxTokens) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentTokens = 0;
        }
        
        // Handle large contexts by splitting
        if (contextTokens > maxTokens) {
          const splitChunks = this.splitLargeContext(context, maxTokens);
          chunks.push(...splitChunks);
          continue;
        }
      }

      currentChunk.push(context);
      currentTokens += contextTokens;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private splitLargeContext(context: any, maxTokens: number): any[][] {
    const maxChars = maxTokens * this.CHARS_PER_TOKEN;
    const chunks: any[][] = [];
    let currentChunk = '';

    const lines = context.content.split('\n');
    let currentChunkLines: string[] = [];

    for (const line of lines) {
      if ((currentChunk + line).length > maxChars) {
        if (currentChunkLines.length > 0) {
          chunks.push([{
            ...context,
            content: currentChunkLines.join('\n')
          }]);
          currentChunkLines = [];
          currentChunk = '';
        }
      }
      
      currentChunkLines.push(line);
      currentChunk += line + '\n';
    }

    if (currentChunkLines.length > 0) {
      chunks.push([{
        ...context,
        content: currentChunkLines.join('\n')
      }]);
    }

    return chunks;
  }

  private async processDependencies(contexts: any[][], depth: number): Promise<any[]> {
    const processed = new Set<string>();
    const result: any[] = [];

    for (const contextChunk of contexts) {
      for (const context of contextChunk) {
        if (!processed.has(context.path)) {
          const withDeps = await this.addDependencies(context, depth, processed);
          result.push(...withDeps);
          processed.add(context.path);
        }
      }
    }

    return result;
  }

  private async addDependencies(context: any, depth: number, processed: Set<string>): Promise<any[]> {
    if (depth === 0 || processed.has(context.path)) {
      return [context];
    }

    const deps = this.extractDependencies(context);
    const result = [context];

    for (const dep of deps) {
      if (!processed.has(dep.path)) {
        const depWithDeps = await this.addDependencies(dep, depth - 1, processed);
        result.push(...depWithDeps);
        processed.add(dep.path);
      }
    }

    return result;
  }

  private extractDependencies(context: any): any[] {
    // Extract import statements and return referenced files
    const deps: any[] = [];
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(context.content)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('.')) continue;

      deps.push({
        path: this.resolveImportPath(context.path, importPath),
        content: '' // Content would be loaded when needed
      });
    }

    return deps;
  }

  private resolveImportPath(currentPath: string, importPath: string): string {
    const dir = currentPath.split('/').slice(0, -1).join('/');
    const resolved = importPath.startsWith('.')
      ? `${dir}/${importPath}`
      : importPath;
    return resolved.replace(/\/{2,}/g, '/');
  }
}