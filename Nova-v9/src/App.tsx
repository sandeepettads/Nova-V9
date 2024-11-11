import React, { useState, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import WorkspacePanel from './components/WorkspacePanel';
import PanelResizer from './components/PanelResizer';
import LogoBar from './components/LogoBar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { generateResponse } from './services/openai';

interface Response {
  id: string;
  message: string;
  timestamp: Date;
  isLoading?: boolean;
}

function App() {
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [chatWidth, setChatWidth] = useState(480);
  const [responses, setResponses] = useState<Response[]>([{
    id: '1',
    message: "Hello! I'm your AI assistant. How can I help you today?\n\nTip: Use @ to reference specific files or folders (e.g., @App.tsx or @/components)",
    timestamp: new Date(),
  }]);

  useEffect(() => {
    const validateAzureOpenAI = async () => {
      try {
        const azureEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
        const azureApiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
        const azureDeploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;

        if (!azureEndpoint || !azureApiKey || !azureDeploymentName) {
          console.error('Azure OpenAI configuration missing');
          return;
        }

        // Test connection with a minimal API call
        const response = await fetch(
          `${azureEndpoint}/openai/deployments/${azureDeploymentName}/chat/completions?api-version=2023-05-15`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${azureApiKey}`
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'Test connection' }],
              max_tokens: 5,
              temperature: 0.7
            })
          }
        );

        if (!response.ok) {
          console.error('Azure OpenAI connection validation failed');
          return;
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
          console.error('Azure OpenAI connection validation failed');
        }
      } catch (error) {
        console.error('Error validating Azure OpenAI connection:', error);
      }
    };

    validateAzureOpenAI();
  }, []);

  const handleChatSubmit = async (message: string, contextPaths?: string[]) => {
    const userMessageId = Date.now().toString();
    setResponses(prev => [...prev, {
      id: userMessageId,
      message: message,
      timestamp: new Date(),
    }]);

    const loadingId = `loading-${Date.now()}`;
    setResponses(prev => [...prev, {
      id: loadingId,
      message: "Thinking...",
      timestamp: new Date(),
      isLoading: true
    }]);

    try {
      const aiResponse = await generateResponse(message, contextPaths);
      
      setResponses(prev => [
        ...prev.filter(r => r.id !== loadingId),
        {
          id: Date.now().toString(),
          message: aiResponse,
          timestamp: new Date(),
        }
      ]);
    } catch (error) {
      setResponses(prev => [
        ...prev.filter(r => r.id !== loadingId),
        {
          id: Date.now().toString(),
          message: error instanceof Error ? error.message : "An error occurred while generating the response.",
          timestamp: new Date(),
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
      <LogoBar />
      <div className="flex flex-1 min-h-0 relative">
        {/* Chat Panel */}
        <div 
          style={{ width: isChatCollapsed ? '0px' : `${chatWidth}px` }} 
          className="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
        >
          <ChatPanel responses={responses} onChatSubmit={handleChatSubmit} />
        </div>

        {/* Panel Resizer with Collapse Button */}
        <div 
          className="absolute h-full flex items-stretch" 
          style={{ left: isChatCollapsed ? '0px' : `${chatWidth}px` }}
        >
          <div className="relative flex">
            <button
              onClick={() => setIsChatCollapsed(!isChatCollapsed)}
              className="absolute top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-[#252526] hover:bg-[#2d2d2d] flex items-center justify-center rounded-r"
            >
              {isChatCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {!isChatCollapsed && (
              <PanelResizer
                position={chatWidth}
                onResize={setChatWidth}
                minWidth={360}
                maxWidth={720}
              />
            )}
          </div>
        </div>

        {/* Workspace Panel */}
        <WorkspacePanel />
      </div>
    </div>
  );
}

export default App;