// Custom hook for timeline playback loop with trim skipping
import { useEffect } from "react";
import { Clip } from '../types';

interface UsePlaybackLoopProps {
  isPlaying: boolean;
  isVideoActuallyPlaying: boolean;
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
  totalTimelineDuration,
  playheadPosition,
  setIsPlaying,
}: UsePlaybackLoopProps): void {
  useEffect(() => {
    // Video-driven playback: VideoPlayer component now drives the playhead via RAF loop
    // This hook is now minimal - just ensures we stop at timeline end
    if (!isPlaying) return;
    
    // Check if playhead has reached the end
    if (playheadPosition >= totalTimelineDuration) {
      setIsPlaying(false);
    }
  }, [isPlaying, playheadPosition, totalTimelineDuration, setIsPlaying]);
}

