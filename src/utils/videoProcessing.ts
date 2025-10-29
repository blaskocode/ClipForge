import { invoke } from "@tauri-apps/api/core";
import { Clip } from '../types';

export interface VideoProcessingHandlers {
  clips: Clip[];
  addToast: (toast: any) => void;
  showSuccessToast: (message: string) => any;
  showErrorToast: (message: string, details?: string) => any;
  pushState: (state: any) => void;
  selectedClipId: string | null;
  TOAST_MESSAGES: any;
}

export async function processVideoFile(filePath: string, handlers: VideoProcessingHandlers): Promise<Clip | null> {
  console.log("processVideoFile called with path:", filePath);
  try {
    // Check library clip limit - hard limit at 50 clips
    // Note: This is for library only, timeline clips are separate
    const totalClips = handlers.clips.length;
    if (totalClips >= 50) {
      handlers.addToast(handlers.showErrorToast("Maximum of 50 clips in library allowed. Please remove some clips before importing more."));
      return null;
    }
    
    // Warning at 20 clips
    if (totalClips >= 20) {
      const shouldContinue = confirm(
        `WARNING: You have ${totalClips} clips. Importing more than 20 clips may cause performance issues.\n\nDo you want to continue?`
      );
      if (!shouldContinue) return null;
    }

    console.log("Validating video file...");
    // First validate the file
    const validationResult = await invoke<string>("validate_video_file", { filePath });
    console.log("Validation result:", validationResult);
    
    if (validationResult.startsWith("WARNING")) {
      const shouldContinue = confirm(`${validationResult}\n\nDo you want to continue?`);
      if (!shouldContinue) return null;
    }

    console.log("Getting video metadata...");
    // Get metadata
    const metadata = await invoke<{
      duration: number;
      width: number;
      height: number;
      codec: string;
      file_size: number;
    }>("get_video_metadata", { filePath });

    console.log("Metadata:", metadata);

    // Create new clip
    const newClip: Clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      path: filePath,
      filename: filePath.split('/').pop() || 'Unknown',
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      codec: metadata.codec,
      inPoint: 0,
      outPoint: metadata.duration,
      volume: 100,  // Default to normal volume
      muted: false,  // Default to not muted
      track: 'main',  // Default to main track
      fileSize: metadata.file_size,
    };
    
    console.log("New clip created:", newClip);
    
    // Return the clip instead of adding to timeline
    // The caller (App.tsx) will add it to library
    return newClip;
    
  } catch (error) {
    console.error("Error processing video file:", error);
    handlers.addToast(handlers.showErrorToast("Failed to import video", error instanceof Error ? error.message : String(error)));
    return null;
  }
}
