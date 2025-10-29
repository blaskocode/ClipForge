import { listen } from "@tauri-apps/api/event";
import { Clip } from '../types';

export interface DragDropHandlers {
  setIsDragging: (dragging: boolean) => void;
  processVideoFile: (filePath: string) => Promise<Clip | null>;
  clips: Clip[];
  libraryClips: Clip[];
  onImportComplete: (clip: Clip) => void;
  addToast: (toast: any) => void;
  showErrorToast: (message: string) => any;
  showSuccessToast: (message: string) => any;
  TOAST_MESSAGES: any;
}

export function setupDragAndDrop(handlers: DragDropHandlers) {
  return async () => {
    try {
      // Listen for file drop events
      const unlistenDrop = await listen('tauri://file-drop', (event) => {
        const files = event.payload as string[];
        handleDroppedFiles(files, handlers);
      });

      // Listen for file drop hover events
      const unlistenHover = await listen('tauri://file-drop-hover', () => {
        handlers.setIsDragging(true);
      });

      // Listen for file drop cancelled events
      const unlistenCancelled = await listen('tauri://file-drop-cancelled', () => {
        handlers.setIsDragging(false);
      });

      // Cleanup function
      return () => {
        unlistenDrop();
        unlistenHover();
        unlistenCancelled();
      };
    } catch (error) {
      console.error("Failed to set up drag and drop listeners:", error);
    }
  };
}

export async function handleDroppedFiles(filePaths: string[], handlers: DragDropHandlers) {
  handlers.setIsDragging(false);
  
  // Filter for video files only
  const videoFiles = filePaths.filter(path => {
    const extension = path.split('.').pop()?.toLowerCase();
    return ['mp4', 'mov', 'webm'].includes(extension || '');
  });

  if (videoFiles.length === 0) {
    alert("No video files found. Please drop MP4, MOV, or WebM files.");
    return;
  }

  // Check if bulk import would exceed hard limit (library + timeline)
  const totalClips = handlers.clips.length + handlers.libraryClips.length;
  const totalAfterImport = totalClips + videoFiles.length;
  if (totalAfterImport > 50) {
    alert(`ERROR: Importing ${videoFiles.length} files would exceed the maximum of 50 clips. You currently have ${totalClips} clips. Please import fewer files or remove some clips first.`);
    return;
  }

  // Process each video file and add to library
  for (const filePath of videoFiles) {
    const newClip = await handlers.processVideoFile(filePath);
    if (newClip) {
      handlers.onImportComplete(newClip);
    }
  }
  
  if (videoFiles.length > 1) {
    handlers.addToast(handlers.showSuccessToast(handlers.TOAST_MESSAGES.CLIPS_IMPORTED(videoFiles.length)));
  }
}
