import { listen } from "@tauri-apps/api/event";
import { Clip } from '../types';

export interface DragDropHandlers {
  setIsDragging: (dragging: boolean) => void;
  processVideoFile: (filePath: string) => Promise<void>;
  clips: Clip[];
  addToast: (toast: any) => void;
  showErrorToast: (message: string) => any;
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

  // Check if bulk import would exceed hard limit
  const totalAfterImport = handlers.clips.length + videoFiles.length;
  if (totalAfterImport > 50) {
    alert(`ERROR: Importing ${videoFiles.length} files would exceed the maximum of 50 clips. You currently have ${handlers.clips.length} clips. Please import fewer files or remove some clips first.`);
    return;
  }

  // Process each video file
  for (const filePath of videoFiles) {
    await handlers.processVideoFile(filePath);
  }
}
