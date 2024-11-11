import OpenAI from 'openai';
import { useChunkingStore } from '../../store/chunkingStore';
import { useDiagramStore } from '../../store/diagramStore';
import { ErrorHandler } from '../../utils/errorHandler';
import { CodeChunker } from './codeChunker';
import { DiagramUtils } from './utils';
import { SYSTEM_PROMPT, USER_PROMPT } from './prompts';
import { CodeChunk, DiagramOptions } from './types';
import { ContextManager } from '../contextManager';

// Add Azure OpenAI configuration
const azureEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const azureApiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
const azureDeploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;

if (!azureEndpoint || !azureApiKey || !azureDeploymentName) {
  throw new Error('Azure OpenAI configuration missing');
}

export class SequenceDiagramAgent {
  private static instance: SequenceDiagramAgent;
  private openai: OpenAI;
  private readonly logger = useChunkingStore.getState;
  private readonly diagramStore = useDiagramStore.getState;
  private readonly contextManager = ContextManager.getInstance();
  private readonly codeChunker = new CodeChunker();
  private readonly MAX_RETRIES = 3;
  private readonly EXTERNAL_SERVICE_URL = 'http://localhost:8000';

  private constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  static getInstance(): SequenceDiagramAgent {
    if (!SequenceDiagramAgent.instance) {
      SequenceDiagramAgent.instance = new SequenceDiagramAgent();
    }
    return SequenceDiagramAgent.instance;
  }

  private async checkServiceAvailability(): Promise<boolean> {
    const { addLog } = this.logger();
    try {
      addLog(`Checking external service availability at ${this.EXTERNAL_SERVICE_URL}...`, 'info');
      const response = await fetch(`${this.EXTERNAL_SERVICE_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      return response.ok;
    } catch (err) {
      const error = err as Error;
      addLog(`External service health check failed: ${error?.message || 'Unknown error'}`, 'error');
      return false;
    }
  }

  async generateSequenceDiagram(scope: string, options: DiagramOptions = {}): Promise<string> {
    const { addLog } = this.logger();
    const { storeDiagram } = this.diagramStore();
    
    try {
      addLog('Starting sequence diagram generation...', 'info');

      // Get code context
      const contexts = await this.getContextFromScope(scope);
      if (!contexts || contexts.length === 0) {
        throw new Error('No valid code context found');
      }

      addLog(`Found ${contexts.length} files in scope`, 'info');

      // Process code into chunks
      const chunks = await this.codeChunker.chunkCode(contexts);
      if (chunks.length === 0) {
        throw new Error('No code chunks generated');
      }

      addLog(`Created ${chunks.length} code chunks for analysis`, 'info');
      chunks.forEach((chunk, index) => {
        addLog(`Chunk ${index + 1}: ${chunk.path} (${chunk.type})`, 'info');
      });

      // Try direct generation first
      try {
        addLog('Attempting direct PlantUML generation...', 'info');
        const plantUML = DiagramUtils.generatePlantUML(chunks);
        if (DiagramUtils.validatePlantUMLSyntax(plantUML)) {
          addLog('Successfully generated PlantUML directly', 'success');
          addLog('Generated PlantUML code:', 'info');
          addLog('```plantuml\n' + plantUML + '\n```', 'info');
          
          // Store in MongoDB
          addLog('Storing diagram in MongoDB...', 'info');
          const documentId = await storeDiagram(plantUML);
          addLog(`Diagram stored in MongoDB with ID: ${documentId}`, 'success');
          
          // Generate diagram using the stored document
          addLog('Generating diagram from stored document...', 'info');
          try {
            addLog(`Making API request to: http://localhost:8000/generate-diagram/${documentId}`, 'info');
            const response = await fetch(`http://localhost:8000/generate-diagram/${documentId}`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });

            addLog(`API Response Status: ${response.status} ${response.statusText}`, 'info');

            if (!response.ok) {
              throw new Error(`API request failed with status: ${response.status}`);
            }

            const data = await response.json();
            addLog('Successfully parsed API response', 'success');
            addLog(`Response data: ${JSON.stringify(data, null, 2)}`, 'info');
            console.log('Generated diagram data:', data);

            if (data.error) {
              addLog(`API returned error: ${data.error}`, 'warning');
            } else {
              addLog('Diagram generation completed successfully', 'success');
            }

          } catch (err) {
            const error = err as Error;
            addLog(`Error generating diagram: ${error?.message || 'Unknown error'}`, 'error');
            addLog('Full error details:', 'error');
            addLog(JSON.stringify({
              name: error?.name,
              message: error?.message,
              stack: error?.stack
            }, null, 2), 'error');
            console.error('Diagram generation error:', {
              error,
              documentId,
              timestamp: new Date().toISOString()
            });
          }

          return plantUML;
        }
      } catch (error) {
        addLog('Direct generation failed, falling back to Azure OpenAI', 'warning');
      }

      // Fallback to Azure OpenAI with retries
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          addLog(`Attempt ${attempt}: Sending ${chunks.length} chunks to Azure OpenAI...`, 'info');
          
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
                  { role: 'system', content: SYSTEM_PROMPT },
                  { role: 'user', content: USER_PROMPT(chunks) }
                ],
                max_tokens: 2000,
                temperature: 0.3
              })
            }
          );

          if (!response.ok) {
            throw new Error(`Azure OpenAI API error: ${response.statusText}`);
          }

          const responseData = await response.json();
          const plantUML = responseData.choices[0]?.message?.content;
          if (!plantUML) {
            throw new Error('No PlantUML code generated');
          }

          return plantUML;

        } catch (err) {
          const error = err as Error;
          if (attempt === this.MAX_RETRIES) {
            throw error;
          }
          addLog(`Attempt ${attempt} failed: ${error?.message || 'Unknown error'}, retrying...`, 'warning');
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      throw new Error('Failed to generate sequence diagram after all retries');

    } catch (error) {
      throw ErrorHandler.handle(error, 'Generating sequence diagram');
    }
  }

  private async getContextFromScope(scope: string): Promise<any[]> {
    const { addLog } = this.logger();

    try {
      addLog(`Processing scope: ${scope}`, 'info');

      if (!scope) {
        throw new Error('No scope specified');
      }

      // Handle special cases
      if (scope === 'Codebase' || scope === '/') {
        addLog('Using entire codebase as scope', 'info');
        return this.contextManager.buildContext(['Codebase'], 'chat');
      }

      // Handle specific file or folder paths
      addLog(`Building context for scope: ${scope}`, 'info');
      const contexts = await this.contextManager.buildContext([scope], 'chat');
      if (!contexts || contexts.length === 0) {
        throw new Error('No valid context found for specified scope');
      }

      addLog(`Found ${contexts.length} files in scope`, 'success');
      return contexts;

    } catch (error) {
      throw ErrorHandler.handle(error, 'Processing scope');
    }
  }
}