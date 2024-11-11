import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function processFiles(files, chunker, maxChunkSize, maxChunks, onProgress) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No files provided for processing');
  }

  let processedCount = 0;
  const totalFiles = files.length;

  try {
    onProgress(0, {
      type: 'info',
      message: `Starting ${chunker} processing for ${totalFiles} files`,
      timestamp: new Date()
    });

    // Process files in batches
    const batchSize = 5;
    for (let i = 0; i < totalFiles; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (file) => {
        try {
          if (chunker === 'ast') {
            await processASTChunking(file, maxChunkSize);
          } else {
            await processSemanticChunking(file, maxChunkSize);
          }
          
          processedCount++;
          const progress = (processedCount / totalFiles) * 100;
          
          onProgress(progress, {
            type: 'success',
            message: `Processed ${file}`,
            timestamp: new Date()
          });
        } catch (error) {
          onProgress(progress, {
            type: 'error',
            message: `Error processing ${file}: ${error.message}`,
            timestamp: new Date()
          });
        }
      }));

      // Small delay between batches to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    onProgress(100, {
      type: 'success',
      message: `Completed processing ${totalFiles} files`,
      timestamp: new Date()
    });

  } catch (error) {
    throw new Error(`Processing failed: ${error.message}`);
  }
}

async function processASTChunking(file, maxChunkSize) {
  // Simulate AST processing time
  await new Promise(resolve => setTimeout(resolve, 200));
  return true;
}

async function processSemanticChunking(file, maxChunkSize) {
  // Simulate semantic processing time
  await new Promise(resolve => setTimeout(resolve, 300));
  return true;
}