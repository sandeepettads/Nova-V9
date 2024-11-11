import { useSettingsStore } from '../store/settingsStore';
import { useChunkingStore } from '../store/chunkingStore';
import { CodeContextManager } from './codeContext';
import { CodeProcessor } from './codeProcessor';

const azureEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const azureApiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
const azureDeploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;

if (!azureEndpoint || !azureApiKey || !azureDeploymentName) {
  throw new Error('Azure OpenAI configuration missing');
}

export async function generateResponse(message: string, contextPaths?: string[]): Promise<string> {
  const { chunker, maxChunks } = useSettingsStore.getState();
  const { addLog } = useChunkingStore.getState();

  try {
    addLog('Retrieving file contents...', 'info');
    
    const files = contextPaths?.length
      ? await CodeContextManager.getContextForPaths(contextPaths)
      : await CodeContextManager.getOpenFiles();

    if (!files.length) {
      addLog('No files found in context', 'warning');
      return 'I apologize, but I don\'t have any code context to work with.';
    }

    addLog(`Processing ${files.length} files with ${chunker} chunking...`, 'info');
    
    // Process files using CodeProcessor
    const result = await CodeProcessor.processCode(files, {
      chunker,
      maxChunks: Math.max(maxChunks, files.length),
      maxChunkSize: 2000
    });

    if (!result.chunks || result.chunks.length === 0) {
      addLog('No code chunks were generated', 'warning');
      return 'I apologize, but I couldn\'t process the code context.';
    }

    // Define proper interface for chunks
    interface CodeChunk {
      path: string;
      content: string;
      type?: string;
    }

    // Properly type the grouped chunks
    const groupedChunks = result.chunks.reduce<Record<string, CodeChunk[]>>((acc, chunk) => {
      const fileName = chunk.path.split('/').pop() || '';
      if (!acc[fileName]) acc[fileName] = [];
      acc[fileName].push(chunk);
      return acc;
    }, {});

    // Build context content
    let contextContent = `Here is the relevant code context${
      contextPaths?.length ? ` (filtered by: ${contextPaths.join(', ')})` : ''
    }:\n\n`;

    for (const [fileName, fileChunks] of Object.entries(groupedChunks)) {
      contextContent += `File: ${fileName}\n\n${fileChunks.map(chunk => 
        `${chunk.content}\n`
      ).join('\n')}\n\n`;
    }
    
    addLog('Sending request to Azure OpenAI...', 'info');
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
            {
              role: 'system',
              content: `You are an AI assistant analyzing code from a specific project...`
            },
            { role: 'system', content: contextContent },
            { role: 'user', content: message }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.statusText}`);
    }

    const responseData = await response.json();
    const aiResponse = responseData.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response generated');
    }

    addLog('Response received', 'success');
    return aiResponse;

  } catch (error) {
    console.error('Azure OpenAI API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    addLog(`Error generating response: ${errorMessage}`, 'error');
    return `Error: ${errorMessage}`;
  }
}