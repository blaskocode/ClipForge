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
import { RecordingModal } from "./components/RecordingModal";
import { MediaLibrary } from "./components/MediaLibrary";
import { ExportSettingsModal, ExportResolution } from "./components/ExportSettingsModal";
import { FillerWordsPanel } from "./components/FillerWordsPanel";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { invoke } from "@tauri-apps/api/core";
import { Toast, showSuccessToast, showErrorToast, TOAST_MESSAGES } from "./utils/toastHelpers";
import { useHistory, HistoryState } from "./hooks/useHistory";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useExport } from "./hooks/useExport";
import { usePlaybackLoop } from "./hooks/usePlaybackLoop";
import { Clip } from "./types";
import { createKeyboardHandler } from "./utils/keyboardHandler";
import { setupDragAndDrop } from "./utils/dragDrop";
import { processVideoFile } from "./utils/videoProcessing";
import { saveProject, loadProject, createNewProject } from "./utils/projectManagement";
import { handleZoomIn, handleZoomOut, handleZoomToFit } from "./utils/zoomControls";
import { handleVolumeChange, handleMuteToggle } from "./utils/audioControls";
import { findActiveClipAtTime, calculateLocalTimeInClip } from "./utils/timelineCalculations";
import { splitClipAtPlayhead } from "./utils/clipSplitting";
import { setApiKey } from "./utils/apiKeyManager";
import { FillerWord } from "./types";
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
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [libraryClips, setLibraryClips] = useState<Clip[]>([]); // Media library clips (not on timeline)
  const [showExportSettings, setShowExportSettings] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

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
        clips: [...clips, ...libraryClips], // Total clips for limit checking
        addToast,
        showSuccessToast,
        showErrorToast,
        pushState,
        selectedClipId,
        TOAST_MESSAGES,
      }),
      clips,
      libraryClips,
      onImportComplete: (newClip: Clip) => {
        setLibraryClips(prev => [...prev, newClip]);
      },
      addToast,
      showErrorToast,
      showSuccessToast,
      TOAST_MESSAGES,
    };

    const cleanup = setupDragAndDrop(dragDropHandlers);
    if (cleanup) {
      cleanup();
    }
  }, [clips, libraryClips, selectedClipId]);

  const handleImport = async (filePath: string) => {
    const newClip = await processVideoFile(filePath, {
      clips: [...clips, ...libraryClips], // Total clips for limit checking
      addToast,
      showSuccessToast,
      showErrorToast,
      pushState,
      selectedClipId,
      TOAST_MESSAGES,
    });
    
    if (newClip) {
      // Add to library instead of timeline
      setLibraryClips(prev => [...prev, newClip]);
      addToast(showSuccessToast(TOAST_MESSAGES.CLIPS_IMPORTED(1)));
    }
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

  // Add library clip to timeline
  const handleAddToTimeline = (libraryClip: Clip, track: 'main' | 'pip') => {
    // Create a new clip instance for the timeline (with unique ID)
    const timelineClip: Clip = {
      ...libraryClip,
      id: `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      track,
    };
    
    pushState({
      clips: [...clips, timelineClip],
      selectedClipId: timelineClip.id,
    });
    
    addToast(showSuccessToast(`Added "${libraryClip.filename}" to ${track === 'main' ? 'Main' : 'PiP'} track`));
  };

  // Delete clip from library
  const handleDeleteFromLibrary = (clipId: string) => {
    setLibraryClips(prev => prev.filter(clip => clip.id !== clipId));
    addToast(showSuccessToast('Clip removed from library'));
  };

  // Preview library clip in video player (without adding to timeline)
  // Note: VideoPlayer only shows timeline clips, so we can't actually preview library clips
  // This is for future enhancement - for now, just clicking doesn't do anything
  const handlePreviewLibraryClip = (clip: Clip) => {
    // Future: Could add library clips to a temporary preview state
    // For now, library clips need to be added to timeline to preview
    console.log('Preview library clip:', clip.filename);
  };

  // Calculate total timeline duration using TRIMMED durations (sum of main track only)
  const totalTimelineDuration = clips
    .filter(clip => clip.track === 'main')
    .reduce((sum, clip) => {
      const trimmedDuration = (clip.outPoint || clip.duration) - (clip.inPoint || 0);
      return sum + trimmedDuration;
    }, 0);

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

  // Helper functions for trim point setting
  const handleSetInPoint = () => {
    if (!selectedClipId) return;
    
    const selectedClip = clips.find(c => c.id === selectedClipId);
    if (!selectedClip) return;
    
    const currentPlayheadPosition = playheadPositionRef.current;
    
    // Calculate clip start time (sum of trimmed durations of clips before selected clip)
    const trackClips = clips
      .filter(c => c.track === selectedClip.track)
      .sort((a, b) => {
        const aIndex = clips.findIndex(c => c.id === a.id);
        const bIndex = clips.findIndex(c => c.id === b.id);
        return aIndex - bIndex;
      });
    
    const clipIndex = trackClips.findIndex(c => c.id === selectedClip.id);
    let clipStartTime = 0;
    for (let i = 0; i < clipIndex; i++) {
      const trimmedDuration = (trackClips[i].outPoint || trackClips[i].duration) - (trackClips[i].inPoint || 0);
      clipStartTime += trimmedDuration;
    }
    
    // Calculate local time within the timeline
    const localTimeInTimeline = currentPlayheadPosition - clipStartTime;
    
    // Calculate absolute time in clip source: localTimeInTimeline + clip's current inPoint
    const absoluteTimeInClip = localTimeInTimeline + (selectedClip.inPoint || 0);
    
    // Clamp to valid range: 0 <= inPoint < outPoint <= duration
    const MIN_DURATION = 0.033; // Frame-accurate minimum
    const newInPoint = Math.max(0, Math.min(absoluteTimeInClip, (selectedClip.outPoint || selectedClip.duration) - MIN_DURATION));
    
    handleTrimChange(selectedClip.id, newInPoint, selectedClip.outPoint || selectedClip.duration);
  };

  const handleSetOutPoint = () => {
    if (!selectedClipId) return;
    
    const selectedClip = clips.find(c => c.id === selectedClipId);
    if (!selectedClip) return;
    
    const currentPlayheadPosition = playheadPositionRef.current;
    
    // Calculate clip start time (sum of trimmed durations of clips before selected clip)
    const trackClips = clips
      .filter(c => c.track === selectedClip.track)
      .sort((a, b) => {
        const aIndex = clips.findIndex(c => c.id === a.id);
        const bIndex = clips.findIndex(c => c.id === b.id);
        return aIndex - bIndex;
      });
    
    const clipIndex = trackClips.findIndex(c => c.id === selectedClip.id);
    let clipStartTime = 0;
    for (let i = 0; i < clipIndex; i++) {
      const trimmedDuration = (trackClips[i].outPoint || trackClips[i].duration) - (trackClips[i].inPoint || 0);
      clipStartTime += trimmedDuration;
    }
    
    // Calculate local time within the timeline
    const localTimeInTimeline = currentPlayheadPosition - clipStartTime;
    
    // Calculate absolute time in clip source: localTimeInTimeline + clip's current inPoint
    const absoluteTimeInClip = localTimeInTimeline + (selectedClip.inPoint || 0);
    
    // Clamp to valid range: inPoint < outPoint <= duration
    const MIN_DURATION = 0.033; // Frame-accurate minimum
    const newOutPoint = Math.min(selectedClip.duration, Math.max(absoluteTimeInClip, (selectedClip.inPoint || 0) + MIN_DURATION));
    
    handleTrimChange(selectedClip.id, selectedClip.inPoint || 0, newOutPoint);
    setIsPlaying(false); // Stop playback when Out Point is set
  };

  // Handle clip splitting at playhead
  const handleSplitClip = () => {
    const currentPlayheadPosition = playheadPositionRef.current;
    
    // Try to split on main track first, fallback to pip track
    const result = splitClipAtPlayhead(currentPlayheadPosition, clips, 'main');
    
    if (result) {
      pushState({
        clips: result.newClips,
        selectedClipId: result.selectedClipId,
      });
      
      addToast(showSuccessToast(TOAST_MESSAGES.CLIP_SPLIT || 'Clip split successfully'));
    } else {
      // No clip at playhead or invalid split position
      const activeMainClip = findActiveClipAtTime('main', currentPlayheadPosition, clips);
      const activePipClip = findActiveClipAtTime('pip', currentPlayheadPosition, clips);
      
      if (!activeMainClip && !activePipClip) {
        addToast(showErrorToast('No clip at playhead position'));
      } else {
        // Clip exists but split point is invalid (at edge)
        addToast(showErrorToast('Cannot split clip at this position. Move playhead to the middle of a clip.'));
      }
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

  // Handle recording completion
  const handleRecordingComplete = async (
    startTime: number,
    duration: number,
    screenFile?: string,
    webcamFile?: string
  ) => {
    console.log('handleRecordingComplete called:', { startTime, duration, screenFile, webcamFile });
    
    try {
      const newClips: Clip[] = [];
      
      // Add screen recording to main track
      if (screenFile) {
        console.log('Getting metadata for screen recording:', screenFile);
        try {
          // Try to get metadata, but use recording duration as fallback
          let width = 1920; // Default fallback
          let height = 1080; // Default fallback
          let codec = 'vp9'; // MediaRecorder uses VP9 for WebM
          let fileSize: number | undefined = undefined;
          
          try {
            const metadata = await invoke<{
              duration: number;
              width: number;
              height: number;
              codec: string;
              file_size: number;
            }>('get_video_metadata', { filePath: screenFile });
            
            console.log('Screen recording metadata:', metadata);
            
            // Use metadata if available, otherwise use defaults
            width = metadata.width || width;
            height = metadata.height || height;
            codec = metadata.codec || codec;
            fileSize = metadata.file_size;
          } catch (error) {
            console.warn('Could not get full metadata for screen recording, using defaults and calculated duration:', error);
            // Continue with calculated duration and defaults
          }
          
          newClips.push({
            id: crypto.randomUUID(),
            path: screenFile,
            filename: `Screen Recording ${new Date(startTime).toLocaleTimeString()}`,
            duration: duration, // Use calculated duration from recording
            width: width,
            height: height,
            codec: codec,
            inPoint: 0,
            outPoint: duration,
            volume: 100,
            muted: false,
            track: 'main',
            fileSize: fileSize,
          });
        } catch (error) {
          console.error('Failed to create clip for screen recording:', error);
          addToast(showErrorToast(`Failed to process screen recording: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
      
      // Add webcam recording to PiP track
      if (webcamFile) {
        console.log('Getting metadata for webcam recording:', webcamFile);
        try {
          // Try to get metadata, but use recording duration as fallback
          let width = 1280; // Default fallback
          let height = 720; // Default fallback
          let codec = 'vp9'; // MediaRecorder uses VP9 for WebM
          let fileSize: number | undefined = undefined;
          
          try {
            const metadata = await invoke<{
              duration: number;
              width: number;
              height: number;
              codec: string;
              file_size: number;
            }>('get_video_metadata', { filePath: webcamFile });
            
            console.log('Webcam recording metadata:', metadata);
            
            // Use metadata if available, otherwise use defaults
            width = metadata.width || width;
            height = metadata.height || height;
            codec = metadata.codec || codec;
            fileSize = metadata.file_size;
          } catch (error) {
            console.warn('Could not get full metadata for webcam recording, using defaults and calculated duration:', error);
            // Continue with calculated duration and defaults
          }
          
          newClips.push({
            id: crypto.randomUUID(),
            path: webcamFile,
            filename: `Webcam Recording ${new Date(startTime).toLocaleTimeString()}`,
            fileSize: fileSize,
            duration: duration, // Use calculated duration from recording
            width: width,
            height: height,
            codec: codec,
            inPoint: 0,
            outPoint: duration,
            volume: 100,
            muted: false,
            track: 'pip'
          });
        } catch (error) {
          console.error('Failed to create clip for webcam recording:', error);
          addToast(showErrorToast(`Failed to process webcam recording: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
      
      if (newClips.length > 0) {
        console.log('Adding clips to timeline:', newClips);
        pushState({
          clips: [...clips, ...newClips],
          selectedClipId: newClips[0]?.id || null
        });
        
        addToast(showSuccessToast(`Recording${newClips.length > 1 ? 's' : ''} added to timeline`));
        setShowRecordingModal(false);
      } else {
        console.warn('No clips to add - both clip creations may have failed');
        addToast(showErrorToast('Recording saved but could not be added to timeline'));
      }
    } catch (error) {
      console.error('Failed to finalize recording:', error);
      addToast(showErrorToast(`Failed to add recording to timeline: ${error instanceof Error ? error.message : 'Unknown error'}`));
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

  // Handle filler word detection
  const handleDetectFillerWords = (clipId: string, fillerWords: FillerWord[]) => {
    pushState({
      clips: clips.map(clip => 
        clip.id === clipId 
          ? { 
              ...clip, 
              fillerWords, 
              fillerDetectionStatus: 'complete' as const 
            }
          : clip
      ),
      selectedClipId,
    });
    
    addToast(showSuccessToast(
      fillerWords.length > 0 
        ? `Detected ${fillerWords.length} filler word${fillerWords.length !== 1 ? 's' : ''}`
        : 'No filler words detected'
    ));
  };

  // Keyboard handler setup
  useEffect(() => {
    const keyboardHandlers = {
      handleNewProject,
      handleOpenExportSettings: () => setShowExportSettings(true),
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
      handleSplitClip,
      handleDeleteClip,
      selectedClipId,
      addToast,
      showSuccessToast,
      TOAST_MESSAGES,
      handleOpenRecordingModal: () => setShowRecordingModal(true),
      handleCloseRecordingModal: () => setShowRecordingModal(false),
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
          <button
            onClick={() => setShowRecordingModal(true)}
            className="record-button"
            title="Start Recording (Cmd+R)"
          >
            ⏺ Record
          </button>
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

      {/* Media Library Panel */}
      <div className="media-library-area" style={{ gridArea: 'library' }}>
        <MediaLibrary
          libraryClips={libraryClips}
          onAddToTimeline={handleAddToTimeline}
          onDelete={handleDeleteFromLibrary}
          onSelect={handlePreviewLibraryClip}
        />
      </div>

      {/* Video Player Area */}
      <div className="video-player-area">
        {isDragging && <div className="drag-overlay">Drop videos here to import</div>}
        <VideoPlayer 
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
        <FillerWordsPanel
          selectedClip={clips.find(c => c.id === selectedClipId) || null}
          onSeek={updatePlayheadPosition}
          onDetect={handleDetectFillerWords}
          onApiKeyRequired={() => setShowApiKeyModal(true)}
        />
        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomChange={(level: number) => setZoomLevel(level)}
          onZoomToFit={handleZoomToFitAction}
          totalDuration={totalTimelineDuration}
        />
        <ExportButton
          clips={clips}
          onExportClick={() => setShowExportSettings(true)}
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
          onLibraryClipDrop={(clipId, track) => {
            const libraryClip = libraryClips.find(c => c.id === clipId);
            if (libraryClip) {
              handleAddToTimeline(libraryClip, track);
            }
          }}
        />
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <KeyboardShortcutsHelp 
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)} 
        />
      )}

      {/* Recording Modal */}
      <RecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        onRecordingComplete={handleRecordingComplete}
      />

      {/* Export Settings Modal */}
      <ExportSettingsModal
        isOpen={showExportSettings}
        onClose={() => setShowExportSettings(false)}
        onExport={async (_resolution: ExportResolution, width: number, height: number) => {
          await handleExport(width, height);
        }}
        clips={clips}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={(apiKey) => {
          setApiKey(apiKey);
          addToast(showSuccessToast('API key saved'));
        }}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;