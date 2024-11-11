import { OpenAIClient } from './openAIClient';
import { useChunkingStore } from '../../store/chunkingStore';
import { ErrorHandler } from '../../utils/errorHandler';

export class SequenceDiagramGenerator {
  private readonly logger = useChunkingStore.getState;
  private readonly openAIClient: OpenAIClient;

  constructor(openAIClient: OpenAIClient) {
    this.openAIClient = openAIClient;
  }

  async generateDiagram(chunks: any[]): Promise<string> {
    const { addLog } = this.logger();

    try {
      addLog('Starting sequence diagram generation...', 'info');

      // Generate diagram using OpenAI
      const plantUML = await this.openAIClient.generateSequenceDiagram(chunks);

      // Validate PlantUML syntax
      if (!this.validatePlantUML(plantUML)) {
        throw new Error('Invalid PlantUML syntax generated');
      }

      addLog('Successfully generated sequence diagram', 'success');
      return plantUML;

    } catch (error) {
      throw ErrorHandler.handle(error, 'Generating sequence diagram');
    }
  }

  private validatePlantUML(plantUML: string): boolean {
    const trimmed = plantUML.trim();
    return (
      trimmed.startsWith('@startuml') &&
      trimmed.endsWith('@enduml') &&
      trimmed.includes('->') // Basic check for sequence interactions
    );
  }
}