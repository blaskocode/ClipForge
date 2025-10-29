/**
 * Clip Splitting Utility
 * Handles splitting clips at a specific time point
 */

import { Clip } from '../types';
import { calculateLocalTimeInClip, findActiveClipAtTime } from './timelineCalculations';

/**
 * Split a clip at the specified timeline position
 * Returns new clips array with the original clip split into two
 */
export function splitClipAtTime(
  clipToSplit: Clip,
  timelinePosition: number,
  allClips: Clip[]
): Clip[] {
  // Calculate local time within the clip
  const localTime = calculateLocalTimeInClip(clipToSplit, timelinePosition, allClips);
  
  // Validate split point is within clip bounds
  if (localTime <= clipToSplit.inPoint || localTime >= clipToSplit.outPoint) {
    throw new Error('Cannot split clip at this position - split point must be within clip boundaries');
  }
  
  // Find the index of the clip to split
  const clipIndex = allClips.findIndex(c => c.id === clipToSplit.id);
  if (clipIndex === -1) {
    throw new Error('Clip not found in clips array');
  }
  
  // Calculate source file offset (where clip starts in the original file)
  // If clip was previously split, use sourceOffset; otherwise use inPoint
  const sourceStartOffset = clipToSplit.sourceOffset ?? clipToSplit.inPoint;
  
  // Create first half of the split clip (0 to split point relative to clip)
  // Part 1: starts at sourceStartOffset, ends at sourceStartOffset + localTime
  const firstClipDuration = localTime - clipToSplit.inPoint;
  const firstClip: Clip = {
    ...clipToSplit,
    id: `${clipToSplit.id}-part1-${Date.now()}`,
    inPoint: 0,  // Clean clip, starts at 0
    outPoint: firstClipDuration,  // Ends at its duration
    duration: firstClipDuration,
    sourceOffset: sourceStartOffset,  // Where Part 1 starts in source file
    filename: `${clipToSplit.filename} (Part 1)`,
  };
  
  // Create second half of the split clip (split point to end relative to clip)
  // Part 2: starts at sourceStartOffset + localTime, ends at sourceStartOffset + clipToSplit.outPoint
  const part2Duration = clipToSplit.outPoint - localTime;
  const secondClip: Clip = {
    ...clipToSplit,
    id: `${clipToSplit.id}-part2-${Date.now()}`,
    inPoint: 0,  // Clean clip, starts at 0
    outPoint: part2Duration,  // Ends at its duration
    duration: part2Duration,
    sourceOffset: sourceStartOffset + localTime,  // Where Part 2 starts in source file
    filename: `${clipToSplit.filename} (Part 2)`,
  };
  
  // Both Part 1 and Part 2 are clean clips:
  // - inPoint = 0 (clip starts at 0)
  // - outPoint = duration (clip ends at its duration)
  // - sourceOffset tells VideoPlayer where to seek in the source file
  // Example: Split 5-second clip at 2 seconds
  //   Part 1: inPoint=0, outPoint=2, duration=2, sourceOffset=0 (starts at 0 in source file)
  //   Part 2: inPoint=0, outPoint=3, duration=3, sourceOffset=2 (starts at 2 seconds in source file)
  
  // Build new clips array: everything before, first half, second half, everything after
  const newClips = [
    ...allClips.slice(0, clipIndex),
    firstClip,
    secondClip,
    ...allClips.slice(clipIndex + 1),
  ];
  
  return newClips;
}

/**
 * Find the clip at the playhead position and split it
 * Returns the new clips array and the ID of the newly selected clip (first half)
 */
export function splitClipAtPlayhead(
  playheadPosition: number,
  allClips: Clip[],
  preferTrack: 'main' | 'pip' = 'main'
): { newClips: Clip[]; selectedClipId: string | null } | null {
  // Find active clips on both tracks
  const activeMainClip = findActiveClipAtTime('main', playheadPosition, allClips);
  const activePipClip = findActiveClipAtTime('pip', playheadPosition, allClips);
  
  // Prioritize the preferred track, but allow splitting on either track
  const clipToSplit = preferTrack === 'main' 
    ? (activeMainClip || activePipClip)
    : (activePipClip || activeMainClip);
  
  if (!clipToSplit) {
    return null; // No clip at playhead position
  }
  
  // Validate we can split (split point must be within trim boundaries)
  const localTime = calculateLocalTimeInClip(clipToSplit, playheadPosition, allClips);
  
  // Can't split at or before inPoint, or at or after outPoint
  if (localTime <= clipToSplit.inPoint || localTime >= clipToSplit.outPoint) {
    return null; // Invalid split position
  }
  
  // Perform the split
  const newClips = splitClipAtTime(clipToSplit, playheadPosition, allClips);
  
  // Find the first half (it will be inserted right after the original clip's position)
  const originalIndex = allClips.findIndex(c => c.id === clipToSplit.id);
  const firstHalfIndex = originalIndex; // First half takes the original position
  const firstHalf = newClips[firstHalfIndex];
  
  return {
    newClips,
    selectedClipId: firstHalf?.id || null,
  };
}
