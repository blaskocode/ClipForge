import { useState, useEffect } from "react";
import { ImportButton } from "./components/ImportButton";
import { Timeline } from "./components/Timeline";
import { VideoPlayer } from "./components/VideoPlayer";
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
  const [isPlaying, setIsPlaying] = useState(false);

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
    console.log("processVideoFile called with path:", filePath);
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

      console.log("Validating video file...");
      // First validate the file
      const validationResult = await invoke<string>("validate_video_file", { filePath });
      console.log("Validation result:", validationResult);
      
      if (validationResult.startsWith("WARNING")) {
        const shouldContinue = confirm(`${validationResult}\n\nDo you want to continue?`);
        if (!shouldContinue) return;
      }

      console.log("Getting video metadata...");
      // Get metadata
      const metadata = await invoke<{
        duration: number;
        width: number;
        height: number;
        codec: string;
      }>("get_video_metadata", { filePath });
      console.log("Metadata:", metadata);

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
      
      console.log("New clip created:", newClip);
      setClips(prev => {
        console.log("Setting clips, prev length:", prev.length);
        const updated = [...prev, newClip];
        console.log("Updated clips length:", updated.length);
        return updated;
      });
      
    } catch (error) {
      console.error("Import failed:", error);
      
      // Display user-friendly error in UI
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = `${error}`;
      errorDiv.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #d9534f;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        font-size: 14px;
        max-width: 500px;
        text-align: center;
      `;
      document.body.appendChild(errorDiv);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    }
  };

  const handleImport = async (filePath: string) => {
    await processVideoFile(filePath);
  };

  const handleClipSelect = (clipId: string) => {
    setSelectedClipId(clipId);
  };

  // Calculate total timeline duration
  const totalTimelineDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);

  // Timeline playback loop
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setPlayheadPosition(prev => {
        const next = prev + 0.033; // ~30fps updates
        
        // Stop at end of timeline
        if (next >= totalTimelineDuration) {
          setIsPlaying(false);
          return totalTimelineDuration;
        }
        
        return next;
      });
    }, 33); // ~30fps
    
    return () => clearInterval(interval);
  }, [isPlaying, totalTimelineDuration]);

  // Get the clip and local time at current playhead position
  const getClipAtPlayhead = (position: number): { clip: Clip; localTime: number } | null => {
    let accumulatedTime = 0;
    
    for (const clip of clips) {
      const clipDuration = clip.duration;
      if (position >= accumulatedTime && position < accumulatedTime + clipDuration) {
        return {
          clip,
          localTime: position - accumulatedTime
        };
      }
      accumulatedTime += clipDuration;
    }
    
    return null;
  };

  const handleSeek = (time: number) => {
    setPlayheadPosition(time);
  };

  const handlePlayPause = () => {
    if (clips.length === 0) return;
    
    // If at the end, restart from beginning
    if (playheadPosition >= totalTimelineDuration) {
      setPlayheadPosition(0);
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleDeleteClip = (clipId: string) => {
    setClips(prev => prev.filter(c => c.id !== clipId));
    
    // Clear selection if deleted clip was selected
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
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
        {isDragging && <div className="drag-overlay">Drop videos here to import</div>}
        <VideoPlayer 
          clipAtPlayhead={getClipAtPlayhead(playheadPosition)}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          totalTimelineDuration={totalTimelineDuration}
          playheadPosition={playheadPosition}
        />
      </div>

      {/* Timeline Area */}
      <div className="timeline-area">
        <Timeline
          clips={clips}
          playheadPosition={playheadPosition}
          selectedClipId={selectedClipId}
          onClipSelect={handleClipSelect}
          onSeek={handleSeek}
          onDeleteClip={handleDeleteClip}
        />
      </div>

      {/* Controls Area */}
      <div className="controls-area">
        <p>Trim controls and export button will go here</p>
      </div>
    </div>
  );
}

export default App;
