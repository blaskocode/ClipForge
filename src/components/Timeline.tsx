import React, { useRef, useState } from 'react';
import { ClipThumbnails } from './ClipThumbnails';
import { reorderClips, canReorderClips, calculateDropIndex, calculateDropIndicatorPosition, createDragImage, cleanupDragImage, calculateSnapZones, findNearestSnapZone, SnapZone } from '../utils/clipDragDrop';
import { Clip } from '../types';

const PIXELS_PER_SECOND = 50;

interface TimelineProps {
  clips: Clip[];
  playheadPosition: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string) => void;
  onClipDeselect: () => void;
  onSeek: (time: number) => void;
  onDeleteClip: (clipId: string) => void;
  onTrimChange: (clipId: string, inPoint: number, outPoint: number) => void;
  zoomLevel: number;
  onClipsReorder: (newClips: Clip[]) => void;
  isPlaying: boolean;
  onPause: () => void;
  isExporting: boolean;
  onLibraryClipDrop?: (clipId: string, track: 'main' | 'pip') => void;
}

export function Timeline({
  clips,
  playheadPosition,
  selectedClipId,
  onClipSelect,
  onClipDeselect,
  onSeek,
  onDeleteClip,
  onTrimChange,
  zoomLevel,
  onClipsReorder,
  isPlaying,
  onPause,
  isExporting,
  onLibraryClipDrop,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [isDraggingTrim, setIsDraggingTrim] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [draggingTrim, setDraggingTrim] = useState<'in' | 'out' | null>(null);

  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [snapZones, setSnapZones] = useState<SnapZone[]>([]);
  const [activeSnapZone, setActiveSnapZone] = useState<SnapZone | null>(null);

  const pixelsPerSecond = PIXELS_PER_SECOND * zoomLevel;

  // Separate clips by track
  const mainTrackClips = clips.filter(clip => clip.track === 'main');
  const pipTrackClips = clips.filter(clip => clip.track === 'pip');
  
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
  
  // Calculate drop indicator position based on current drop index
  const calculateDropIndicator = () => {
    if (!draggedClipId || dropIndicatorIndex === null) return null;
    
    const draggedClip = clips.find(c => c.id === draggedClipId);
    if (!draggedClip) return null;
    
    const targetTrackClips = clips.filter(clip => clip.track === draggedClip.track);
    const clipsWithoutDragged = targetTrackClips.filter(clip => clip.id !== draggedClipId);
    
    if (clipsWithoutDragged.length === 0) {
      // Only one clip, show indicator at beginning
      return { position: 0, type: 'beginning' };
    }
    
    // Calculate position based on drop index
    let cumulativeTime = 0;
    
    if (dropIndicatorIndex === 0) {
      return { position: 0, type: 'beginning' };
    }
    
    // Find the position after the clip at dropIndex - 1
    for (let i = 0; i < dropIndicatorIndex && i < clipsWithoutDragged.length; i++) {
      cumulativeTime += clipsWithoutDragged[i].duration;
    }
    
    return { position: cumulativeTime * pixelsPerSecond, type: 'between' };
  };

  const dropIndicator = calculateDropIndicator();

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if click is on a track row (not on track labels)
    const target = e.target as HTMLElement;
    if (target.closest('.track-label') || target.closest('.time-offset')) {
      return; // Don't handle clicks on track labels
    }
    
    // Don't handle clicks on clips
    if (target.closest('.timeline-clip')) {
      return;
    }
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left;
    
    // Adjust for 80px track label offset
    const adjustedClickX = Math.max(0, clickX - 80);
    
    const timePosition = adjustedClickX / pixelsPerSecond;
    
    const maxDuration = Math.max(totalDuration, 60);
    
    const clampedTimePosition = Math.min(Math.max(0, timePosition), maxDuration);
    
    onClipDeselect();
    onSeek(clampedTimePosition);
  };

  // Handle clip deletion with custom confirmation dialog
  const handleDeleteClick = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clip selection
    
    // Create a custom confirmation dialog
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #333;
      border: 1px solid #555;
      border-radius: 5px;
      padding: 20px;
      z-index: 1000;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      text-align: center;
    `;
    
    // Add message
    const message = document.createElement('p');
    message.textContent = 'Delete this clip from timeline?';
    message.style.marginBottom = '20px';
    confirmDialog.appendChild(message);
    
    // Add buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'center';
    buttonsContainer.style.gap = '10px';
    
    // Add confirm button
    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Delete';
    confirmButton.style.cssText = `
      padding: 8px 16px;
      background: #d9534f;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    confirmButton.onclick = () => {
      document.body.removeChild(overlay);
      document.body.removeChild(confirmDialog);
      onDeleteClip(clipId);
    };
    
    // Add cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 8px 16px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
      document.body.removeChild(confirmDialog);
    };
    
    // Add buttons to container
    buttonsContainer.appendChild(confirmButton);
    buttonsContainer.appendChild(cancelButton);
    confirmDialog.appendChild(buttonsContainer);
    
    // Add overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 999;
    `;
    overlay.onclick = () => {
      document.body.removeChild(overlay);
      document.body.removeChild(confirmDialog);
    };
    
    // Add to document
    document.body.appendChild(overlay);
    document.body.appendChild(confirmDialog);
  };

  // Trim handle dragging handlers
  const handleTrimHandleMouseDown = (e: React.MouseEvent, clipId: string, trimType: 'in' | 'out') => {
    e.stopPropagation();
    e.preventDefault(); // Prevent clip drag from starting
    setIsDraggingTrim(true);
    setDragStartX(e.clientX);
    setDraggingTrim(trimType);
    
    const clip = clips.find(c => c.id === clipId);
    if (clip) {
      const startTime = trimType === 'in' ? (clip.inPoint || 0) : (clip.outPoint || clip.duration);
      setDragStartTime(startTime);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingTrim || !draggingTrim || !timelineRef.current) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / pixelsPerSecond;
    const newTime = dragStartTime + deltaTime;
    
    // Find the selected clip
    const selectedClip = clips.find(c => c.id === selectedClipId);
    if (!selectedClip) return;
    
    // Clamp the new time to valid ranges
    let clampedTime = Math.max(0, Math.min(newTime, selectedClip.duration));
    
    // Snap to frame boundaries (0.033s for 30fps)
    const FRAME_DURATION = 0.033;
    clampedTime = Math.round(clampedTime / FRAME_DURATION) * FRAME_DURATION;
    
    // Ensure minimum duration between in and out points
    const MIN_DURATION = 0.033;
    if (draggingTrim === 'in') {
      clampedTime = Math.min(clampedTime, selectedClip.outPoint - MIN_DURATION);
    } else {
      clampedTime = Math.max(clampedTime, selectedClip.inPoint + MIN_DURATION);
    }
    
    // Update the trim point
    if (draggingTrim === 'in') {
      onTrimChange(selectedClip.id, clampedTime, selectedClip.outPoint);
    } else {
      onTrimChange(selectedClip.id, selectedClip.inPoint, clampedTime);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingTrim(false);
    setDraggingTrim(null);
  };

  // Clip drag-and-drop handlers
  const handleClipDragStart = (e: React.DragEvent, clipId: string) => {
    if (isExporting) {
      e.preventDefault();
      return;
    }
    
    if (isPlaying) {
      onPause();
    }
    
    setDraggedClipId(clipId);
    
    // Calculate snap zones for all clips (for cross-track snapping)
    const zones = calculateSnapZones(clips, clipId, pixelsPerSecond);
    setSnapZones(zones);
    
    const draggedClip = clips.find(c => c.id === clipId);
    if (!draggedClip) return;
    
    const dragImage = createDragImage(draggedClip.filename || 'Clip');
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    setTimeout(() => cleanupDragImage(dragImage), 0);
    e.currentTarget.classList.add('dragging');
  };

  const handleTrackDragOver = (e: React.DragEvent, trackType: 'main' | 'pip') => {
    e.preventDefault();
    
    if (!draggedClipId) return;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    
    // Get clips for the target track
    const targetTrackClips = clips.filter(clip => clip.track === trackType);
    
    // Calculate drop index within the target track
    let dropIndex;
    try {
      dropIndex = calculateDropIndex(targetTrackClips, draggedClipId, mouseX - 80, pixelsPerSecond);
    } catch (error) {
      dropIndex = null;
    }
    
    setDropIndicatorIndex(dropIndex);
    
    // Find nearest snap zone
    const nearestSnapZone = findNearestSnapZone(mouseX - 80, snapZones, 20);
    if (nearestSnapZone) {
      setActiveSnapZone(nearestSnapZone);
    } else {
      setActiveSnapZone(null);
    }
  };

  const handleClipDrop = (e: React.DragEvent, targetTrack: 'main' | 'pip') => {
    e.preventDefault();
    
    // Check if this is a library clip drop
    try {
      const dragData = e.dataTransfer.getData('text/plain');
      if (dragData) {
        const parsed = JSON.parse(dragData);
        if (parsed.source === 'library' && parsed.clipId) {
          // Library clip drop - delegate to parent
          if (onLibraryClipDrop) {
            onLibraryClipDrop(parsed.clipId, targetTrack);
          }
          return;
        }
      }
    } catch (err) {
      // Not a library clip drop, continue with normal handling
    }
    
    if (!draggedClipId) return;
    
    const draggedClip = clips.find(c => c.id === draggedClipId);
    if (!draggedClip) return;
    
    // Check if we're moving between tracks
    if (draggedClip.track !== targetTrack) {
      // Move between tracks - create new clip with updated track
      const updatedClip = {
        ...draggedClip,
        track: targetTrack,
        // Add default PIP settings if moving to PIP track
        ...(targetTrack === 'pip' && !draggedClip.pipSettings ? {
          pipSettings: {
            x: 0.75,
            y: 0.75,
            width: 0.25,
            height: 0.25,
            opacity: 1.0
          }
        } : {}),
        // Remove PIP settings if moving to main track
        ...(targetTrack === 'main' ? { pipSettings: undefined } : {})
      };
      
      // Update the clip in the clips array
      const newClips = clips.map(clip => 
        clip.id === draggedClipId ? updatedClip : clip
      );
      
      onClipsReorder(newClips);
    } else {
      // Reorder within same track
      const targetTrackClips = clips.filter(clip => clip.track === targetTrack);
      
      if (dropIndicatorIndex !== null && canReorderClips(targetTrackClips, draggedClipId, dropIndicatorIndex)) {
        // Reorder within the same track
        const reorderedTrackClips = reorderClips(targetTrackClips, draggedClipId, dropIndicatorIndex);
        
        // For same-track reordering, replace the target track clips with reordered ones
        const allClips = clips.filter(clip => clip.track !== targetTrack).concat(reorderedTrackClips);
        
        onClipsReorder(allClips);
      } else {
      }
    }
    
    handleClipDragEnd();
  };

  const handleClipDragEnd = () => {
    setDraggedClipId(null);
    setDropIndicatorIndex(null);
    setSnapZones([]);
    setActiveSnapZone(null);
    
    document.querySelectorAll('.timeline-clip').forEach(el => {
      el.classList.remove('dragging');
    });
  };

  React.useEffect(() => {
    if (isDraggingTrim) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingTrim, draggingTrim, dragStartX, dragStartTime, pixelsPerSecond, clips, selectedClipId, onTrimChange]);

  const generateTimeMarkers = () => {
    const markers = [];
    const maxTime = Math.max(totalDuration, 60);
    const interval = 5;
    
    for (let i = 0; i <= maxTime; i += interval) {
      markers.push(i);
    }
    
    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  // Helper function to render clips for a specific track
  const renderTrackClips = (trackClips: Clip[]) => {
    return trackClips.map((clip, idx) => {
      // Calculate clip start position within the track (using trimmed durations)
      const startPosition = trackClips
        .slice(0, idx)
        .reduce((sum, c) => sum + ((c.outPoint || c.duration) - (c.inPoint || 0)), 0);
      
      // Calculate trimmed duration (what actually plays)
      const trimmedDuration = (clip.outPoint || clip.duration) - (clip.inPoint || 0);
      const clipWidth = trimmedDuration * pixelsPerSecond;
      const clipStartX = startPosition * pixelsPerSecond;
      
      // Calculate trim overlay positions (relative to full clip duration)
      const fullClipWidth = clip.duration * pixelsPerSecond;
      const inPointPixels = ((clip.inPoint || 0) / clip.duration) * fullClipWidth;
      const outPointPixels = ((clip.outPoint || clip.duration) / clip.duration) * fullClipWidth;
      const trimmedStartWidth = inPointPixels;
      const trimmedEndWidth = clipWidth - outPointPixels;
      
      return (
        <div
          key={clip.id}
          draggable={!isExporting && clips.length > 1}
          onDragStart={(e) => handleClipDragStart(e, clip.id)}
          onDragEnd={handleClipDragEnd}
          className={`timeline-clip ${selectedClipId === clip.id ? 'selected' : ''} ${draggedClipId === clip.id ? 'dragging' : ''}`}
          data-track={clip.track}
          onClick={(e) => {
            e.stopPropagation();
            onClipSelect(clip.id);
          }}
          style={{
            left: `${clipStartX}px`,
            width: `${clipWidth}px`,
            cursor: isExporting ? 'not-allowed' : 'grab',
            transition: draggedClipId ? 'none' : 'left 0.2s ease',
          }}
        >
          <span className="clip-name">{clip.filename}</span>
          <button
            className="clip-delete-button"
            onClick={(e) => handleDeleteClick(clip.id, e)}
            title="Delete clip"
          >
            ×
          </button>
          
          {/* Trim overlay - before in-point */}
          {(clip.inPoint || 0) > 0 && (
            <div
              className="trim-overlay"
              style={{
                left: 0,
                width: `${trimmedStartWidth}px`,
              }}
            />
          )}
          
          {/* Trim overlay - after out-point */}
          {(clip.outPoint || clip.duration) < clip.duration && (
            <div
              className="trim-overlay"
              style={{
                left: `${outPointPixels}px`,
                width: `${trimmedEndWidth}px`,
              }}
            />
          )}
          
          {/* In-point trim handle */}
          {(clip.inPoint || 0) > 0 && (
            <div
              className="trim-handle in-point"
              style={{
                left: `${inPointPixels}px`,
              }}
              title={`In Point: ${(clip.inPoint || 0).toFixed(2)}s`}
            />
          )}
          
          {/* Out-point trim handle */}
          {(clip.outPoint || clip.duration) < clip.duration && (
            <div
              className="trim-handle out-point"
              style={{
                left: `${outPointPixels}px`,
              }}
              title={`Out Point: ${(clip.outPoint || clip.duration).toFixed(2)}s`}
            />
          )}
          
          {/* Draggable Trim Handles */}
          {selectedClipId === clip.id && (
            <>
              {/* In Point Handle */}
              <div
                className="trim-handle trim-handle-in"
                style={{
                  left: `${inPointPixels}px`,
                }}
                onMouseDown={(e) => handleTrimHandleMouseDown(e, clip.id, 'in')}
                title={`In Point: ${(clip.inPoint || 0).toFixed(2)}s`}
              />
              
              {/* Out Point Handle */}
              <div
                className="trim-handle trim-handle-out"
                style={{
                  left: `${outPointPixels}px`,
                }}
                onMouseDown={(e) => handleTrimHandleMouseDown(e, clip.id, 'out')}
                title={`Out Point: ${(clip.outPoint || clip.duration).toFixed(2)}s`}
              />
            </>
          )}
          
          {/* Clip Thumbnails */}
          <ClipThumbnails clip={clip} thumbnailCount={3} />
        </div>
      );
    });
  };

  return (
    <div 
      ref={timelineRef}
      className="timeline-container"
      onDragOver={(e) => {
        e.preventDefault();
      }}
    >
      {/* Track Labels */}
      <div className="track-label pip-label">PIP</div>
      <div className="track-label main-label">Main</div>
      
      {/* Time Offset */}
      <div className="time-offset"></div>
      
      {/* PIP Track */}
      <div 
        className="track-row pip-track"
        onClick={handleTimelineClick}
        onDrop={(e) => handleClipDrop(e, 'pip')}
        onDragOver={(e) => handleTrackDragOver(e, 'pip')}
      >
        {pipTrackClips.length === 0 ? (
          <div className="timeline-empty-state">
            Drag clips here for Picture-in-Picture
          </div>
        ) : (
          renderTrackClips(pipTrackClips)
        )}
      </div>
      
      {/* Main Track */}
      <div 
        className="track-row main-track"
        onClick={handleTimelineClick}
        onDrop={(e) => handleClipDrop(e, 'main')}
        onDragOver={(e) => handleTrackDragOver(e, 'main')}
      >
        {mainTrackClips.length === 0 ? (
          <div className="timeline-empty-state">
            Import videos to get started
          </div>
        ) : (
          renderTrackClips(mainTrackClips)
        )}
      </div>
      
      {/* Time Ruler */}
      <div className="time-ruler">
        {timeMarkers.map((time) => (
          <div
            key={time}
            className="time-marker"
            style={{ left: `${time * pixelsPerSecond}px` }}
          >
            <span className="time-label">{time}s</span>
            <div className="marker-line" />
          </div>
        ))}
      </div>

      {/* Drop Indicators */}
      {dropIndicatorIndex !== null && draggedClipId && (() => {
        const draggedClip = clips.find(c => c.id === draggedClipId);
        if (!draggedClip) return null;
        
        // Calculate position based on the target track clips
        const targetTrackClips = clips.filter(clip => clip.track === draggedClip.track);
        const position = calculateDropIndicatorPosition(targetTrackClips, dropIndicatorIndex, draggedClipId, pixelsPerSecond);
        
        return (
          <div
            className="timeline-drop-indicator"
            style={{
              position: 'absolute',
              left: `${position + 80}px`,
              width: '3px',
              background: activeSnapZone ? '#4CAF50' : '#4CAF50',
              height: '200px',
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: activeSnapZone ? '0 0 12px rgba(76, 175, 80, 1)' : '0 0 8px rgba(76, 175, 80, 0.6)',
            }}
          />
        );
      })()}

      {/* Drop indicator - single line showing where clip will be inserted */}
      {draggedClipId && dropIndicator && (
        <div
          className="drop-indicator"
          style={{
            position: 'absolute',
            left: `${dropIndicator.position + 80}px`,
            width: '3px',
            height: '200px',
            background: '#00BFFF',
            pointerEvents: 'none',
            zIndex: 15,
            boxShadow: '0 0 8px rgba(0, 191, 255, 0.8)',
            animation: 'drop-pulse 0.8s ease-in-out infinite',
          }}
        />
      )}

      {/* Snap zone indicators */}
      {activeSnapZone && draggedClipId && (
        <div
          className="snap-zone-indicator"
          style={{
            position: 'absolute',
            left: `${activeSnapZone.position + 80}px`,
            width: '2px',
            background: '#FFD700',
            height: '200px',
            pointerEvents: 'none',
            zIndex: 15,
            boxShadow: '0 0 8px rgba(255, 215, 0, 0.8)',
            animation: 'snap-pulse 0.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Playhead */}
      {clips.length > 0 && (
        <div
          className="playhead"
          style={{
            left: `${playheadPosition * pixelsPerSecond + 80}px`,
          }}
        />
      )}
    </div>
  );
}


