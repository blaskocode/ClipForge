// Export utility functions for ClipForge

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

/**
 * Generates a smart default filename for export based on clips
 * 
 * @param clips - Array of clips to export
 * @returns Default filename with format: [clipname]-edited-[date].mp4
 */
export function generateDefaultFilename(clips: Clip[]): string {
  if (clips.length === 0) {
    return `clipforge-export-${new Date().toISOString().split('T')[0]}.mp4`;
  }
  
  const firstName = clips[0].filename.replace(/\.[^/.]+$/, ''); // Remove extension
  const sanitized = firstName.replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize
  const timestamp = new Date().toISOString().split('T')[0];
  
  return `${sanitized}-edited-${timestamp}.mp4`;
}

/**
 * Opens the folder containing the specified file path
 * 
 * @param filePath - Full path to the file
 * @param openFunc - The open function from @tauri-apps/plugin-opener
 */
export async function openContainingFolder(
  filePath: string,
  openFunc: (path: string) => Promise<void>
): Promise<void> {
  try {
    // Get the directory path
    const directory = filePath.substring(0, filePath.lastIndexOf('/'));
    await openFunc(directory);
  } catch (error) {
    console.error('Failed to open folder:', error);
    throw error;
  }
}

