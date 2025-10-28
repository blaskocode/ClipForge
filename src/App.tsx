import { useState, useEffect } from "react";
import { ImportButton } from "./components/ImportButton";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

// Temporary placeholder types - will be refined in PR #3
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

function App() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Set up drag and drop event listeners
  useEffect(() => {
    const setupDragAndDrop = async () => {
      try {
        // Listen for file drop events
        const unlistenDrop = await listen('tauri://file-drop', (event) => {
          const files = event.payload as string[];
          handleDroppedFiles(files);
        });

        // Listen for file drop hover events
        const unlistenHover = await listen('tauri://file-drop-hover', () => {
          setIsDragging(true);
        });

        // Listen for file drop cancelled events
        const unlistenCancelled = await listen('tauri://file-drop-cancelled', () => {
          setIsDragging(false);
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

    setupDragAndDrop();
  }, []);

  const handleDroppedFiles = async (filePaths: string[]) => {
    setIsDragging(false);
    
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
    const totalAfterImport = clips.length + videoFiles.length;
    if (totalAfterImport > 50) {
      alert(`ERROR: Importing ${videoFiles.length} files would exceed the maximum of 50 clips. You currently have ${clips.length} clips. Please import fewer files or remove some clips first.`);
      return;
    }

    // Process each video file
    for (const filePath of videoFiles) {
      await processVideoFile(filePath);
    }
  };

  const processVideoFile = async (filePath: string) => {
    try {
      // Check clip limit - hard limit at 50 clips
      if (clips.length >= 50) {
        alert("ERROR: Maximum of 50 clips allowed. Please remove some clips before importing more.");
        return;
      }
      
      // Warning at 20 clips
      if (clips.length >= 20) {
        const shouldContinue = confirm(
          `WARNING: You have ${clips.length} clips. Importing more than 20 clips may cause performance issues.\n\nDo you want to continue?`
        );
        if (!shouldContinue) return;
      }

      // First validate the file
      const validationResult = await invoke<string>("validate_video_file", { filePath });
      
      if (validationResult.startsWith("WARNING")) {
        const shouldContinue = confirm(`${validationResult}\n\nDo you want to continue?`);
        if (!shouldContinue) return;
      }

      // Get metadata
      const metadata = await invoke<{
        duration: number;
        width: number;
        height: number;
        codec: string;
      }>("get_video_metadata", { filePath });

      const newClip: Clip = {
        id: crypto.randomUUID(),
        path: filePath,
        filename: filePath.split('/').pop() || "Unknown",
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        codec: metadata.codec,
        inPoint: 0,
        outPoint: metadata.duration
      };
      
      setClips(prev => [...prev, newClip]);
      
    } catch (error) {
      console.error("Import failed:", error);
      alert(`Import failed: ${error}`);
    }
  };

  const handleImport = async (filePath: string) => {
    await processVideoFile(filePath);
  };

  return (
    <div className={`app ${isDragging ? 'dragging' : ''}`}>
      <header>
        <h1>ClipForge</h1>
        <div className="header-controls">
          <ImportButton onImport={handleImport} />
        </div>
      </header>

      {/* Video Player Area */}
      <div className="video-player-area">
        <div className="video-placeholder">
          <p>Video player will appear here</p>
          <p>Selected clip: {selectedClipId || "None"}</p>
          <p>Clips imported: {clips.length}</p>
          {isDragging && <div className="drag-overlay">Drop videos here to import</div>}
        </div>
      </div>

      {/* Timeline Area */}
      <div className="timeline-area">
        <div className="timeline-placeholder">
          <p>Timeline will appear here</p>
          <p>Clips count: {clips.length}</p>
        </div>
      </div>

      {/* Controls Area */}
      <div className="controls-area">
        <p>Trim controls and export button will go here</p>
      </div>
    </div>
  );
}

export default App;
