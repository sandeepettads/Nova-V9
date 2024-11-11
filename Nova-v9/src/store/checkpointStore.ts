import create from 'zustand';
import { persist } from 'zustand/middleware';
import { useFileSystemStore } from './fileSystemStore';

interface Checkpoint {
  id: string;
  name: string;
  timestamp: number;
  fsData: any;
}

interface CheckpointStore {
  checkpoints: Checkpoint[];
  currentCheckpoint: string | null;
  createCheckpoint: (name: string) => Promise<void>;
  restoreCheckpoint: (id: string) => Promise<void>;
  deleteCheckpoint: (id: string) => void;
}

export const useCheckpointStore = create<CheckpointStore>()(
  persist(
    (set, get) => ({
      checkpoints: [],
      currentCheckpoint: null,

      createCheckpoint: async (name: string) => {
        const fs = useFileSystemStore.getState().fs;
        if (!fs) return;

        const fsData = await new Promise((resolve) => {
          fs.exportData((error: Error | null, data: any) => {
            if (error) {
              console.error('Error exporting FS data:', error);
              return;
            }
            resolve(data);
          });
        });

        const checkpoint: Checkpoint = {
          id: Date.now().toString(),
          name,
          timestamp: Date.now(),
          fsData,
        };

        set((state) => ({
          checkpoints: [...state.checkpoints, checkpoint],
          currentCheckpoint: checkpoint.id,
        }));
      },

      restoreCheckpoint: async (id: string) => {
        const checkpoint = get().checkpoints.find((cp) => cp.id === id);
        if (!checkpoint) return;

        const fs = useFileSystemStore.getState().fs;
        if (!fs) return;

        await useFileSystemStore.getState().clearFileSystem();

        await new Promise<void>((resolve, reject) => {
          fs.importData(checkpoint.fsData, (error: Error | null) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });

        set({ currentCheckpoint: id });
        
        await useFileSystemStore.getState().refreshTree();
      },

      deleteCheckpoint: (id: string) => {
        set((state) => ({
          checkpoints: state.checkpoints.filter((cp) => cp.id !== id),
          currentCheckpoint: state.currentCheckpoint === id ? null : state.currentCheckpoint,
        }));
      },
    }),
    {
      name: 'nova-checkpoints',
      version: 1,
    }
  )
);