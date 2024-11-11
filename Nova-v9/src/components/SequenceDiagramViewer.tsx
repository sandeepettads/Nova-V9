import React, { useState } from 'react';
import { Download, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

interface SequenceDiagramViewerProps {
  plantUML: string;
  onDownload?: () => void;
  onOpenInEditor?: () => void;
}

export default function SequenceDiagramViewer({
  plantUML,
  onDownload,
  onOpenInEditor
}: SequenceDiagramViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleError = () => {
    setError('Failed to render diagram');
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  // Encode PlantUML for the server
  const encodedDiagram = btoa(plantUML).replace(/\+/g, '-').replace(/\//g, '_');
  const diagramUrl = `https://www.plantuml.com/plantuml/svg/${encodedDiagram}`;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="flex items-center justify-between p-2 bg-[#252526] border-b border-[#2d2d2d]">
        <span className="text-sm font-medium text-[#e1e1e1]">Sequence Diagram</span>
        <div className="flex items-center gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-1 hover:bg-[#2d2d2d] rounded transition-colors"
              title="Download SVG"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {onOpenInEditor && (
            <button
              onClick={onOpenInEditor}
              className="p-1 hover:bg-[#2d2d2d] rounded transition-colors"
              title="Open in Editor"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-[#007acc] animate-spin" />
              <span className="text-sm text-[#6e6e6e]">Rendering diagram...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3 text-center max-w-lg">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Failed to render diagram</h3>
                <p className="text-sm text-gray-500 mb-4">Please check the PlantUML syntax or try again</p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-600 overflow-auto max-h-[200px]">
                    {plantUML}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <img
          src={diagramUrl}
          alt="Sequence Diagram"
          className="max-w-full mx-auto"
          onLoad={handleLoad}
          onError={handleError}
          style={{ display: isLoading || error ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}