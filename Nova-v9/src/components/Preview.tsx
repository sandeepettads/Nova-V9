import React from 'react';
import { Eye } from 'lucide-react';

interface PreviewProps {
  content: string;
}

export default function Preview({ content }: PreviewProps) {
  // Determine content type and render accordingly
  const isHTML = content.trim().startsWith('<') && content.trim().endsWith('>');
  
  return (
    <div className="h-full bg-white">
      {isHTML ? (
        <iframe
          srcDoc={content}
          className="w-full h-full border-none"
          sandbox="allow-scripts"
          title="Preview"
        />
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500">
          <div className="flex flex-col items-center gap-2">
            <Eye className="w-8 h-8" />
            <p>No preview available for this file type</p>
          </div>
        </div>
      )}
    </div>
  );
}