import { create } from 'zustand';
import * as BrowserFS from 'browserfs';
import { useChunkingStore } from './chunkingStore';

interface FileSystemState {
  fs: typeof BrowserFS.BFSRequire;
  initialized: boolean;
  initialize: () => Promise<void>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readDir: (path: string) => Promise<string[]>;
  createDir: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  clearFileSystem: () => Promise<void>;
  isDirectory: (path: string) => Promise<boolean>;
  refreshTree: () => Promise<void>;
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  fs: null as unknown as typeof BrowserFS.BFSRequire,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    const { addLog } = useChunkingStore.getState();
    addLog('Initializing file system...', 'info');

    return new Promise((resolve, reject) => {
      BrowserFS.configure({
        fs: "InMemory"
      }, (err) => {
        if (err) {
          addLog(`Failed to initialize filesystem: ${err.message}`, 'error');
          reject(err);
          return;
        }

        try {
          const fs = BrowserFS.BFSRequire('fs');
          set({ fs, initialized: true });
          
          // Check if root exists before creating
          try {
            fs.statSync('/');
          } catch (error) {
            if (error.code === 'ENOENT') {
              fs.mkdirSync('/', { recursive: true });
            }
          }
          
          addLog('File system initialized successfully', 'success');
          resolve();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Error during initialization: ${message}`, 'error');
          reject(error);
        }
      });
    });
  },

  readFile: async (path: string) => {
    const { fs, initialized } = get();
    const { addLog } = useChunkingStore.getState();
    
    if (!initialized) {
      await get().initialize();
    }
    
    return new Promise((resolve, reject) => {
      try {
        const data = fs.readFileSync(path, 'utf8');
        addLog(`Successfully read file: ${path}`, 'success');
        resolve(data);
      } catch (err) {
        addLog(`Error reading file ${path}: ${err.message}`, 'error');
        reject(err);
      }
    });
  },

  writeFile: async (path: string, content: string) => {
    const { fs, initialized } = get();
    const { addLog } = useChunkingStore.getState();
    
    if (!initialized) {
      await get().initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        const parentDir = path.split('/').slice(0, -1).join('/');
        if (parentDir) {
          try {
            fs.mkdirSync(parentDir, { recursive: true });
          } catch (err) {
            if (err.code !== 'EEXIST') throw err;
          }
        }
        fs.writeFileSync(path, content);
        addLog(`Successfully wrote file: ${path}`, 'success');
        resolve();
      } catch (err) {
        addLog(`Error writing file ${path}: ${err.message}`, 'error');
        reject(err);
      }
    });
  },

  readDir: async (path: string) => {
    const { fs, initialized } = get();
    const { addLog } = useChunkingStore.getState();
    
    if (!initialized) {
      await get().initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        const files = fs.readdirSync(path);
        addLog(`Successfully read directory: ${path}`, 'success');
        resolve(files || []);
      } catch (err) {
        if (err.code === 'ENOENT') {
          resolve([]);
        } else {
          addLog(`Error reading directory ${path}: ${err.message}`, 'error');
          reject(err);
        }
      }
    });
  },

  createDir: async (path: string) => {
    const { fs, initialized } = get();
    const { addLog } = useChunkingStore.getState();
    
    if (!initialized) {
      await get().initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        fs.mkdirSync(path, { recursive: true });
        addLog(`Successfully created directory: ${path}`, 'success');
        resolve();
      } catch (err) {
        if (err.code !== 'EEXIST') {
          addLog(`Error creating directory ${path}: ${err.message}`, 'error');
          reject(err);
        } else {
          resolve();
        }
      }
    });
  },

  deleteFile: async (path: string) => {
    const { fs, initialized } = get();
    const { addLog } = useChunkingStore.getState();
    
    if (!initialized) {
      await get().initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        fs.unlinkSync(path);
        addLog(`Successfully deleted file: ${path}`, 'success');
        resolve();
      } catch (err) {
        addLog(`Error deleting file ${path}: ${err.message}`, 'error');
        reject(err);
      }
    });
  },

  clearFileSystem: async () => {
    const { fs, initialized } = get();
    const { addLog } = useChunkingStore.getState();
    
    if (!initialized) {
      await get().initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        const files = fs.readdirSync('/');
        files.forEach(file => {
          const path = '/' + file;
          try {
            const stats = fs.statSync(path);
            if (stats.isDirectory()) {
              fs.rmdirSync(path, { recursive: true });
            } else {
              fs.unlinkSync(path);
            }
          } catch (err) {
            if (err.code !== 'ENOENT') throw err;
          }
        });
        addLog('File system cleared successfully', 'success');
        resolve();
      } catch (err) {
        addLog(`Error clearing file system: ${err.message}`, 'error');
        reject(err);
      }
    });
  },

  isDirectory: async (path: string) => {
    const { fs, initialized } = get();
    
    if (!initialized) {
      await get().initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        const stats = fs.statSync(path);
        resolve(stats.isDirectory());
      } catch (err) {
        if (err.code === 'ENOENT') {
          resolve(false);
        } else {
          reject(err);
        }
      }
    });
  },

  refreshTree: async () => {
    const { addLog } = useChunkingStore.getState();
    try {
      await get().initialize();
      addLog('File tree refreshed', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error refreshing file tree: ${message}`, 'error');
      throw error;
    }
  }
}));