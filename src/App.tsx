import { useState, useEffect, useRef } from "react";
import { ImportButton } from "./components/ImportButton";
import { Timeline } from "./components/Timeline";
import { VideoPlayer } from "./components/VideoPlayer";
import { TrimControls } from "./components/TrimControls";
import { ExportButton } from "./components/ExportButton";
import { KeyboardShortcutsHelp } from "./components/KeyboardShortcutsHelp";
import { ToastContainer } from "./components/ToastContainer";
import { UndoRedoButtons } from "./components/UndoRedoButtons";
import { ProjectMenu } from "./components/ProjectMenu";
import { AudioControls } from "./components/AudioControls";
import { ZoomControls } from "./components/ZoomControls";
import { Toast, showSuccessToast, showErrorToast, TOAST_MESSAGES } from "./utils/toastHelpers";
import { useHistory, HistoryState } from "./hooks/useHistory";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useExport } from "./hooks/useExport";
import { usePlaybackLoop } from "./hooks/usePlaybackLoop";
import { ClipAtPlayhead, Clip } from "./types";
import { createKeyboardHandler } from "./utils/keyboardHandler";
import { setupDragAndDrop } from "./utils/dragDrop";
import { processVideoFile } from "./utils/videoProcessing";
import { saveProject, loadProject, createNewProject } from "./utils/projectManagement";
import { handleZoomIn, handleZoomOut, handleZoomToFit } from "./utils/zoomControls";
import { handleVolumeChange, handleMuteToggle } from "./utils/audioControls";
import "./App.css";

function App() {
  // Initialize history with empty state
  const initialState: HistoryState = {
    clips: [],
    selectedClipId: null,
  };

  const {
    clips,
    selectedClipId,
    undo,
    redo,
    pushState,
    canUndo,
    canRedo,
  } = useHistory(initialState);

  // Playhead position is separate - not part of undo/redo history (professional behavior)
  const [playheadPosition, setPlayheadPosition] = useState(0);
  
  // Ref to store current playhead position for synchronous access during playback
  const playheadPositionRef = useRef(0);

  // Keep ref in sync with state
  useEffect(() => {
    playheadPositionRef.current = playheadPosition;
  }, [playheadPosition]);

  // Local state for UI-only concerns
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoActuallyPlaying, setIsVideoActuallyPlaying] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Toast system
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Toast) => {
    setToasts(prev => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Export functionality
  const {
    isExporting,
    exportError,
    exportSuccess,
    handleExport,
    clearExportError,
    clearExportSuccess,
  } = useExport(clips);

  // Set up drag and drop event listeners
  useEffect(() => {
    const dragDropHandlers = {
      setIsDragging,
      processVideoFile: (filePath: string) => processVideoFile(filePath, {
        clips,
        addToast,
        showSuccessToast,
        showErrorToast,
        pushState,
        selectedClipId,
        TOAST_MESSAGES,
      }),
      clips,
      addToast,
      showErrorToast,
    };

    const cleanup = setupDragAndDrop(dragDropHandlers);
    if (cleanup) {
      cleanup();
    }
  }, [clips, selectedClipId]);

  const handleImport = async (filePath: string) => {
    await processVideoFile(filePath, {
      clips,
      addToast,
      showSuccessToast,
      showErrorToast,
      pushState,
      selectedClipId,
      TOAST_MESSAGES,
    });
  };

  // Helper function to update selected clip with history
  const updateSelectedClip = (clipId: string | null) => {
    pushState({
      clips,
      selectedClipId: clipId,
    });
  };

  const handleClipSelect = (clipId: string) => {
    updateSelectedClip(clipId);
  };

  // Calculate total timeline duration using FULL clip durations
  const totalTimelineDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);

  // Helper function to update playhead position (NOT in history - professional behavior)
  const updatePlayheadPosition = (newPosition: number) => {
    setPlayheadPosition(newPosition);
    playheadPositionRef.current = newPosition; // Keep ref in sync
  };

  // Timeline playback loop with smart trim skipping
  usePlaybackLoop({
    isPlaying,
    isVideoActuallyPlaying,
    clips,
    totalTimelineDuration,
    playheadPosition,
    setIsPlaying,
    updatePlayheadPosition,
  });

  // Utility function to find which clip the playhead is currently over
  const getClipAtPlayhead = (position: number): ClipAtPlayhead | null => {
    let accumulatedTime = 0;
    
    for (const clip of clips) {
      const clipStart = accumulatedTime;
      const clipEnd = accumulatedTime + clip.duration;
      
      if (position >= clipStart && position < clipEnd) {
        const localTime = position - clipStart;
        return { clip, localTime };
      }
      
      accumulatedTime += clip.duration;
    }
    
    return null;
  };

  // Helper functions for trim point setting
  const handleSetInPoint = () => {
    const currentPlayheadPosition = playheadPositionRef.current;
    const clipAtPlayhead = getClipAtPlayhead(currentPlayheadPosition);
    if (clipAtPlayhead) {
      handleTrimChange(clipAtPlayhead.clip.id, clipAtPlayhead.localTime, clipAtPlayhead.clip.outPoint);
    }
  };

  const handleSetOutPoint = () => {
    const currentPlayheadPosition = playheadPositionRef.current;
    const clipAtPlayhead = getClipAtPlayhead(currentPlayheadPosition);
    if (clipAtPlayhead) {
      handleTrimChange(clipAtPlayhead.clip.id, clipAtPlayhead.clip.inPoint, clipAtPlayhead.localTime);
      setIsPlaying(false); // Stop playback when Out Point is set
    }
  };

  // Handle clip reordering
  const handleClipsReorder = (newClips: Clip[]) => {
    pushState({
      clips: newClips,
      selectedClipId,
    });
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVideoPlayStateChange = (isActuallyPlaying: boolean) => {
    setIsVideoActuallyPlaying(isActuallyPlaying);
  };

  const handleDeleteClip = (clipId: string) => {
    const newClips = clips.filter(c => c.id !== clipId);
    const newSelectedClipId = selectedClipId === clipId ? null : selectedClipId;
    
    pushState({
      clips: newClips,
      selectedClipId: newSelectedClipId,
    });
    
    addToast(showSuccessToast(TOAST_MESSAGES.CLIP_DELETED));
  };

  const handleTrimChange = (clipId: string, inPoint: number, outPoint: number) => {
    const newClips = clips.map(clip => 
      clip.id === clipId 
        ? { ...clip, inPoint, outPoint }
        : clip
    );
    
    pushState({
      clips: newClips,
      selectedClipId,
    });
  };

  // Open folder containing exported file
  const handleOpenFolder = async (filePath: string) => {
    try {
      await revealItemInDir(filePath);
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  };

  // Project management handlers
  const projectHandlers = {
    clips,
    selectedClipId,
    playheadPosition,
    pushState,
    setPlayheadPosition,
    setIsPlaying,
    addToast,
    showSuccessToast,
    showErrorToast,
    TOAST_MESSAGES,
  };

  const handleSaveProject = () => saveProject(projectHandlers);
  const handleLoadProject = () => loadProject(projectHandlers);
  const handleNewProject = () => createNewProject(projectHandlers);

  // Zoom control handlers
  const zoomHandlers = { zoomLevel, setZoomLevel: (level: number) => setZoomLevel(level) };
  const handleZoomInAction = () => handleZoomIn(zoomHandlers);
  const handleZoomOutAction = () => handleZoomOut(zoomHandlers);
  const handleZoomToFitAction = () => handleZoomToFit(zoomHandlers);

  // Audio control handlers
  const audioHandlers = {
    clips,
    selectedClipId,
    pushState,
    addToast,
    showSuccessToast,
    TOAST_MESSAGES,
  };

  const handleVolumeChangeAction = (clipId: string, volume: number) => 
    handleVolumeChange(clipId, volume, audioHandlers);
  const handleMuteToggleAction = (clipId: string, muted: boolean) => 
    handleMuteToggle(clipId, muted, audioHandlers);

  // Keyboard handler setup
  useEffect(() => {
    const keyboardHandlers = {
      handleNewProject,
      handleExport,
      undo,
      redo,
      handleSaveProject,
      handleLoadProject,
      handleZoomIn: handleZoomInAction,
      handleZoomOut: handleZoomOutAction,
      handleZoomToFit: handleZoomToFitAction,
      setShowKeyboardHelp,
      handlePlayPause,
      updatePlayheadPosition,
      playheadPosition,
      totalTimelineDuration,
      handleSetInPoint,
      handleSetOutPoint,
      handleDeleteClip,
      selectedClipId,
      addToast,
      showSuccessToast,
      TOAST_MESSAGES,
    };

    const handleKeyDown = createKeyboardHandler(keyboardHandlers);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clips, selectedClipId, totalTimelineDuration]);

  return (
    <div className={`app ${isDragging ? 'dragging' : ''}`}>
      <header>
        <h1>ClipForge</h1>
        <div className="header-controls">
          <ImportButton onImport={handleImport} />
          <UndoRedoButtons
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <ProjectMenu
            onSaveProject={handleSaveProject}
            onLoadProject={handleLoadProject}
            canSave={clips.length > 0}
          />
          <button 
            onClick={handleNewProject}
            disabled={clips.length === 0}
            className="new-project-button"
            title="New Project (Cmd+N)"
          >
            New Project
          </button>
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
          onVideoPlayStateChange={handleVideoPlayStateChange}
          clips={clips}
          onPlayheadUpdate={updatePlayheadPosition}
        />
      </div>

      {/* Controls Area */}
      <div className="controls-area">
        <AudioControls
          selectedClip={clips.find(c => c.id === selectedClipId) || null}
          onVolumeChange={handleVolumeChangeAction}
          onMuteToggle={handleMuteToggleAction}
        />
        <TrimControls
          selectedClip={clips.find(c => c.id === selectedClipId) || null}
          onTrimChange={handleTrimChange}
          onSetInPoint={handleSetInPoint}
          onSetOutPoint={handleSetOutPoint}
        />
        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomChange={(level: number) => setZoomLevel(level)}
          onZoomToFit={handleZoomToFitAction}
          totalDuration={totalTimelineDuration}
        />
        <ExportButton
          clips={clips}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </div>

      {/* Export Success Banner */}
      {exportSuccess && (
        <div className="export-success-banner">
          <div className="export-success-content">
            <span>✅ Export completed successfully!</span>
            <button 
              onClick={() => handleOpenFolder(exportSuccess)}
              className="open-folder-button"
            >
              Open Folder
            </button>
            <button 
              onClick={clearExportSuccess}
              className="close-banner-button"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Export Error Banner */}
      {exportError && (
        <div className="export-error-banner">
          <div className="export-error-content">
            <span>❌ Export failed: {exportError}</span>
            <button 
              onClick={clearExportError}
              className="close-banner-button"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Timeline Area */}
      <div className="timeline-area">
        <Timeline
          clips={clips}
          playheadPosition={playheadPosition}
          selectedClipId={selectedClipId}
          onClipSelect={handleClipSelect}
          onClipDeselect={() => updateSelectedClip(null)}
          onSeek={updatePlayheadPosition}
          onDeleteClip={handleDeleteClip}
          onTrimChange={handleTrimChange}
          zoomLevel={zoomLevel}
          onClipsReorder={handleClipsReorder}
          isPlaying={isPlaying}
          onPause={() => setIsPlaying(false)}
          isExporting={isExporting}
        />
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <KeyboardShortcutsHelp 
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)} 
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;