import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Hash } from 'lucide-react';
import { useFileSystemStore } from '../store/fileSystemStore';
import { CommandSuggestion } from '../types/suggestions';
import { commandRegistry } from '../services/commandRegistry';

interface ChatInputProps {
  onSubmit: (message: string, contextPaths?: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface Suggestion {
  type: 'file' | 'folder' | 'special' | 'command';
  path?: string;
  label: string;
  description?: string;
  command?: string;
}

export function ChatInput({ onSubmit, disabled, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { readDir } = useFileSystemStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    setCursorPosition(e.target.selectionStart || 0);

    const lastAtSymbol = newValue.lastIndexOf('@', e.target.selectionStart || 0);
    if (lastAtSymbol !== -1) {
      const query = newValue.slice(lastAtSymbol + 1, e.target.selectionStart).toLowerCase();
      const suggestions = await getSuggestions(query);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const getSuggestions = async (query: string): Promise<Suggestion[]> => {
    const suggestions: Suggestion[] = [];

    // Add command suggestions
    const commandSuggestions = commandRegistry.getSuggestions(query);
    suggestions.push(...commandSuggestions.map(cmd => ({
      type: 'command',
      label: cmd.label,
      description: cmd.description,
      command: cmd.command
    })));

    // Add special commands
    if ('codebase'.startsWith(query)) {
      suggestions.push({
        type: 'special',
        path: 'Codebase',
        label: 'Entire Codebase',
        description: 'Include all project files in the context'
      });
    }

    // Add root path suggestion
    if ('root'.startsWith(query) || '/'.startsWith(query)) {
      suggestions.push({
        type: 'special',
        path: '/',
        label: 'Root Directory',
        description: 'Only include files in the root directory'
      });
    }

    try {
      const files = await readDir('/');
      const processDirectory = async (path: string, depth = 0) => {
        if (depth > 5) return;

        const entries = await readDir(path);
        for (const entry of entries) {
          if (entry === 'responses' || entry.startsWith('.')) continue;
          
          const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
          const isDirectory = !entry.includes('.');

          if (entry.toLowerCase().includes(query) || fullPath.toLowerCase().includes(query)) {
            suggestions.push({
              type: isDirectory ? 'folder' : 'file',
              path: fullPath,
              label: entry,
              description: isDirectory ? 'Include all files in this directory' : 'Include this specific file'
            });
          }

          if (isDirectory && !['node_modules', '.git', 'dist'].includes(entry)) {
            await processDirectory(fullPath, depth + 1);
          }
        }
      };

      await processDirectory('/');
    } catch (error) {
      console.error('Error reading directory:', error);
    }

    return suggestions;
  };

  const insertSuggestion = (suggestion: Suggestion) => {
    const lastAtSymbol = message.lastIndexOf('@', cursorPosition);
    if (lastAtSymbol !== -1) {
      const before = message.slice(0, lastAtSymbol);
      const after = message.slice(cursorPosition);
      let insertText = '';

      if (suggestion.type === 'command') {
        insertText = suggestion.command || '';
      } else {
        insertText = suggestion.path || '';
      }

      const newMessage = `${before}@${insertText}${after}`;
      setMessage(newMessage);
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertSuggestion(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      const contextPaths = message.match(/@(\/[^\s]+|\w+)/g)?.map(match => match.slice(1)) || [];
      onSubmit(message, contextPaths);
      setMessage('');
    }
  };

  return (
    <div className="p-4 bg-[#252526]">
      <div className="bg-[#1e1e1e] rounded-lg shadow-lg relative">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Type your message... Use @ to reference files/folders or commands"}
              disabled={disabled}
              className={`
                w-full h-36 bg-transparent rounded-lg px-4 pt-6 pb-3 text-sm 
                focus:outline-none border-2 border-transparent 
                ${isFocused ? 'border-gradient-to-r from-[#ff6b2b] to-[#ff8142]' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                text-gray-300 resize-none peer
                focus:shadow-[0_0_0_2px_rgba(255,107,43,0.3)]
              `}
            />
          </div>

          {showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute bottom-full left-0 mb-2 w-full max-h-60 overflow-y-auto bg-[#2d2d2d] rounded-lg shadow-lg border border-[#3d3d3d]"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.type === 'command' ? suggestion.command : suggestion.path}
                  className={`
                    flex flex-col gap-1 px-3 py-2 cursor-pointer
                    ${index === selectedIndex ? 'bg-[#3d3d3d]' : 'hover:bg-[#363636]'}
                  `}
                  onClick={() => insertSuggestion(suggestion)}
                >
                  <div className="flex items-center gap-2">
                    <Hash className={`w-4 h-4 ${
                      suggestion.type === 'folder' 
                        ? 'text-blue-400' 
                        : suggestion.type === 'special'
                          ? 'text-purple-400'
                          : suggestion.type === 'command'
                            ? 'text-orange-400'
                            : 'text-green-400'
                    }`} />
                    <span className="text-sm text-gray-300">{suggestion.label}</span>
                    {suggestion.path && (
                      <span className="text-xs text-gray-500">{suggestion.path}</span>
                    )}
                  </div>
                  {suggestion.description && (
                    <span className="text-xs text-gray-400 ml-6">{suggestion.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="absolute bottom-0 right-0 p-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 opacity-60">Press Enter to send, Shift + Enter for new line</span>
            <button 
              type="submit" 
              disabled={!message.trim() || disabled}
              className={`
                p-2 rounded-lg transition-all duration-300
                ${message.trim() && !disabled
                  ? 'bg-gradient-to-r from-[#ff6b2b] to-[#ff8142] hover:opacity-90 hover:rotate-[-5deg]' 
                  : 'bg-[#2d2d2d] opacity-50 cursor-not-allowed'}
              `}
            >
              {disabled ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatInput;