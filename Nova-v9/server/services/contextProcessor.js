import { ASTProcessor } from './astProcessor.js';
import { SemanticProcessor } from './semanticProcessor.js';

export async function processCodeContext(jobId, settings, jobs) {
  const { chunker, maxChunkSize, maxChunks, files } = settings;
  
  try {
    const processor = chunker === 'ast' ? new ASTProcessor() : new SemanticProcessor();
    let currentJob = jobs.get(jobId);
    
    // Update initial status
    currentJob = {
      ...currentJob,
      status: 'processing',
      progress: 0,
      logs: [
        ...currentJob.logs,
        {
          type: 'info',
          message: `Starting ${chunker} processing with chunk size ${maxChunkSize}`,
          timestamp: new Date()
        }
      ]
    };
    jobs.set(jobId, currentJob);

    // Validate files before processing
    if (!files || files.length === 0) {
      throw new Error('No files provided for processing');
    }

    // Process files in batches
    const batchSize = 5;
    const totalFiles = files.length;
    let processedFiles = 0;
    
    for (let i = 0; i < totalFiles; i += batchSize) {
      const batch = files.slice(i, Math.min(i + batchSize, totalFiles));
      
      // Process batch
      await Promise.all(batch.map(async (file) => {
        try {
          // Validate file content
          if (!file.content) {
            throw new Error(`No content provided for file: ${file.path}`);
          }

          // Clean and validate content before processing
          const cleanContent = file.content.toString().trim();
          if (!cleanContent) {
            throw new Error(`Empty content for file: ${file.path}`);
          }

          const result = await processor.processFile({
            ...file,
            content: cleanContent
          });
          
          processedFiles++;
          currentJob = jobs.get(jobId);
          currentJob.logs.push({
            type: 'success',
            message: `Processed ${file.path}`,
            timestamp: new Date()
          });
          
          const progress = Math.round((processedFiles / totalFiles) * 100);
          currentJob.progress = progress;
          jobs.set(jobId, currentJob);
          
          return result;
        } catch (error) {
          currentJob = jobs.get(jobId);
          currentJob.logs.push({
            type: 'error',
            message: `Error processing ${file.path}: ${error.message}`,
            timestamp: new Date()
          });
          jobs.set(jobId, currentJob);
          console.error(`Processing error for ${file.path}:`, error);
        }
      }));

      // Add small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update final status
    currentJob = jobs.get(jobId);
    currentJob.status = 'completed';
    currentJob.progress = 100;
    currentJob.logs.push({
      type: 'success',
      message: 'All files processed successfully',
      timestamp: new Date()
    });
    jobs.set(jobId, currentJob);

  } catch (error) {
    const currentJob = jobs.get(jobId);
    currentJob.status = 'error';
    currentJob.error = error.message;
    currentJob.logs.push({
      type: 'error',
      message: `Processing failed: ${error.message}`,
      timestamp: new Date()
    });
    jobs.set(jobId, currentJob);
    throw error;
  }
}