import { useRef, useState } from 'react';

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

interface TimelineProps {
  clips: Clip[];
  playheadPosition: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string) => void;
  onClipDeselect: () => void;
  onSeek: (time: number) => void;
  onDeleteClip: (clipId: string) => void;
  onTrimChange: (clipId: string, inPoint: number, outPoint: number) => void;
}

const PIXELS_PER_SECOND = 50;

export function Timeline({
  clips,
  playheadPosition,
  selectedClipId,
  onClipSelect,
  onClipDeselect,
  onSeek,
  onDeleteClip,
  onTrimChange,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // State for dragging trim handles
  const [draggingTrim, setDraggingTrim] = useState<{
    clipId: string;
    handle: 'in' | 'out';
    clipStartX: number;
    clipWidth: number;
  } | null>(null);

  // Calculate total timeline duration
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);

  // Handle timeline click for scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    // Ensure clickX is not negative (can happen with scrolling)
    const adjustedClickX = Math.max(0, clickX);
    
    // Calculate time position
    const timePosition = adjustedClickX / PIXELS_PER_SECOND;
    
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

  // Handle trim handle mouse down
  const handleTrimHandleMouseDown = (
    e: React.MouseEvent,
    clipId: string,
    handle: 'in' | 'out',
    clipStartX: number,
    clipWidth: number
  ) => {
    e.stopPropagation();
    setDraggingTrim({ clipId, handle, clipStartX, clipWidth });
  };

  // Handle mouse move for trim dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTrim || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Calculate position relative to clip start
    const relativeX = mouseX - draggingTrim.clipStartX;
    const relativeTime = relativeX / PIXELS_PER_SECOND;
    
    // Find the clip being trimmed
    const clip = clips.find(c => c.id === draggingTrim.clipId);
    if (!clip) return;

    // Clamp to valid range
    const clampedTime = Math.max(0, Math.min(clip.duration, relativeTime));
    
    if (draggingTrim.handle === 'in') {
      // Don't allow in-point to go past out-point (leave minimum 0.033s)
      const maxInPoint = clip.outPoint - 0.033;
      const newInPoint = Math.min(clampedTime, maxInPoint);
      onTrimChange(clip.id, newInPoint, clip.outPoint);
    } else {
      // Don't allow out-point to go before in-point (leave minimum 0.033s)
      const minOutPoint = clip.inPoint + 0.033;
      const newOutPoint = Math.max(clampedTime, minOutPoint);
      onTrimChange(clip.id, clip.inPoint, newOutPoint);
    }
  };

  // Handle mouse up for trim dragging
  const handleMouseUp = () => {
    setDraggingTrim(null);
  };

  return (
    <div className="timeline-container">
      {/* Time Ruler */}
      <div className="time-ruler">
        {timeMarkers.map((time) => (
          <div
            key={time}
            className="time-marker"
            style={{ left: `${time * PIXELS_PER_SECOND}px` }}
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
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            
            const clipWidth = clip.duration * PIXELS_PER_SECOND;
            const clipStartX = startPosition * PIXELS_PER_SECOND;
            
            // Calculate trim overlay positions
            const inPointPixels = (clip.inPoint / clip.duration) * clipWidth;
            const outPointPixels = (clip.outPoint / clip.duration) * clipWidth;
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
                {clip.inPoint > 0 && (
                  <div
                    className="trim-overlay"
                    style={{
                      left: 0,
                      width: `${trimmedStartWidth}px`,
                    }}
                  />
                )}
                
                {/* Trim overlay - after out-point */}
                {clip.outPoint < clip.duration && (
                  <div
                    className="trim-overlay"
                    style={{
                      left: `${outPointPixels}px`,
                      width: `${trimmedEndWidth}px`,
                    }}
                  />
                )}
                
                {/* In-point trim handle */}
                {clip.inPoint > 0 && (
                  <div
                    className="trim-handle in-point"
                    style={{
                      left: `${inPointPixels}px`,
                    }}
                    onMouseDown={(e) => handleTrimHandleMouseDown(e, clip.id, 'in', clipStartX, clipWidth)}
                    title={`In Point: ${clip.inPoint.toFixed(2)}s`}
                  />
                )}
                
                {/* Out-point trim handle */}
                {clip.outPoint < clip.duration && (
                  <div
                    className="trim-handle out-point"
                    style={{
                      left: `${outPointPixels}px`,
                    }}
                    onMouseDown={(e) => handleTrimHandleMouseDown(e, clip.id, 'out', clipStartX, clipWidth)}
                    title={`Out Point: ${clip.outPoint.toFixed(2)}s`}
                  />
                )}
              </div>
            );
          })
        )}

        {/* Playhead */}
        {clips.length > 0 && (
          <div
            className="playhead"
            style={{
              left: `${playheadPosition * PIXELS_PER_SECOND}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}


