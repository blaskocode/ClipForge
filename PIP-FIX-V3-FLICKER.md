# PiP Fix V3 - Flicker and Play Issue Resolved

## The Flicker Problem

**Symptom:** When pressing spacebar, video flickers once but doesn't play.

**Root Cause:** The video loading effects had incorrect dependencies:
```javascript
// WRONG - runs on every isPlaying change!
useEffect(() => {
  video.load(); // Reloads video every time user presses spacebar!
}, [activeMainClip?.id, isPlaying, pipClipLocalTime]); // ❌ isPlaying in deps
```

### What Was Happening

1. User presses spacebar
2. `isPlaying` toggles to `true`
3. Loading effect runs (because `isPlaying` was in dependencies)
4. `video.load()` is called → **video flickers and resets**
5. Play/pause effect tries to start playback
6. But video readyState is now 0 (loading) → effect returns early
7. Video never plays!

## The Fix

### 1. Corrected Effect Dependencies ✓

**Loading Effect:**
```javascript
// CORRECT - only runs when clip ID changes
useEffect(() => {
  video.load(); // Only reloads when switching to a different clip
}, [activeMainClip?.id]); // ✓ Only clip ID
```

**Play/Pause Effect:**
```javascript
// Separate effect for play/pause
useEffect(() => {
  if (isPlaying && video.paused) {
    video.play(); // Browser queues play if not ready yet
  }
}, [isPlaying]); // Runs when play/pause state changes
```

### 2. Separated Concerns ✓

**Before:** One effect trying to do loading + playing
**After:** Separate effects with clear responsibilities

- **Loading Effect:** Load video source when clip changes
- **Play/Pause Effect:** Handle play/pause state
- **Seek Effect:** Handle manual scrubbing
- **Drift Correction:** Gentle sync during playback

### 3. Removed Readiness Check from Play ✓

**Before:**
```javascript
if (video.readyState < 2) {
  return; // Don't play if not ready → STUCK!
}
video.play();
```

**After:**
```javascript
video.play(); // Browser will queue and play when ready ✓
```

The browser is smart enough to queue the play() call and execute it once the video is ready.

### 4. Removed Auto-Play from Loading Handler ✓

**Before:**
```javascript
const handleLoadedMetadata = () => {
  video.currentTime = targetTime;
  if (isPlaying) { // Captures stale value from closure!
    video.play();
  }
};
```

**After:**
```javascript
const handleLoadedMetadata = () => {
  video.currentTime = targetTime;
  // That's it! Play/pause effect will handle playback
};
```

## How It Works Now

### Clip Loading Flow

1. New clip selected → `activeMainClip.id` changes
2. Loading effect runs:
   - Pause video (prevent AbortError)
   - Call `video.load()`
   - Wait for loadedmetadata event
   - Seek to correct position
3. Play/pause effect handles playback separately

### Play/Pause Flow

1. User presses spacebar → `isPlaying` toggles
2. Play/pause effect runs:
   - Check if video should be playing
   - Call `video.play()` or `video.pause()`
   - Browser handles readiness automatically

### No More Flickering!

- Loading effect only runs when clip ID changes (not on every spacebar press)
- Play/pause effect only calls play()/pause() (doesn't reload video)
- Result: Smooth play/pause without flickering

## Testing Instructions

1. **Import videos** and assign to main/PiP tracks
2. **Press spacebar** to play
3. **Expected:**
   - No flicker ✓
   - Video starts playing immediately (or after brief buffering) ✓
   - Both main and PiP videos play ✓
   - Console shows helpful logs ✓

### Console Logs to Expect

**Good logs:**
```
Loading new main clip: IMG_2383.mp4
Main clip loaded, seeking to position
Starting main video playback (readyState: 4)
Loading new PiP clip: IMG_2384.mp4
PiP clip loaded, seeking to position
```

**What you should NOT see:**
```
❌ Loading new main clip: ... (repeated on every spacebar press)
❌ AbortError: The operation was aborted
```

## Files Modified

- `src/components/VideoPlayer.tsx` - Fixed effect dependencies and separated concerns

## Build Status

✅ Successfully compiled - No errors or warnings

## Next Steps

1. Run `npm run tauri dev`
2. Import test videos (assign to main and PiP tracks)
3. Press spacebar to test play/pause
4. Verify smooth playback with no flicker
5. Check console logs to confirm proper behavior

The flicker issue should now be completely resolved, and play/pause should work smoothly!

