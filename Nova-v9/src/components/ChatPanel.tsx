import React, { useState } from 'react';
import ResponseList from './ResponseList';
import ChatInput from './ChatInput';
import LoadingOverlay from './LoadingOverlay';
import { useChunkingStore } from '../store/chunkingStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { codeModificationAgent } from '../services/codeModificationAgent';
import { SequenceDiagramAgent } from '../services/sequenceDiagramAgent';
import { commandRegistry } from '../services/commandRegistry';

interface Response {
  id: string;
  message: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatPanelProps {
  responses: Response[];
  onChatSubmit: (message: string, contextPaths?: string[]) => void;
}

export default function ChatPanel({ responses, onChatSubmit }: ChatPanelProps) {
  const { isProcessing, addLog } = useChunkingStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const { setPendingModification, addTab } = useWorkspaceStore();

  const handleChatSubmit = async (message: string, contextPaths?: string[]) => {
    try {
      if (contextPaths?.length) {
        addLog(`Using context paths: ${contextPaths.join(', ')}`, 'info');
      }

      // Check for sequence diagram command
      const command = commandRegistry.parseCommand(message);
      if (command?.command === 'sequence') {
        setIsGenerating(true);
        addLog('Processing sequence diagram request', 'info');
        
        try {
          const agent = SequenceDiagramAgent.getInstance();
          // Get scope from context paths or default to Codebase
          const scope = contextPaths?.length ? contextPaths[contextPaths.length - 1] : 'Codebase';
          addLog(`Using scope: ${scope}`, 'info');
          
          const plantUML = await agent.generateSequenceDiagram(scope);
          
          // Add diagram to editor
          addTab({
            content: plantUML,
            type: 'preview',
            title: `Sequence Diagram - ${scope}`
          });
          
          addLog('Sequence diagram generated successfully', 'success');
        } finally {
          setIsGenerating(false);
        }
        return;
      }

      // Check for code modification command
      const isModificationRequest = message.toLowerCase().includes('add') || 
                                  message.toLowerCase().includes('modify') || 
                                  message.toLowerCase().includes('update');

      if (isModificationRequest && contextPaths && contextPaths.length > 0) {
        setIsGenerating(true);
        addLog('Detected code modification request', 'info');
        
        try {
          await codeModificationAgent.processCodeModification(message, contextPaths);
          addLog('Code modifications generated', 'success');
        } finally {
          setIsGenerating(false);
        }
        return;
      }

      addLog('Processing regular chat message', 'info');
      onChatSubmit(message, contextPaths);
    } catch (error) {
      addLog(`Error processing chat: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      console.error('Chat processing error:', error);
    }
  };

  return (
    <div className="h-full flex flex-col border-r border-[#2d2d2d] relative">
      <ResponseList responses={responses} />
      <ChatInput 
        onSubmit={handleChatSubmit} 
        disabled={isProcessing || isGenerating}
        placeholder={
          isGenerating 
            ? "Generating..." 
            : isProcessing 
              ? "Processing code context..." 
              : "How can I help you today? Use @ to reference files/folders"
        }
      />
      
      {isGenerating && (
        <LoadingOverlay message="Generating..." />
      )}
    </div>
  );
}