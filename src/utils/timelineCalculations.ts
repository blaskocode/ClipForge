import { Clip } from '../types';

/**
 * Calculate the start time of a clip based on its position in its track
 */
export function calculateClipStartTime(clip: Clip, allClips: Clip[]): number {
  const trackClips = allClips
    .filter(c => c.track === clip.track)
    .sort((a, b) => {
      // Sort by the order they appear in the original array
      const aIndex = allClips.findIndex(c => c.id === a.id);
      const bIndex = allClips.findIndex(c => c.id === b.id);
      return aIndex - bIndex;
    });
  
  const clipIndex = trackClips.findIndex(c => c.id === clip.id);
  if (clipIndex === -1) return 0;
  
  // Sum durations of all clips before this one in the same track
  let startTime = 0;
  for (let i = 0; i < clipIndex; i++) {
    startTime += trackClips[i].duration;
  }
  
  return startTime;
}

/**
 * Calculate the end time of a clip based on its start time and duration
 */
export function calculateClipEndTime(clip: Clip, allClips: Clip[]): number {
  const startTime = calculateClipStartTime(clip, allClips);
  return startTime + clip.duration;
}

/**
 * Find which clip is active at a given timeline position for a specific track
 */
export function findActiveClipAtTime(track: 'main' | 'pip', timelinePosition: number, allClips: Clip[]): Clip | null {
  const trackClips = allClips
    .filter(c => c.track === track)
    .sort((a, b) => {
      // Sort by the order they appear in the original array
      const aIndex = allClips.findIndex(c => c.id === a.id);
      const bIndex = allClips.findIndex(c => c.id === b.id);
      return aIndex - bIndex;
    });
  
  for (const clip of trackClips) {
    const startTime = calculateClipStartTime(clip, allClips);
    const endTime = calculateClipEndTime(clip, allClips);
    
    if (timelinePosition >= startTime && timelinePosition < endTime) {
      return clip;
    }
  }
  
  return null;
}

/**
 * Calculate the local time within a clip based on the global timeline position
 */
export function calculateLocalTimeInClip(clip: Clip, timelinePosition: number, allClips: Clip[]): number {
  const startTime = calculateClipStartTime(clip, allClips);
  return Math.max(0, timelinePosition - startTime);
}

/**
 * Get all clips for a specific track in timeline order
 */
export function getTrackClips(track: 'main' | 'pip', allClips: Clip[]): Clip[] {
  return allClips
    .filter(c => c.track === track)
    .sort((a, b) => {
      // Sort by the order they appear in the original array
      const aIndex = allClips.findIndex(c => c.id === a.id);
      const bIndex = allClips.findIndex(c => c.id === b.id);
      return aIndex - bIndex;
    });
}
