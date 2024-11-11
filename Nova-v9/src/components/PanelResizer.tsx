import React, { useCallback } from 'react';

interface PanelResizerProps {
  position: number;
  onResize: (newPosition: number) => void;
  minWidth: number;
  maxWidth: number;
}

export default function PanelResizer({ position, onResize, minWidth, maxWidth }: PanelResizerProps) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'ew-resize';
    
    const startX = e.clientX;
    const startWidth = position;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position, onResize, minWidth, maxWidth]);

  return (
    <div
      className="w-1 hover:w-1.5 h-full bg-[#2d2d2d] hover:bg-[#007acc] cursor-ew-resize transition-all duration-200 flex items-center justify-center group"
      onMouseDown={handleMouseDown}
    >
      <div className="w-0.5 h-8 bg-[#2d2d2d] group-hover:bg-[#007acc] transition-colors duration-200" />
    </div>
  );
}