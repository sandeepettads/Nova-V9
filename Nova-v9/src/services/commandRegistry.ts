import { CommandSuggestion } from '../types/suggestions';

class CommandRegistry {
  private commands: CommandSuggestion[] = [
    {
      command: 'sequence',
      label: 'Generate Sequence Diagram',
      description: 'Generate a sequence diagram for the code',
      options: [
        { 
          name: 'scope', 
          values: ['@Codebase', '@filename', '@/folder/'], 
          description: 'Scope of analysis' 
        }
      ]
    },
    {
      command: 'modify',
      label: 'Modify Code',
      description: 'Modify or update existing code',
      options: [
        { name: 'file', description: 'File to modify' },
        { name: 'type', values: ['add', 'update', 'remove'], description: 'Type of modification' }
      ]
    }
  ];

  getSuggestions(query: string): CommandSuggestion[] {
    return this.commands.filter(cmd => 
      cmd.command.toLowerCase().includes(query.toLowerCase()) ||
      cmd.label.toLowerCase().includes(query.toLowerCase())
    );
  }

  getCommand(name: string): CommandSuggestion | undefined {
    return this.commands.find(cmd => cmd.command === name);
  }

  isValidCommand(text: string): boolean {
    return this.commands.some(cmd => text.startsWith(`@${cmd.command}`));
  }

  parseCommand(text: string): { command: string; options: Record<string, string> } | null {
    // First check for command syntax
    const commandMatch = text.match(/@(\w+)/);
    if (!commandMatch) return null;

    const command = commandMatch[1];
    const registeredCommand = this.commands.find(cmd => cmd.command === command);
    if (!registeredCommand) return null;

    // Parse options
    const options: Record<string, string> = {};
    const optionRegex = /--(\w+)=([^\s]+)/g;
    let match;

    while ((match = optionRegex.exec(text)) !== null) {
      options[match[1]] = match[2];
    }

    return {
      command,
      options
    };
  }
}

export const commandRegistry = new CommandRegistry();