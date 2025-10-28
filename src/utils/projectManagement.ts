import { invoke } from "@tauri-apps/api/core";
import { Clip } from '../types';

export interface ProjectHandlers {
  clips: Clip[];
  selectedClipId: string | null;
  playheadPosition: number;
  pushState: (state: any) => void;
  setPlayheadPosition: (position: number) => void;
  setIsPlaying: (playing: boolean) => void;
  addToast: (toast: any) => void;
  showSuccessToast: (message: string) => any;
  showErrorToast: (message: string, details?: string) => any;
  TOAST_MESSAGES: any;
}

export async function saveProject(handlers: ProjectHandlers): Promise<void> {
  try {
    await invoke<string>("save_project", {
      clips: handlers.clips.map(clip => ({
        id: clip.id,
        path: clip.path,
        filename: clip.filename,
        duration: clip.duration,
        width: clip.width,
        height: clip.height,
        codec: clip.codec,
        inPoint: clip.inPoint,
        outPoint: clip.outPoint,
        volume: clip.volume,
        muted: clip.muted,
      })),
      timelineState: {
        selected_clip_id: handlers.selectedClipId,
        playhead_position: handlers.playheadPosition,
      },
    });

    handlers.addToast(handlers.showSuccessToast(handlers.TOAST_MESSAGES.PROJECT_SAVED));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Don't show error if user cancelled the dialog
    if (!errorMessage.includes("No file selected") && !errorMessage.includes("Dialog error")) {
      handlers.addToast(handlers.showErrorToast("Failed to save project", errorMessage));
    }
  }
}

export async function loadProject(handlers: ProjectHandlers): Promise<void> {
  try {
    const project = await invoke<any>("load_project");
    
    // Convert loaded project to current state format
    const loadedClips: Clip[] = project.clips.map((clip: any) => ({
      id: clip.id,
      path: clip.path,
      filename: clip.filename,
      duration: clip.duration,
      width: clip.width,
      height: clip.height,
      codec: clip.codec,
      inPoint: clip.inPoint || 0,  // Default to 0 if not present
      outPoint: clip.outPoint || clip.duration,  // Default to full duration if not present
      volume: clip.volume || 100,  // Default to 100 if not present
      muted: clip.muted || false,  // Default to false if not present
    }));

    // Update state with loaded project
    handlers.pushState({
      clips: loadedClips,
      selectedClipId: project.timeline_state.selected_clip_id,
    });
    
    // Restore playhead position separately (not part of undo history)
    handlers.setPlayheadPosition(project.timeline_state.playhead_position);

    handlers.addToast(handlers.showSuccessToast(handlers.TOAST_MESSAGES.PROJECT_LOADED));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Don't show error if user cancelled the dialog
    if (!errorMessage.includes("No file selected") && !errorMessage.includes("Dialog error")) {
      handlers.addToast(handlers.showErrorToast("Failed to load project", errorMessage));
    }
  }
}

export function createNewProject(handlers: ProjectHandlers): void {
  if (handlers.clips.length === 0) return;
  
  // Create a custom confirmation dialog (same style as other dialogs)
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
  message.textContent = 'Start new project? Current timeline will be cleared.';
  message.style.marginBottom = '20px';
  confirmDialog.appendChild(message);
  
  // Add buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.justifyContent = 'center';
  buttonsContainer.style.gap = '10px';
  
  // Add confirm button
  const confirmButton = document.createElement('button');
  confirmButton.textContent = 'New Project';
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
    
    // Only create new project if user confirms
    handlers.pushState({
      clips: [],
      selectedClipId: null,
    });
    handlers.setPlayheadPosition(0); // Reset playhead separately
    handlers.setIsPlaying(false);
    handlers.addToast(handlers.showSuccessToast(handlers.TOAST_MESSAGES.NEW_PROJECT));
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
    // Do nothing - user cancelled
  };
  
  buttonsContainer.appendChild(confirmButton);
  buttonsContainer.appendChild(cancelButton);
  confirmDialog.appendChild(buttonsContainer);
  
  // Add to DOM
  document.body.appendChild(overlay);
  document.body.appendChild(confirmDialog);
}
