import React, { useRef, useState } from 'react';
import { ClipThumbnails } from './ClipThumbnails';

const PIXELS_PER_SECOND = 50; // Base pixels per second (100% zoom)

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
  volume: number;
  muted: boolean;
}

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
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Trim dragging state
  const [isDraggingTrim, setIsDraggingTrim] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [draggingTrim, setDraggingTrim] = useState<'in' | 'out' | null>(null);

  // Calculate pixels per second based on zoom level
  const pixelsPerSecond = PIXELS_PER_SECOND * zoomLevel;

  // Calculate total timeline width
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);

  // Handle timeline click for scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    // Ensure clickX is not negative (can happen with scrolling)
    const adjustedClickX = Math.max(0, clickX);
    
    // Calculate time position
    const timePosition = adjustedClickX / pixelsPerSecond;
    
    // Calculate maximum allowed position
    // Use a minimum of 60 seconds or the total duration, whichever is greater
    const maxDuration = Math.max(totalDuration, 60);
    
    // Clamp the time position between 0 and maxDuration
    const clampedTimePosition = Math.min(Math.max(0, timePosition), maxDuration);
    
    // Clicking on empty timeline space deselects clip and seeks
    console.log(`Timeline clicked: x=${clickX}, time=${timePosition}, clamped=${clampedTimePosition}`);
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

  // Add global mouse event listeners for dragging
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

  // Generate time markers for ruler
  const generateTimeMarkers = () => {
    const markers = [];
    const maxTime = Math.max(totalDuration, 60); // At least show 60 seconds
    const interval = 5; // Mark every 5 seconds
    
    for (let i = 0; i <= maxTime; i += interval) {
      markers.push(i);
    }
    
    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  return (
    <div className="timeline-container">
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

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="timeline"
        onClick={handleTimelineClick}
      >
        {/* Render Clips */}
        {clips.length === 0 ? (
          <div className="timeline-empty-state">
            No clips on timeline. Import videos to get started.
          </div>
        ) : (
          clips.map((clip, idx) => {
            // Calculate clip start position
            const startPosition = clips
              .slice(0, idx)
              .reduce((sum, c) => sum + c.duration, 0);
            
            const clipWidth = clip.duration * pixelsPerSecond;
            const clipStartX = startPosition * pixelsPerSecond;
            
            // Calculate trim overlay positions
            const inPointPixels = ((clip.inPoint || 0) / clip.duration) * clipWidth;
            const outPointPixels = ((clip.outPoint || clip.duration) / clip.duration) * clipWidth;
            const trimmedStartWidth = inPointPixels;
            const trimmedEndWidth = clipWidth - outPointPixels;
            
            return (
              <div
                key={clip.id}
                className={`clip ${selectedClipId === clip.id ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClipSelect(clip.id);
                }}
                style={{
                  left: `${clipStartX}px`,
                  width: `${clipWidth}px`,
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
          })
        )}

        {/* Playhead */}
        {clips.length > 0 && (
          <div
            className="playhead"
            style={{
              left: `${playheadPosition * pixelsPerSecond}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}


