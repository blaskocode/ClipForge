// Custom hook for timeline playback loop with trim skipping
import { useEffect } from "react";

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

interface UsePlaybackLoopProps {
  isPlaying: boolean;
  clips: Clip[];
  totalTimelineDuration: number;
  playheadPosition: number;
  setIsPlaying: (value: boolean) => void;
  updatePlayheadPosition: (position: number) => void;
}

/**
 * Custom hook for managing timeline playback with automatic trim skipping
 * Timeline shows full clip durations, but playback skips trimmed sections
 */
export function usePlaybackLoop({
  isPlaying,
  clips,
  totalTimelineDuration,
  playheadPosition,
  setIsPlaying,
  updatePlayheadPosition,
}: UsePlaybackLoopProps): void {
  useEffect(() => {
    if (!isPlaying) return;
    
    let currentPosition = playheadPosition; // Start from current position
    
    const interval = setInterval(() => {
      const next = currentPosition + 0.033; // ~30fps updates
      
      // Stop at end of timeline
      if (next >= totalTimelineDuration) {
        setIsPlaying(false);
        updatePlayheadPosition(totalTimelineDuration);
        return;
      }
      
      // Check if we need to skip trimmed sections during playback
      let accumulatedTime = 0;
      let newPosition = next;
      
      for (const clip of clips) {
        const clipStart = accumulatedTime;
        const clipEnd = accumulatedTime + clip.duration;
        
        if (next >= clipStart && next < clipEnd) {
          // We're in this clip
          const localTime = next - clipStart;
          
          // If we're before the in-point, skip to in-point
          if (localTime < clip.inPoint) {
            newPosition = clipStart + clip.inPoint;
            break;
          }
          
          // If we're at or past the out-point, skip to next clip (or stop)
          if (localTime >= clip.outPoint) {
            // Skip to next clip's start
            if (clipEnd < totalTimelineDuration) {
              newPosition = clipEnd;
            } else {
              // This was the last clip, stop
              setIsPlaying(false);
              return;
            }
            break;
          }
          
          // We're in the active range, continue normally
          newPosition = next;
          break;
        }
        
        accumulatedTime += clip.duration;
      }
      
      currentPosition = newPosition;
      updatePlayheadPosition(newPosition);
    }, 33); // ~30fps
    
    return () => clearInterval(interval);
  }, [isPlaying, clips, totalTimelineDuration, playheadPosition, setIsPlaying, updatePlayheadPosition]);
}

