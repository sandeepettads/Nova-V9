import { useState, useCallback } from 'react';
import { useChunkingStore } from '../store/chunkingStore';

export function useSettingsProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { setProgress, setStatus, addLog } = useChunkingStore();
  
  const processSettings = useCallback(async (files: string[]) => {
    return new Promise((resolve, reject) => {
      setIsProcessing(true);
      
      // Create worker
      const worker = new Worker(
        new URL('../workers/settingsWorker.ts', import.meta.url),
        { type: 'module' }
      );
      
      // Handle worker messages
      worker.onmessage = (e) => {
        const { type, data, error } = e.data;
        
        switch (type) {
          case 'progress':
            setProgress(data.progress);
            if (data.status === 'success') {
              addLog(`Processed ${data.file}`, 'success');
            } else {
              addLog(`Error processing ${data.file}: ${data.error}`, 'error');
            }
            break;
            
          case 'complete':
            worker.terminate();
            setIsProcessing(false);
            resolve(true);
            break;
            
          case 'error':
            worker.terminate();
            setIsProcessing(false);
            reject(new Error(error));
            break;
        }
      };
      
      // Handle worker errors
      worker.onerror = (error) => {
        worker.terminate();
        setIsProcessing(false);
        reject(error);
      };
      
      // Start processing
      worker.postMessage({ files });
    });
  }, [setProgress, setStatus, addLog]);
  
  return {
    isProcessing,
    processSettings
  };
}