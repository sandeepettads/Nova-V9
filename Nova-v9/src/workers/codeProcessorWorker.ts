import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

interface ProcessingMessage {
  type: string;
  data?: any;
  error?: string;
}

self.onmessage = async (e: MessageEvent) => {
  const { files, settings, jobId } = e.data;
  const { chunker, maxChunkSize, maxChunks } = settings;

  try {
    let processedCount = 0;
    const totalFiles = files.length;

    const postProgress = (message: string, type: string = 'info') => {
      self.postMessage({
        type: 'progress',
        data: {
          message,
          type,
          progress: Math.round((processedCount / totalFiles) * 100)
        }
      });
    };

    postProgress('Starting code processing');

    const processedChunks = [];
    const batchSize = 5;

    // First process TypeScript/JavaScript files
    const codeFiles = files.filter(f => 
      f.path.match(/\.(ts|tsx|js|jsx)$/) && 
      !f.path.includes('.test.') &&
      !f.path.includes('.spec.')
    );

    // Then process other files
    const otherFiles = files.filter(f => !codeFiles.includes(f));
    const sortedFiles = [...codeFiles, ...otherFiles];

    for (let i = 0; i < sortedFiles.length; i += batchSize) {
      const batch = sortedFiles.slice(i, Math.min(i + batchSize, sortedFiles.length));
      
      await Promise.all(batch.map(async (file: any) => {
        try {
          const chunks = chunker === 'ast' 
            ? await processASTChunks(file.content, file.path)
            : processSemanticChunks(file.content, file.path);

          // Add file path to each chunk
          const chunksWithPath = chunks.map(chunk => ({
            ...chunk,
            path: file.path
          }));

          processedChunks.push(...chunksWithPath);
          processedCount++;
          postProgress(`Processed ${file.path}`, 'success');
        } catch (error) {
          postProgress(`Error processing ${file.path}: ${error.message}`, 'error');
        }
      }));

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Filter out less important chunks if we exceed maxChunks
    const prioritizedChunks = prioritizeChunks(processedChunks, maxChunks);

    self.postMessage({
      type: 'complete',
      data: {
        jobId,
        status: 'completed',
        progress: 100,
        chunks: prioritizedChunks
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

function prioritizeChunks(chunks: any[], maxChunks: number) {
  // Score and sort chunks by importance
  const scoredChunks = chunks.map(chunk => ({
    ...chunk,
    score: getChunkScore(chunk)
  })).sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, maxChunks);
}

function getChunkScore(chunk: any): number {
  let score = 0;

  // Prioritize by type
  switch (chunk.type) {
    case 'class':
    case 'function':
      score += 5;
      break;
    case 'type-definition':
    case 'interface':
      score += 4;
      break;
    case 'export':
      score += 3;
      break;
    case 'arrow-function':
      score += 2;
      break;
    case 'import':
      score += 1;
      break;
  }

  // Prioritize by content
  const content = chunk.content.toLowerCase();
  if (content.includes('component')) score += 2;
  if (content.includes('context')) score += 2;
  if (content.includes('hook')) score += 2;
  if (content.includes('interface')) score += 1;
  if (content.includes('type')) score += 1;

  // Prioritize by file path
  const path = chunk.path.toLowerCase();
  if (path.includes('component')) score += 2;
  if (path.includes('context')) score += 2;
  if (path.includes('service')) score += 2;
  if (path.includes('util')) score += 1;
  if (path.includes('type')) score += 1;

  return score;
}

function processASTChunks(content: string, path: string) {
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy']
    });

    const chunks: any[] = [];

    // @ts-ignore - Traverse types compatibility
    traverse(ast, {
      FunctionDeclaration(path: any) {
        chunks.push({
          type: 'function',
          content: content.slice(path.node.start, path.node.end)
        });
      },
      ClassDeclaration(path: any) {
        chunks.push({
          type: 'class',
          content: content.slice(path.node.start, path.node.end)
        });
      },
      ExportDefaultDeclaration(path: any) {
        chunks.push({
          type: 'export',
          content: content.slice(path.node.start, path.node.end)
        });
      },
      TSInterfaceDeclaration(path: any) {
        chunks.push({
          type: 'interface',
          content: content.slice(path.node.start, path.node.end)
        });
      },
      TSTypeAliasDeclaration(path: any) {
        chunks.push({
          type: 'type-definition',
          content: content.slice(path.node.start, path.node.end)
        });
      }
    });

    return chunks;
  } catch (error) {
    console.error(`Error processing ${path}:`, error);
    return [{
      type: 'error',
      content,
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
}

function processSemanticChunks(content: string, path: string) {
  // Skip processing CSS files
  if (path.endsWith('.css')) {
    return [{
      type: 'style',
      content: content.trim()
    }];
  }

  const chunks: any[] = [];
  let currentChunk = '';
  let bracketCount = 0;
  let inComment = false;
  let inJSDoc = false;
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle comments
    if (line.trim().startsWith('/*')) {
      inComment = true;
      if (line.includes('/**')) inJSDoc = true;
    }
    
    if (inComment) {
      currentChunk += line + '\n';
      if (line.includes('*/')) {
        inComment = false;
        if (inJSDoc) {
          chunks.push({
            type: 'jsdoc',
            content: currentChunk.trim()
          });
          inJSDoc = false;
          currentChunk = '';
        }
      }
      continue;
    }

    // Skip single-line comments
    if (line.trim().startsWith('//')) {
      continue;
    }

    const openBrackets = (line.match(/(?<!\\){/g) || []).length;
    const closeBrackets = (line.match(/(?<!\\)}/g) || []).length;
    bracketCount += openBrackets - closeBrackets;
    
    currentChunk += line + '\n';
    
    if (bracketCount === 0 && isNaturalBreakPoint(line)) {
      if (currentChunk.trim()) {
        // Determine chunk type
        const trimmedChunk = currentChunk.trim();
        let type = 'code';

        if (trimmedChunk.startsWith('import')) {
          type = 'import';
        } else if (trimmedChunk.startsWith('export')) {
          type = 'export';
        } else if (trimmedChunk.includes('function')) {
          type = 'function';
        } else if (trimmedChunk.includes('class')) {
          type = 'class';
        } else if (trimmedChunk.includes('=>')) {
          type = 'arrow-function';
        } else if (trimmedChunk.includes('interface') || trimmedChunk.includes('type ')) {
          type = 'type-definition';
        }

        chunks.push({
          type,
          content: currentChunk.trim()
        });
        currentChunk = '';
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      type: 'code',
      content: currentChunk.trim()
    });
  }
  
  return chunks;
}

function isNaturalBreakPoint(line: string): boolean {
  const trimmedLine = line.trim();
  return (
    trimmedLine.endsWith('}') ||
    trimmedLine.endsWith(';') ||
    trimmedLine.endsWith('*/') ||
    trimmedLine.length === 0 ||
    /^(import|export|interface|type|function|class|const|let|var)/.test(trimmedLine)
  );
}