export interface CodeChange {
  type: 'addition' | 'removal';
  content: string;
  lineNumber?: number;
}

export interface CodeModification {
  originalCode: string;
  modifiedCode: string;
  filePath: string;
  changes: CodeChange[];
  suggestion: string;
  timestamp: Date;
}