import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#252526] rounded-lg shadow-xl w-[400px] border border-[#2d2d2d]">
        <div className="p-4 flex items-start gap-3">
          <div className="text-yellow-500 mt-1">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[#e1e1e1] font-medium mb-2">{title}</h3>
            <p className="text-[#cccccc] text-sm">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 bg-[#2d2d2d]/50">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#2d2d2d] rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}