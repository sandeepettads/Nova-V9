import React, { useState } from 'react';
import { Save, RotateCcw, Trash2, Clock } from 'lucide-react';
import { useCheckpointStore } from '../store/checkpointStore';
import ConfirmDialog from './ConfirmDialog';

export default function CheckpointManager() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [checkpointToDelete, setCheckpointToDelete] = useState<string | null>(null);
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const { 
    checkpoints, 
    createCheckpoint, 
    restoreCheckpoint, 
    deleteCheckpoint,
    currentCheckpoint 
  } = useCheckpointStore();

  const handleCreateCheckpoint = async () => {
    if (!newCheckpointName.trim()) return;
    
    setIsCreating(true);
    try {
      await createCheckpoint(newCheckpointName);
      setNewCheckpointName('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setCheckpointToDelete(id);
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (checkpointToDelete) {
      deleteCheckpoint(checkpointToDelete);
      setCheckpointToDelete(null);
    }
    setShowConfirm(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="border-t border-[#2d2d2d]">
      <div className="p-3 bg-[#252526]">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newCheckpointName}
            onChange={(e) => setNewCheckpointName(e.target.value)}
            placeholder="Checkpoint name"
            className="flex-1 bg-[#1e1e1e] rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#007acc]"
          />
          <button
            onClick={handleCreateCheckpoint}
            disabled={isCreating || !newCheckpointName.trim()}
            className="bg-[#007acc] hover:bg-[#1a8ad4] rounded px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
          {checkpoints.map((checkpoint) => (
            <div
              key={checkpoint.id}
              className={`flex items-center justify-between p-2 rounded ${
                currentCheckpoint === checkpoint.id
                  ? 'bg-[#37373d]'
                  : 'hover:bg-[#2d2d2d]'
              }`}
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-[#e1e1e1]">
                  {checkpoint.name}
                </div>
                <div className="text-xs text-[#8c8c8c] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(checkpoint.timestamp)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => restoreCheckpoint(checkpoint.id)}
                  className="p-1 hover:bg-[#2d2d2d] rounded"
                  title="Restore checkpoint"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(checkpoint.id)}
                  className="p-1 hover:bg-[#2d2d2d] rounded text-red-500"
                  title="Delete checkpoint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete Checkpoint"
        message="Are you sure you want to delete this checkpoint? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}