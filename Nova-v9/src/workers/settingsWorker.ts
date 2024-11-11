// Web Worker for processing files
import { FileNode } from '../types/files';
import { ContextManager } from '../services/contextManager';

self.onmessage = async (e: MessageEvent) => {
  const { files, chunker, maxChunkSize, maxChunks } = e.data;
  
  try {
    let processedCount = 0;
    const totalFiles = files.length;
    
    // Process files in smaller batches
    const batchSize = 3;
    for (let i = 0; i < totalFiles; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      // Process batch
      await Promise.all(batch.map(async (file: string) => {
        const fileNode: FileNode = {
          path: '/' + file,
          name: file,
          isDirectory: !file.includes('.')
        };
        
        try {
          await ContextManager.processContext([fileNode]);
          processedCount++;
          
          // Report progress
          self.postMessage({
            type: 'progress',
            data: {
              progress: (processedCount / totalFiles) * 100,
              file,
              status: 'success'
            }
          });
        } catch (error) {
          self.postMessage({
            type: 'progress',
            data: {
              progress: (processedCount / totalFiles) * 100,
              file,
              status: 'error',
              error: error.message
            }
          });
        }
      }));
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    self.postMessage({ type: 'complete' });
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message 
    });
  }
};