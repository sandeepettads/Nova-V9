import { ErrorHandler } from '../utils/errorHandler';

export class AzureOpenAIClient {
  private static instance: AzureOpenAIClient;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly deploymentName: string;

  private constructor() {
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
    const deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !apiKey || !deploymentName) {
      throw new Error('Azure OpenAI configuration missing. Please ensure VITE_AZURE_OPENAI_ENDPOINT, VITE_AZURE_OPENAI_KEY, and VITE_AZURE_OPENAI_DEPLOYMENT are set in your environment.');
    }

    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.deploymentName = deploymentName;
  }

  static getInstance(): AzureOpenAIClient {
    if (!AzureOpenAIClient.instance) {
      AzureOpenAIClient.instance = new AzureOpenAIClient();
    }
    return AzureOpenAIClient.instance;
  }

  private async handleApiResponse(response: Response): Promise<any> {
    if (!response.ok) {
      let errorMessage = `Azure OpenAI API error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = `Azure OpenAI API error: ${errorData.error?.message || response.statusText}`;
      } catch {
        // If parsing JSON fails, use the original error message
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  async createChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<{ choices: Array<{ message?: { content: string } }> }> {
    try {
      const response = await fetch(
        `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=2023-05-15`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 1500,
            stream: options.stream ?? false
          })
        }
      );

      return await this.handleApiResponse(response);
    } catch (error) {
      throw ErrorHandler.handle(error, 'Azure OpenAI API request');
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.createChatCompletion([
        { role: 'user', content: 'Test connection' }
      ], {
        max_tokens: 5
      });
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('Azure OpenAI connection validation failed:', error);
      return false;
    }
  }
}

export const azureOpenAIClient = AzureOpenAIClient.getInstance(); 