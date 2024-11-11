export interface CommandOption {
  name: string;
  values?: string[];
  description: string;
}

export interface CommandSuggestion {
  command: string;
  label: string;
  description: string;
  options?: CommandOption[];
}