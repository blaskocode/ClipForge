import React from 'react';

interface UndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const UndoRedoButtons: React.FC<UndoRedoButtonsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="undo-redo-buttons">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="undo-button"
        title="Undo (Cmd+Z)"
      >
        ↶ Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="redo-button"
        title="Redo (Cmd+Shift+Z)"
      >
        ↷ Redo
      </button>
    </div>
  );
};
