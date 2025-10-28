export interface KeyboardHandlers {
  handleNewProject: () => void;
  handleExport: () => void;
  undo: () => void;
  redo: () => void;
  handleSaveProject: () => void;
  handleLoadProject: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomToFit: () => void;
  setShowKeyboardHelp: (show: boolean) => void;
  handlePlayPause: () => void;
  updatePlayheadPosition: (position: number) => void;
  playheadPosition: number;
  totalTimelineDuration: number;
  handleSetInPoint: () => void;
  handleSetOutPoint: () => void;
  handleDeleteClip: (clipId: string) => void;
  selectedClipId: string | null;
  addToast: (toast: any) => void;
  showSuccessToast: (message: string) => any;
  TOAST_MESSAGES: any;
}

export function createKeyboardHandler(handlers: KeyboardHandlers) {
  return (e: KeyboardEvent) => {
    // Skip if user is typing in an input or textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Cmd+N / Ctrl+N for New Project
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      handlers.handleNewProject();
      return;
    }

    // Cmd+E / Ctrl+E for Quick Export
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      handlers.handleExport();
      return;
    }

    // Cmd+Z / Ctrl+Z for Undo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handlers.undo();
      handlers.addToast(handlers.showSuccessToast(handlers.TOAST_MESSAGES.UNDO));
      return;
    }

    // Cmd+Shift+Z / Ctrl+Y for Redo
    if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || 
        ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
      e.preventDefault();
      handlers.redo();
      handlers.addToast(handlers.showSuccessToast(handlers.TOAST_MESSAGES.REDO));
      return;
    }

    // Cmd+S / Ctrl+S for Save Project
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handlers.handleSaveProject();
      return;
    }

    // Cmd+O / Ctrl+O for Open Project
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault();
      handlers.handleLoadProject();
      return;
    }

    // Cmd++ / Ctrl++ for Zoom In
    if ((e.metaKey || e.ctrlKey) && e.key === '=') {
      e.preventDefault();
      handlers.handleZoomIn();
      return;
    }

    // Cmd+- / Ctrl+- for Zoom Out
    if ((e.metaKey || e.ctrlKey) && e.key === '-') {
      e.preventDefault();
      handlers.handleZoomOut();
      return;
    }

    // Cmd+0 / Ctrl+0 for Zoom to Fit
    if ((e.metaKey || e.ctrlKey) && e.key === '0') {
      e.preventDefault();
      handlers.handleZoomToFit();
      return;
    }

    // ? for Keyboard Help
    if (e.key === '?') {
      e.preventDefault();
      handlers.setShowKeyboardHelp(true);
      return;
    }

    // Esc to close dialogs
    if (e.key === 'Escape') {
      e.preventDefault();
      handlers.setShowKeyboardHelp(false);
      return;
    }

    // Spacebar for play/pause
    if (e.code === 'Space') {
      e.preventDefault();
      handlers.handlePlayPause();
      return;
    }

    // Arrow keys for seeking
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlers.updatePlayheadPosition(Math.max(0, handlers.playheadPosition - 5));
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handlers.updatePlayheadPosition(Math.min(handlers.totalTimelineDuration, handlers.playheadPosition + 5));
      return;
    }

    // J/K/L for playback control
    if (e.key === 'j') {
      e.preventDefault();
      handlers.updatePlayheadPosition(Math.max(0, handlers.playheadPosition - 5));
      return;
    }
    if (e.key === 'k') {
      e.preventDefault();
      handlers.handlePlayPause();
      return;
    }
    if (e.key === 'l') {
      e.preventDefault();
      handlers.updatePlayheadPosition(Math.min(handlers.totalTimelineDuration, handlers.playheadPosition + 5));
      return;
    }

    // Home/End for timeline navigation
    if (e.key === 'Home') {
      e.preventDefault();
      handlers.updatePlayheadPosition(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      handlers.updatePlayheadPosition(handlers.totalTimelineDuration);
      return;
    }

    // I/O for trim points
    if (e.key === 'i') {
      e.preventDefault();
      handlers.handleSetInPoint();
      return;
    }
    if (e.key === 'o') {
      e.preventDefault();
      handlers.handleSetOutPoint();
      return;
    }

    // Delete or Backspace key - delete selected clip with confirmation
    if ((e.key === 'Delete' || e.key === 'Backspace') && handlers.selectedClipId) {
      e.preventDefault();
      
      // Create a custom confirmation dialog (same as Timeline.tsx)
      const confirmDialog = document.createElement('div');
      confirmDialog.className = 'confirm-dialog';
      confirmDialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #333;
        border: 1px solid #555;
        border-radius: 5px;
        padding: 20px;
        z-index: 1000;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
        text-align: center;
      `;
      
      // Add overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 999;
      `;
      
      // Add message
      const message = document.createElement('p');
      message.textContent = 'Delete this clip from timeline?';
      message.style.marginBottom = '20px';
      confirmDialog.appendChild(message);
      
      // Add buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.justifyContent = 'center';
      buttonsContainer.style.gap = '10px';
      
      // Add confirm button
      const confirmButton = document.createElement('button');
      confirmButton.textContent = 'Delete';
      confirmButton.style.cssText = `
        padding: 8px 16px;
        background: #d9534f;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      confirmButton.onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(confirmDialog);
        if (handlers.selectedClipId) {
          handlers.handleDeleteClip(handlers.selectedClipId);
        }
      };
      
      // Add cancel button
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.cssText = `
        padding: 8px 16px;
        background: #666;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      cancelButton.onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(confirmDialog);
      };
      
      buttonsContainer.appendChild(confirmButton);
      buttonsContainer.appendChild(cancelButton);
      confirmDialog.appendChild(buttonsContainer);
      
      // Add to DOM
      document.body.appendChild(overlay);
      document.body.appendChild(confirmDialog);
      
      return;
    }
  };
}
