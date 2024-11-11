import React, { useRef, useEffect } from 'react';
import { Bot, User, Loader2, Code, ExternalLink } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import CodeBlock from './CodeBlock';

interface Response {
  id: string;
  message: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ResponseListProps {
  responses: Response[];
}

export default function ResponseList({ responses }: ResponseListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addTab } = useWorkspaceStore();

  const scrollToBottom = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollHeight = container.scrollHeight;
      const currentScroll = container.scrollTop;
      const targetScroll = scrollHeight - container.clientHeight;
      const distance = targetScroll - currentScroll;
      
      let startTime: number | null = null;
      const duration = 500;

      const animateScroll = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = (currentTime - startTime) / duration;

        if (progress < 1) {
          const easeProgress = 1 - Math.pow(1 - progress, 4);
          container.scrollTop = currentScroll + (distance * easeProgress);
          requestAnimationFrame(animateScroll);
        } else {
          container.scrollTop = targetScroll;
        }
      };

      requestAnimationFrame(animateScroll);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [responses]);

  const formatMessage = (message: string) => {
    const parts = message.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const [, language, ...codeParts] = part.split('\n');
        const code = codeParts.slice(0, -1).join('\n');
        
        // Special handling for PlantUML diagrams
        if (language === 'plantuml') {
          return (
            <div key={index} className="relative">
              <CodeBlock
                code={code}
                language={language}
                title="Sequence Diagram"
              />
              <button
                onClick={() => addTab({
                  content: code,
                  type: 'preview',
                  title: 'Sequence Diagram'
                })}
                className="absolute top-2 right-2 p-1 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded transition-colors"
                title="Open in Editor"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          );
        }
        
        return (
          <CodeBlock
            key={index}
            code={code}
            language={language}
          />
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-[#252526] overflow-y-auto custom-scrollbar"
    >
      <div className="p-4 space-y-4">
        {responses.map((response) => (
          <div
            key={response.id}
            className="group bg-[#2d2d2d] rounded-lg p-4 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 duration-300 ease-out relative"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-full p-1 ${
                response.isLoading 
                  ? 'bg-yellow-600' 
                  : response.id === '1' 
                    ? 'bg-[#007acc]' 
                    : 'bg-green-600'
              }`}>
                {response.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : response.id === '1' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs text-gray-400">
                {response.timestamp.toLocaleTimeString()}
              </span>
              <button
                onClick={() => addTab({
                  content: response.message,
                  type: 'response',
                  title: `Response ${response.timestamp.toLocaleTimeString()}`
                })}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-auto p-1 hover:bg-[#3d3d3d] rounded"
                title="View in Editor"
              >
                <Code className="w-4 h-4 text-[#007acc]" />
              </button>
            </div>
            <div className="text-sm text-gray-200 leading-relaxed">
              {formatMessage(response.message)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}