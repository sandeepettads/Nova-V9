/// <reference types="vite/client" />

declare module 'browserfs' {
  const BrowserFS: any;
  export default BrowserFS;
}

declare module '@monaco-editor/react' {
  import { FC } from 'react';
  
  interface EditorProps {
    height: string | number;
    language?: string;
    value?: string;
    theme?: string;
    options?: Record<string, any>;
    onChange?: (value: string | undefined) => void;
  }

  export const Editor: FC<EditorProps>;
}

interface HTMLInputElement extends HTMLElement {
  webkitdirectory?: string;
  directory?: string;
}