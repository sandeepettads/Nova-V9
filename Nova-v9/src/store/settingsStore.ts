import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  chunker: 'ast' | 'semantic';
  maxChunkSize: number;
  maxChunks: number;
  setChunker: (chunker: 'ast' | 'semantic') => void;
  setMaxChunkSize: (size: number) => void;
  setMaxChunks: (count: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      chunker: 'ast',
      maxChunkSize: 2000,
      maxChunks: 5,
      setChunker: (chunker) => set({ chunker }),
      setMaxChunkSize: (maxChunkSize) => set({ maxChunkSize }),
      setMaxChunks: (maxChunks) => set({ maxChunks }),
    }),
    {
      name: 'nova-settings',
    }
  )
);