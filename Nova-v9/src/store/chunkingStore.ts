import { create } from 'zustand';

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: 'file-tree' | 'processing' | 'semantic' | 'analysis' | 'scoring';
}

interface ChunkingState {
  isProcessing: boolean;
  progress: number;
  status: string;
  logs: LogEntry[];
  setProgress: (progress: number) => void;
  setStatus: (status: string) => void;
  addLog: (message: string, type?: LogEntry['type'], category?: LogEntry['category']) => void;
  clearLogs: () => void;
  startProcessing: () => void;
  completeProcessing: () => void;
}

export const useChunkingStore = create<ChunkingState>((set) => ({
  isProcessing: false,
  progress: 0,
  status: '',
  logs: [],
  setProgress: (progress) => set({ progress: Math.min(Math.round(progress), 100) }),
  setStatus: (status) => set({ status }),
  addLog: (message, type = 'info', category) => set((state) => ({
    logs: [
      ...state.logs,
      { 
        timestamp: new Date(), 
        message, 
        type,
        category
      }
    ].slice(-100) // Keep only last 100 logs
  })),
  clearLogs: () => set({ logs: [] }),
  startProcessing: () => set({ 
    isProcessing: true, 
    progress: 0, 
    status: 'Starting...', 
    logs: [] 
  }),
  completeProcessing: () => set((state) => ({ 
    isProcessing: false, 
    progress: 100, 
    status: 'Complete!',
    logs: [
      ...state.logs,
      { 
        timestamp: new Date(), 
        message: 'Processing completed successfully!', 
        type: 'success',
        category: 'processing'
      }
    ]
  })),
}));