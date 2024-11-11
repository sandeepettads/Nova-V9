import { useChunkingStore } from '../store/chunkingStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { ErrorHandler } from '../utils/errorHandler';
import { ContextManager } from './contextManager';

// Only define types that aren't already defined in your store types
interface CodeModification {
  filePath: string;
  modifiedCode: string;
  changes: Array<{ type: 'addition' | 'deletion'; content: string }>;
  suggestion: string;
  timestamp: Date;
}

class CodeModificationAgent {
  private static instance: CodeModificationAgent;
  private logger: typeof useChunkingStore.getState;  // Fix: Use correct store type
  private contextManager: ContextManager;

  private readonly SYSTEM_PROMPT = `You are a code modification agent. Your task is to generate code changes in a STRICT format:

1. First, provide a diff of the changes:
\`\`\`diff
- lines to remove (prefix with -)
+ lines to add (prefix with +)
\`\`\`

2. Then, provide the complete modified code, with the entire code content, not just the changes:
\`\`\`language
[entire file content with changes applied]
\`\`\`

CRITICAL REQUIREMENTS:
- Always include BOTH diff and complete code sections.
- Use proper diff format with - and + prefixes.
- Maintain correct indentation in both sections.
- The diff should accurately reflect ALL changes.
- Ensure that the code section includes ALL modified and unmodified parts of the code.
- Use the appropriate language identifier in the code block (e.g., typescript for TypeScript).
- Do NOT include any explanatory text or comments outside the specified format.
- Ensure the response fits within token limits without truncating critical sections.`;

  private constructor() {
    this.logger = useChunkingStore.getState;
    this.contextManager = ContextManager.getInstance();
  }

  static getInstance(): CodeModificationAgent {
    if (!CodeModificationAgent.instance) {
      CodeModificationAgent.instance = new CodeModificationAgent();
    }
    return CodeModificationAgent.instance;
  }

  async processCodeModification(prompt: string, contextPaths: string[]): Promise<void> {
    const { addLog } = this.logger();
    const { setPendingModification } = useWorkspaceStore.getState();
    

    // Get Azure OpenAI configuration
    const azureEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const azureApiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
    const azureDeploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;

    try {
      addLog('Starting code modification process', 'info', 'processing');

      const contexts = await this.contextManager.buildContext(contextPaths, 'modification');
      if (!contexts || contexts.length === 0) {
        throw new Error('No valid file context found for modification');
      }

      const context = contexts[0];
      addLog(`Processing file: ${context.path}`, 'info', 'processing');

      // Use direct fetch call to Azure OpenAI API
      addLog('Generating code modifications...', 'info', 'processing');
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
              { role: 'system', content: this.SYSTEM_PROMPT },
              { role: 'user', content: `File: ${context.path}\nCurrent code:\n${context.content}\n\nChanges needed: ${prompt}` }
            ],
            max_tokens: 2000,
            temperature: 0.7
          })
        }
      );

      const responseData = await response.json();
      const suggestion = responseData.choices[0]?.message?.content;
      if (!suggestion) {
        throw new Error('No modification suggestion generated');
      }

      const { diffContent, modifiedCode } = this.parseResponse(suggestion);
      if (!diffContent || !modifiedCode) {
        throw new Error('Invalid modification format: Missing required sections');
      }

      const changes = this.parseDiff(diffContent);
      if (changes.length === 0) {
        throw new Error('Invalid modification format: No valid changes in diff');
      }

      if (!this.validateModifiedCode(modifiedCode)) {
        throw new Error('Invalid modification format: Modified code appears incomplete');
      }

      addLog('Code modifications generated', 'success', 'processing');
      addLog(`Generated ${changes.length} modifications`, 'success', 'processing');

      const modification: CodeModification = {
        filePath: context.path,
        modifiedCode,
        changes,
        suggestion: suggestion,
        timestamp: new Date()
      };

      setPendingModification(modification);

    } catch (error) {
      addLog('Error processing code modification', 'error', 'processing');
      throw ErrorHandler.handle(error, 'Processing code modification');
    }
  }

  private parseResponse(response: string): { diffContent: string | null; modifiedCode: string | null } {
    const { addLog } = this.logger();

    const diffMatch = response.match(/```diff\n([\s\S]*?)```/);
    const diffContent = diffMatch ? diffMatch[1].trim() : null;

    if (!diffContent) {
      addLog('Failed to extract diff content', 'error', 'processing');
    }

    const codeMatch = response.match(/```(?:[\w-]+)?\n([\s\S]*?)```/g);
    if (!codeMatch || codeMatch.length < 2) {
      addLog('Failed to extract modified code', 'error', 'processing');
      return { diffContent, modifiedCode: null };
    }

    const modifiedCodeMatch = codeMatch[1].match(/```(?:[\w-]+)?\n([\s\S]*?)```/);
    const modifiedCode = modifiedCodeMatch ? modifiedCodeMatch[1].trim() : null;

    return { diffContent, modifiedCode };
  }

  private parseDiff(diffContent: string): Array<{ type: 'addition' | 'deletion'; content: string }> {
    const changes: Array<{ type: 'addition' | 'deletion'; content: string }> = [];
    
    const lines = diffContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        changes.push({
          type: 'addition',
          content: line.slice(1)
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        changes.push({
          type: 'deletion',
          content: line.slice(1)
        });
      }
    }

    return changes;
  }

  private validateModifiedCode(code: string): boolean {
    if (!code || code.length < 10) {
      return false;
    }

    const hasOpeningTags = code.includes('<') && code.includes('>');
    const hasClosingBraces = code.includes('{') && code.includes('}');
    const hasSemicolons = code.includes(';');

    return hasOpeningTags || hasClosingBraces || hasSemicolons;
  }
}

export const codeModificationAgent = CodeModificationAgent.getInstance();