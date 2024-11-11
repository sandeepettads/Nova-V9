import { useChunkingStore } from '../../store/chunkingStore';
import { ErrorHandler } from '../../utils/errorHandler';
import { USER_PROMPT } from './prompts';
import { CodeChunk } from './types';

const azureEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const azureApiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
const azureDeploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;

if (!azureEndpoint || !azureApiKey || !azureDeploymentName) {
  throw new Error('Azure OpenAI configuration missing');
}

export class OpenAIClient {
  private readonly logger = useChunkingStore.getState;
  private readonly systemPrompt: string;

  constructor(systemPrompt: string) {
    this.systemPrompt = systemPrompt;
  }

  async generateSequenceDiagram(chunks: CodeChunk[]): Promise<string> {
    const { addLog } = this.logger();

    try {
      addLog('Sending code chunks to Azure OpenAI for analysis...', 'info');

      const response = await fetch(
        `${azureEndpoint}/openai/deployments/${azureDeploymentName}/chat/completions?api-version=2023-05-15`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${azureApiKey}`
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: this.systemPrompt },
              { role: 'user', content: USER_PROMPT(chunks) }
            ],
            max_tokens: 2000,
            temperature: 0.3
          })
        }
      );

      const responseData = await response.json();
      const plantUML = responseData.choices[0]?.message?.content;
      if (!plantUML) {
        throw new Error('Failed to generate sequence diagram');
      }

      addLog('Successfully generated PlantUML code', 'success');
      return plantUML;

    } catch (error) {
      throw ErrorHandler.handle(error, 'Azure OpenAI sequence diagram generation');
    }
  }
}