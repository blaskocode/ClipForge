/**
 * Clip Splitting Utility
 * Handles splitting clips at a specific time point
 */

import { Clip } from '../types';
import { calculateLocalTimeInClip, findActiveClipAtTime, calculateClipStartTime } from './timelineCalculations';

/**
 * Split a clip at the specified timeline position
 * Returns new clips array with the original clip split into two
 */
export function splitClipAtTime(
  clipToSplit: Clip,
  timelinePosition: number,
  allClips: Clip[]
): Clip[] {
  // Calculate local time within the clip's timeline position (0 to trimmed duration)
  const localTimeInTimeline = calculateLocalTimeInClip(clipToSplit, timelinePosition, allClips);
  
  // Convert to absolute time in clip source (accounting for inPoint)
  const clipInPoint = clipToSplit.inPoint || 0;
  const clipOutPoint = clipToSplit.outPoint || clipToSplit.duration;
  const absoluteTimeInClip = clipInPoint + localTimeInTimeline;
  
  // Validate split point is within clip bounds (trimmed visible portion)
  if (absoluteTimeInClip <= clipInPoint || absoluteTimeInClip >= clipOutPoint) {
    throw new Error('Cannot split clip at this position - split point must be within clip boundaries');
  }
  
  // Find the index of the clip to split
  const clipIndex = allClips.findIndex(c => c.id === clipToSplit.id);
  if (clipIndex === -1) {
    throw new Error('Clip not found in clips array');
  }
  
  // Calculate source file offset (where clip starts in the original file)
  // If clip was previously split, use sourceOffset; otherwise use 0
  const sourceStartOffset = clipToSplit.sourceOffset ?? 0;
  
  // Create first half of the split clip (from inPoint to split point)
  // Part 1: starts at sourceStartOffset + clipInPoint, ends at sourceStartOffset + absoluteTimeInClip
  const firstClipAbsoluteDuration = absoluteTimeInClip - clipInPoint;
  const firstClip: Clip = {
    ...clipToSplit,
    id: `${clipToSplit.id}-part1-${Date.now()}`,
    inPoint: 0,  // Clean clip, starts at 0
    outPoint: firstClipAbsoluteDuration,  // Ends at its duration
    duration: firstClipAbsoluteDuration,
    sourceOffset: sourceStartOffset + clipInPoint,  // Where Part 1 starts in source file
    filename: `${clipToSplit.filename} (Part 1)`,
  };
  
  // Create second half of the split clip (from split point to outPoint)
  // Part 2: starts at sourceStartOffset + absoluteTimeInClip, ends at sourceStartOffset + clipOutPoint
  const part2AbsoluteDuration = clipOutPoint - absoluteTimeInClip;
  const secondClip: Clip = {
    ...clipToSplit,
    id: `${clipToSplit.id}-part2-${Date.now()}`,
    inPoint: 0,  // Clean clip, starts at 0
    outPoint: part2AbsoluteDuration,  // Ends at its duration
    duration: part2AbsoluteDuration,
    sourceOffset: sourceStartOffset + absoluteTimeInClip,  // Where Part 2 starts in source file
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
  // localTime is the time within the visible trimmed portion (0 to trimmed duration)
  // We need to convert this to absolute clip time to check against inPoint/outPoint
  const clipStartTime = calculateClipStartTime(clipToSplit, allClips);
  const localTimeInTimeline = playheadPosition - clipStartTime;
  
  // Calculate absolute time in clip source (accounting for inPoint)
  const clipInPoint = clipToSplit.inPoint || 0;
  const clipOutPoint = clipToSplit.outPoint || clipToSplit.duration;
  const absoluteTimeInClip = clipInPoint + localTimeInTimeline;
  
  // Can't split at or before inPoint, or at or after outPoint
  if (absoluteTimeInClip <= clipInPoint || absoluteTimeInClip >= clipOutPoint) {
    return null; // Invalid split position
  }
  
  // Perform the split (splitClipAtTime will use playheadPosition to calculate the split point)
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
