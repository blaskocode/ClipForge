// Custom hook for export functionality
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { generateDefaultFilename } from "../utils/exportHelpers";

interface Clip {
  id: string;
  path: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  codec: string;
  inPoint: number;
  outPoint: number;
}

interface UseExportReturn {
  isExporting: boolean;
  exportError: string | null;
  exportSuccess: string | null;
  handleExport: () => Promise<void>;
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

  const handleExport = async () => {
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
      
      // Prepare clip data
      const clipData = clips.map(clip => ({
        path: clip.path,
        in_point: clip.inPoint,
        out_point: clip.outPoint,
      }));
      
      // Export
      await invoke<string>('export_video', {
        clips: clipData,
        outputPath,
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

