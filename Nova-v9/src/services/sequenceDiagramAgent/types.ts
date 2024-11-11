export interface CodeChunk {
  type: 'function' | 'class' | 'export' | 'import' | 'file';
  path: string;
  content: string;
}

export interface DiagramOptions {
  maxChunks?: number;
  maxChunkSize?: number;
  includeErrorFlows?: boolean;
}

export interface PlantUMLResult {
  code: string;
  svg?: string;
  error?: string;
}