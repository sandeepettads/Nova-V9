export interface FileContext {
  path: string;
  content: string;
  relativePath: string;
  type: string;
  chunks?: any[];
}

export interface ContextOptions {
  type: 'chat' | 'modification';
  maxChunks?: number;
  maxChunkSize?: number;
}