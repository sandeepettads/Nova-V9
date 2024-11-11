import { useChunkingStore } from '../store/chunkingStore';

export class ErrorHandler {
  private static readonly logger = useChunkingStore.getState;

  static handle(error: unknown, context: string): Error {
    const { addLog } = this.logger();
    
    let message = 'An unknown error occurred';
    let details = '';
    
    if (error instanceof Error) {
      message = error.message;
      details = error.stack || '';
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = JSON.stringify(error);
    }

    const formattedError = new Error(`${context}: ${message}`);
    
    addLog(`Error in ${context}: ${message}`, 'error');
    if (details) {
      addLog(`Error details: ${details}`, 'error');
    }
    
    console.error(formattedError);
    
    return formattedError;
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  static formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unknown error occurred';
  }
}