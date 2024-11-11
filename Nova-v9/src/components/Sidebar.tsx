import React from 'react';
import { BookOpen, Code, Settings } from 'lucide-react';
import ChatInput from './ChatInput';

interface SidebarProps {
  onChatSubmit: (message: string) => void;
}

const items = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Documentation',
    description: 'Learn how to use the editor and its features',
  },
  {
    icon: <Code className="w-5 h-5" />,
    title: 'Code Examples',
    description: 'Browse through sample code and templates',
  },
  {
    icon: <Settings className="w-5 h-5" />,
    title: 'Settings',
    description: 'Customize your editor preferences',
  },
];

export default function Sidebar({ onChatSubmit }: SidebarProps) {
  return (
    <>
      <div className="flex-1 bg-[#252526] p-4 overflow-y-auto custom-scrollbar">
        <h2 className="text-xl font-semibold mb-6 text-gray-200">Workspace</h2>
        <div className="space-y-1">
          {items.map((item, index) => (
            <div
              key={index}
              className="p-2 rounded hover:bg-[#2d2d2d] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <div>
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-[#2d2d2d]">
        <ChatInput onSubmit={onChatSubmit} />
      </div>
    </>
  );
}