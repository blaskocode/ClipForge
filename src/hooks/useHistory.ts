import { useState, useCallback } from 'react';

export interface HistoryState {
  clips: any[];
  selectedClipId: string | null;
}

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  pushState: (state: HistoryState) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useHistory(initialState: HistoryState): HistoryState & HistoryActions {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [present, setPresent] = useState<HistoryState>(initialState);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const newFuture = [present, ...future];

    setPast(newPast);
    setPresent(previous);
    setFuture(newFuture);
  }, [past, present, future]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newPast = [...past, present];
    const newFuture = future.slice(1);

    setPast(newPast);
    setPresent(next);
    setFuture(newFuture);
  }, [past, present, future]);

  const pushState = useCallback((newState: HistoryState) => {
    // Don't push if state hasn't changed
    if (JSON.stringify(newState) === JSON.stringify(present)) {
      return;
    }

    setPast(prev => [...prev, present]);
    setPresent(newState);
    setFuture([]); // Clear future when new action is performed
  }, [present]);

  return {
    ...present,
    undo,
    redo,
    pushState,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
