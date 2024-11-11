import { useChunkingStore } from '../store/chunkingStore';
import { ErrorHandler } from '../utils/errorHandler';

export class PlantUMLRenderer {
  private static instance: PlantUMLRenderer;
  private readonly logger = useChunkingStore.getState;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PlantUMLRenderer {
    if (!PlantUMLRenderer.instance) {
      PlantUMLRenderer.instance = new PlantUMLRenderer();
    }
    return PlantUMLRenderer.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const { addLog } = this.logger();
    addLog('Initializing PlantUML renderer...', 'info');

    try {
      // Check if Java is available
      const javaVersion = await this.checkJava();
      addLog(`Found Java: ${javaVersion}`, 'success');

      // Setup PlantUML
      await this.setupPlantUML();
      addLog('PlantUML setup complete', 'success');

      this.isInitialized = true;
      addLog('PlantUML renderer initialized', 'success');
    } catch (error) {
      throw ErrorHandler.handle(error, 'Initializing PlantUML');
    }
  }

  async renderDiagram(plantUML: string): Promise<string> {
    await this.initialize();
    const { addLog } = this.logger();

    try {
      addLog('Rendering PlantUML diagram...', 'info');

      // Create a temporary file for the PlantUML content
      const tempFile = await this.createTempFile(plantUML);
      addLog('Created temporary PlantUML file', 'info');

      // Execute PlantUML jar to generate SVG
      const svg = await this.executePlantUML(tempFile);
      addLog('Generated SVG diagram', 'success');

      // Cleanup temp file
      await this.cleanupTempFile(tempFile);

      return svg;
    } catch (error) {
      throw ErrorHandler.handle(error, 'Rendering PlantUML diagram');
    }
  }

  private async checkJava(): Promise<string> {
    try {
      const response = await fetch('/api/plantuml/java-version');
      if (!response.ok) {
        throw new Error('Java check failed');
      }
      return await response.text();
    } catch (error) {
      throw new Error('Java is not available: ' + error.message);
    }
  }

  private async setupPlantUML(): Promise<void> {
    try {
      const response = await fetch('/api/plantuml/setup');
      if (!response.ok) {
        throw new Error('PlantUML setup failed');
      }
    } catch (error) {
      throw new Error('PlantUML setup failed: ' + error.message);
    }
  }

  private async createTempFile(content: string): Promise<string> {
    try {
      const response = await fetch('/api/plantuml/create-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: content
      });

      if (!response.ok) {
        throw new Error('Failed to create temporary file');
      }

      return await response.text();
    } catch (error) {
      throw new Error('Failed to create temporary file: ' + error.message);
    }
  }

  private async executePlantUML(tempFile: string): Promise<string> {
    try {
      const response = await fetch('/api/plantuml/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempFile })
      });

      if (!response.ok) {
        throw new Error('Failed to generate diagram');
      }

      return await response.text();
    } catch (error) {
      throw new Error('Failed to generate diagram: ' + error.message);
    }
  }

  private async cleanupTempFile(tempFile: string): Promise<void> {
    try {
      await fetch('/api/plantuml/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempFile })
      });
    } catch (error) {
      console.error('Failed to cleanup temp file:', error);
    }
  }
}

export const plantUMLRenderer = PlantUMLRenderer.getInstance();