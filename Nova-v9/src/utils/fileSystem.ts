import { useFileSystemStore } from '../store/fileSystemStore';
import { useChunkingStore } from '../store/chunkingStore';

export class FileSystemUtils {
  private static readonly logger = useChunkingStore.getState;
  private static readonly fs = useFileSystemStore.getState;

  static async isDirectory(path: string): Promise<boolean> {
    const { isDirectory } = this.fs();
    try {
      return await isDirectory(path);
    } catch {
      return false;
    }
  }

  static async readFileContent(path: string): Promise<string> {
    const { addLog } = this.logger();
    const { readFile } = this.fs();

    try {
      addLog(`Reading file: ${path}`, 'info', 'file-system');
      const content = await readFile(path);
      addLog(`Successfully read file: ${path}`, 'success', 'file-system');
      return content;
    } catch (error) {
      addLog(`Error reading file: ${path}`, 'error', 'file-system');
      throw error;
    }
  }

  static async writeFileContent(path: string, content: string): Promise<void> {
    const { addLog } = this.logger();
    const { writeFile } = this.fs();

    try {
      addLog(`Writing file: ${path}`, 'info', 'file-system');
      await writeFile(path, content);
      addLog(`Successfully wrote file: ${path}`, 'success', 'file-system');
    } catch (error) {
      addLog(`Error writing file: ${path}`, 'error', 'file-system');
      throw error;
    }
  }

  static async exists(path: string): Promise<boolean> {
    const { readFile } = this.fs();
    try {
      await readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  static async listDirectory(path: string): Promise<string[]> {
    const { readDir } = this.fs();
    try {
      return await readDir(path);
    } catch {
      return [];
    }
  }
}