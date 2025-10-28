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
  setIsPlaying: (value: boolean) => void;
  setPlayheadPosition: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Custom hook for managing timeline playback with automatic trim skipping
 * Timeline shows full clip durations, but playback skips trimmed sections
 */
export function usePlaybackLoop({
  isPlaying,
  clips,
  totalTimelineDuration,
  setIsPlaying,
  setPlayheadPosition,
}: UsePlaybackLoopProps): void {
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
        
        // Check if we need to skip trimmed sections during playback
        let accumulatedTime = 0;
        for (const clip of clips) {
          const clipStart = accumulatedTime;
          const clipEnd = accumulatedTime + clip.duration;
          
          if (next >= clipStart && next < clipEnd) {
            // We're in this clip
            const localTime = next - clipStart;
            
            // If we're before the in-point, skip to in-point
            if (localTime < clip.inPoint) {
              return clipStart + clip.inPoint;
            }
            
            // If we're at or past the out-point, skip to next clip (or stop)
            if (localTime >= clip.outPoint) {
              // Skip to next clip's start
              if (clipEnd < totalTimelineDuration) {
                return clipEnd;
              } else {
                // This was the last clip, stop
                setIsPlaying(false);
                return prev;
              }
            }
            
            // We're in the active range, continue normally
            return next;
          }
          
          accumulatedTime += clip.duration;
        }
        
        return next;
      });
    }, 33); // ~30fps
    
    return () => clearInterval(interval);
  }, [isPlaying, clips, totalTimelineDuration, setIsPlaying, setPlayheadPosition]);
}

