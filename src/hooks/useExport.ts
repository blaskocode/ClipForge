// Custom hook for export functionality
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { generateDefaultFilename } from "../utils/exportHelpers";
import { Clip } from "../types";

interface UseExportReturn {
  isExporting: boolean;
  exportError: string | null;
  exportSuccess: string | null;
  handleExport: (width: number, height: number) => Promise<void>;
  clearExportError: () => void;
  clearExportSuccess: () => void;
}

/**
 * Custom hook for managing video export state and logic
 * 
 * @param clips - Array of clips to export
 * @returns Export state and handlers
 */
export function useExport(clips: Clip[]): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const handleExport = async (width: number, height: number) => {
    if (clips.length === 0) {
      setExportError("No clips to export. Import videos first.");
      return;
    }
    
    try {
      setIsExporting(true);
      setExportError(null);
      setExportSuccess(null);
      
      // Generate filename
      const defaultFilename = generateDefaultFilename(clips);
      
      // Show save dialog with file overwrite protection loop
      let outputPath: string | null = null;
      
      while (true) {
        try {
          outputPath = await invoke<string | null>('select_export_path', {
            defaultFilename,
          });
          
          if (!outputPath) {
            // User cancelled
            setIsExporting(false);
            return;
          }
          
          break; // Got a valid path, exit loop
          
        } catch (error) {
          const errorStr = String(error);
          
          // Check if file exists
          if (errorStr.startsWith('FILE_EXISTS:')) {
            const existingPath = errorStr.substring('FILE_EXISTS:'.length);
            
            // Show confirmation dialog
            const confirmed = window.confirm(
              `File already exists:\n${existingPath}\n\nDo you want to overwrite it?`
            );
            
            if (confirmed) {
              outputPath = existingPath;
              break;
            } else {
              // User declined, show dialog again
              continue;
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
      }
      
      // Separate clips by track
      const mainTrackClips = clips.filter(clip => clip.track === 'main');
      const pipTrackClips = clips.filter(clip => clip.track === 'pip');
      
      // Prepare clip data for each track
      const mainTrackData = mainTrackClips.map(clip => ({
        path: clip.path,
        duration: clip.duration,
        inPoint: clip.inPoint,
        outPoint: clip.outPoint,
        volume: clip.volume,
        muted: clip.muted,
        sourceOffset: clip.sourceOffset,
      }));
      
      const pipTrackData = pipTrackClips.map(clip => ({
        path: clip.path,
        duration: clip.duration,
        inPoint: clip.inPoint,
        outPoint: clip.outPoint,
        volume: clip.volume,
        muted: clip.muted,
        sourceOffset: clip.sourceOffset,
        pipSettings: clip.pipSettings,
      }));
      
      // Export with multi-track support and resolution
      await invoke<string>('export_multi_track_video', {
        mainTrackClips: mainTrackData,
        pipTrackClips: pipTrackData,
        outputPath,
        width,
        height,
      });
      
      setExportSuccess(outputPath);
      
    } catch (error) {
      console.error('Export error:', error);
      setExportError(String(error));
    } finally {
      setIsExporting(false);
    }
  };

  const clearExportError = () => setExportError(null);
  const clearExportSuccess = () => setExportSuccess(null);

  return {
    isExporting,
    exportError,
    exportSuccess,
    handleExport,
    clearExportError,
    clearExportSuccess,
  };
}

