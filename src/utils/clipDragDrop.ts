// Clip Drag-and-Drop Reordering Utilities
// Handles reordering logic for timeline clips with edge case validation

import { Clip } from '../types';

/**
 * Reorder clips array by moving a dragged clip to a new position
 * 
 * @param clips - Current clips array
 * @param draggedId - ID of the clip being dragged
 * @param dropIndex - Target index where clip should be inserted
 * @returns New clips array with updated order
 */
export function reorderClips(clips: Clip[], draggedId: string, dropIndex: number): Clip[] {
  const draggedClip = clips.find(c => c.id === draggedId);
  const draggedIndex = clips.findIndex(c => c.id === draggedId);
  
  if (!draggedClip || draggedIndex === -1) {
    return clips;
  }
  
  // Remove dragged clip from array
  const newClips = clips.filter(c => c.id !== draggedId);
  
  // Insert at new position
  newClips.splice(dropIndex, 0, draggedClip);
  
  return newClips;
}

/**
 * Validate if a reorder operation should proceed
 * Prevents no-op drags and validates indices
 * 
 * @param clips - Current clips array
 * @param draggedId - ID of the clip being dragged
 * @param dropIndex - Target index where clip should be inserted
 * @returns true if reorder should proceed, false otherwise
 */
export function canReorderClips(clips: Clip[], draggedId: string, dropIndex: number): boolean {
  // Find current position of dragged clip
  const currentIndex = clips.findIndex(c => c.id === draggedId);
  
  // Clip not found
  if (currentIndex === -1) {
    return false;
  }
  
  // Prevent no-op drags
  // Same position = no change
  if (currentIndex === dropIndex) {
    return false;
  }
  
  // Validate drop index bounds
  if (dropIndex < 0 || dropIndex > clips.length) {
    return false;
  }
  
  // Single clip can't be reordered
  if (clips.length <= 1) {
    return false;
  }
  
  return true;
}

/**
 * Calculate the drop index based on mouse position over the timeline
 * Determines where the clip should be inserted
 * 
 * @param clips - Current clips array
 * @param draggedClipId - ID of the clip being dragged
 * @param mouseX - Mouse X position relative to timeline
 * @param pixelsPerSecond - Timeline scale factor
 * @returns Index where clip should be inserted
 */
export function calculateDropIndex(
  clips: Clip[],
  draggedClipId: string,
  mouseX: number,
  pixelsPerSecond: number
): number {
  if (clips.length === 0) {
    return 0;
  }
  
  const draggedClipIndex = clips.findIndex(clip => clip.id === draggedClipId);
  
  if (draggedClipIndex === -1) {
    return clips.length; // Clip not found, drop at end
  }
  
  // Create a temporary array without the dragged clip for positioning calculations
  const clipsWithoutDragged = clips.filter(clip => clip.id !== draggedClipId);
  
  // Calculate cumulative positions for insertion points
  let cumulativeTime = 0;
  
  // Check if we should insert at the beginning
  if (mouseX < 20) { // 20px threshold for "beginning" insertion
    return 0;
  }
  
  // Check insertion points between clips
  for (let i = 0; i < clipsWithoutDragged.length; i++) {
    const clip = clipsWithoutDragged[i];
    const clipEndTime = cumulativeTime + clip.duration;
    const clipEndPixels = clipEndTime * pixelsPerSecond;
    
    // Check if mouse is in the "insertion zone" after this clip
    // Use a 40px zone around the end of each clip for insertion
    const insertionZoneStart = clipEndPixels - 20;
    const insertionZoneEnd = clipEndPixels + 20;
    
    if (mouseX >= insertionZoneStart && mouseX <= insertionZoneEnd) {
      return i + 1;
    }
    
    cumulativeTime += clip.duration;
  }
  
  // Check if we should insert at the end
  const totalTimelineLength = cumulativeTime * pixelsPerSecond;
  if (mouseX > totalTimelineLength - 20) { // 20px threshold for "end" insertion
    return clipsWithoutDragged.length;
  }
  
  // Default: no valid insertion point found, return current position
  return draggedClipIndex;
}

/**
 * Calculate snap zones for professional clip positioning
 * Creates snap points at clip boundaries and timeline start
 * 
 * @param clips - Current clips array
 * @param draggedId - ID of the clip being dragged
 * @param pixelsPerSecond - Timeline scale factor
 * @returns Array of snap zones with position and type
 */
export interface SnapZone {
  position: number; // X position in pixels
  type: 'start' | 'end' | 'timeline-start';
  clipId?: string; // For clip boundaries
}

export function calculateSnapZones(
  clips: Clip[],
  draggedId: string,
  pixelsPerSecond: number
): SnapZone[] {
  const snapZones: SnapZone[] = [];
  let cumulativePosition = 0;
  
  // Add timeline start snap zone
  snapZones.push({
    position: 0,
    type: 'timeline-start'
  });
  
  // Add snap zones for each clip's start and end
  clips.forEach(clip => {
    if (clip.id !== draggedId) {
      // Clip start position
      snapZones.push({
        position: cumulativePosition,
        type: 'start',
        clipId: clip.id
      });
      
      // Clip end position
      snapZones.push({
        position: cumulativePosition + (clip.duration * pixelsPerSecond),
        type: 'end',
        clipId: clip.id
      });
    }
    
    cumulativePosition += clip.duration * pixelsPerSecond;
  });
  
  return snapZones;
}

/**
 * Find the nearest snap zone within snap distance
 * 
 * @param mouseX - Current mouse X position
 * @param snapZones - Available snap zones
 * @param snapDistance - Maximum distance for snapping (in pixels)
 * @returns Nearest snap zone or null if none within range
 */
export function findNearestSnapZone(
  mouseX: number,
  snapZones: SnapZone[],
  snapDistance: number = 20
): SnapZone | null {
  let nearestZone: SnapZone | null = null;
  let nearestDistance = snapDistance;
  
  snapZones.forEach(zone => {
    const distance = Math.abs(mouseX - zone.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestZone = zone;
    }
  });
  
  return nearestZone;
}

/**
 * Calculate drop index based on snap zone
 * 
 * @param clips - Current clips array
 * @param draggedId - ID of the clip being dragged
 * @param snapZone - The snap zone to drop at
 * @returns Drop index for the clip
 */
export function calculateDropIndexFromSnapZone(
  clips: Clip[],
  _draggedId: string,
  snapZone: SnapZone
): number {
  if (snapZone.type === 'timeline-start') {
    return 0;
  }
  
  if (snapZone.type === 'start' && snapZone.clipId) {
    const targetClipIndex = clips.findIndex(c => c.id === snapZone.clipId);
    return targetClipIndex;
  }
  
  if (snapZone.type === 'end' && snapZone.clipId) {
    const targetClipIndex = clips.findIndex(c => c.id === snapZone.clipId);
    return targetClipIndex + 1;
  }
  
  // Fallback to end
  return clips.length;
}

/**
 * Calculate the visual position for the drop indicator line
 * Shows where the clip will be inserted
 * 
 * @param clips - Current clips array
 * @param dropIndex - Target index where clip should be inserted
 * @param draggedId - ID of the clip being dragged
 * @param pixelsPerSecond - Timeline scale factor
 * @returns X position in pixels for the drop indicator
 */
export function calculateDropIndicatorPosition(
  clips: Clip[],
  dropIndex: number,
  draggedId: string,
  pixelsPerSecond: number
): number {
  let position = 0;
  
  // Filter out the dragged clip to calculate positions without it
  const filteredClips = clips.filter(c => c.id !== draggedId);
  
  // Sum durations of clips before drop position
  for (let i = 0; i < Math.min(dropIndex, filteredClips.length); i++) {
    position += filteredClips[i].duration * pixelsPerSecond;
  }
  
  return position;
}

/**
 * Create a custom drag image element for clip dragging
 * Shows the clip filename in a styled box
 * 
 * @param filename - Name of the clip being dragged
 * @returns HTMLDivElement with custom styling
 */
export function createDragImage(filename: string): HTMLDivElement {
  const dragImage = document.createElement('div');
  dragImage.style.cssText = `
    padding: 10px 15px;
    background: #2a2a2a;
    border: 2px solid #4CAF50;
    border-radius: 4px;
    color: #fff;
    font-family: sans-serif;
    font-size: 14px;
    position: absolute;
    top: -1000px;
  `;
  dragImage.textContent = filename;
  return dragImage;
}

/**
 * Clean up drag image element from DOM
 * 
 * @param dragImage - The drag image element to remove
 */
export function cleanupDragImage(dragImage: HTMLDivElement): void {
  if (document.body.contains(dragImage)) {
    document.body.removeChild(dragImage);
  }
}

