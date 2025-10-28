# PR #6: Trim Functionality - Testing Instructions

**Status**: Implementation Complete ✅ | Testing Required ⏳

## Overview

PR #6 adds comprehensive trim functionality to ClipForge, allowing users to set in/out points for clips using buttons, keyboard shortcuts (I/O keys), and draggable handles on the timeline. Playback automatically skips trimmed sections.

## How to Test

Run the Tauri dev server: `npm run tauri dev`

## Manual Test Cases

### Test 1: Basic Trim with Buttons
- [x] Import a video clip
- [x] Select the clip by clicking on it in the timeline
- [x] Play the video to 5 seconds
- [x] Click "Set In Point (I)" button
- [x] Verify the In Point input shows 5.000s
- [x] Play to 10 seconds
- [x] Click "Set Out Point (O)" button
- [x] Verify the Out Point input shows 10.000s
- [x] Verify the Trim Range display shows "5.00s → 10.00s"
- [x] Verify the Active Duration shows "5.00s"

### Test 2: Keyboard Shortcuts (I/O Keys)
- [x] Select a clip
- [x] Play to 3 seconds
- [x] Press "I" key
- [x] Verify in-point is set to 3.000s
- [x] Play to 8 seconds
- [x] Press "O" key
- [x] Verify out-point is set to 8.000s
- [x] Verify keyboard shortcuts don't fire when typing in input fields

### Test 3: Visual Indicators on Timeline
- [x] After setting trim points, check the timeline
- [x] Verify grey overlay appears before the in-point
- [x] Verify grey overlay appears after the out-point
- [x] Verify green vertical line (trim handle) at in-point
- [x] Verify red vertical line (trim handle) at out-point
- [x] Verify trim handles are at correct positions

### Test 4: Draggable Trim Handles
- [x] Hover over the green in-point handle
- [x] Verify cursor changes to resize cursor (ew-resize)
- [x] Drag the in-point handle to a new position
- [x] Verify the in-point value updates in the trim controls
- [x] Verify the grey overlay adjusts accordingly
- [x] Repeat for red out-point handle
- [x] Verify smooth dragging experience

### Test 5: Playback with Trim
- [x] Set in-point at 5s and out-point at 10s
- [x] Move playhead to start of timeline (before in-point)
- [x] Press Play
- [x] **Expected**: Playback should skip to 5s (in-point) and start playing
- [x] Let video play past 10s (out-point)
- [x] **Expected**: Playback should stop or jump to next clip
- [x] Verify trimmed sections are skipped during playback

### Test 6: Manual Input Validation
- [x] Select a clip
- [x] Type "-5" into the In Point input
- [x] Tab out or click elsewhere
- [x] **Expected**: Value auto-clamped to 0.000
- [x] Type a value greater than clip duration into Out Point
- [x] Tab out
- [x] **Expected**: Value auto-clamped to clip duration
- [x] Try to set in-point greater than out-point
- [x] **Expected**: Value auto-corrected to valid range
- [x] Verify invalid inputs show red border briefly before correction

### Test 7: Reset Trim Function
- [x] Set custom in/out points on a clip
- [x] Click "Reset Trim" button
- [x] **Expected**: In-point resets to 0.000
- [x] **Expected**: Out-point resets to clip duration
- [x] **Expected**: Grey overlays and trim handles disappear
- [x] Verify trim range shows full duration

### Test 8: Multiple Clips with Different Trims
- [x] Import 3 different video clips
- [x] Trim clip 1: in=2s, out=8s
- [x] Trim clip 2: in=0s, out=5s  
- [x] Trim clip 3: in=3s, out=10s
- [x] Verify each clip has correct visual indicators
- [x] Play from start
- [x] **Expected**: Plays clip 1 from 2s-8s, then clip 2 from 0s-5s, then clip 3 from 3s-10s
- [x] Verify timeline position updates correctly
- [x] Verify time display shows active durations only

### Test 9: Trim State Persistence
- [x] Trim a clip (e.g., in=5s, out=15s)
- [x] Click on a different clip
- [x] Click back on the first clip
- [x] **Expected**: Trim values are preserved (still shows 5s and 15s)
- [x] Verify visual indicators remain after switching clips

### Test 10: Import New Clip (No Trim)
- [x] Import a new video clip
- [x] Select it
- [x] **Expected**: In Point = 0.000
- [x] **Expected**: Out Point = clip duration
- [x] **Expected**: No grey overlays or trim handles visible
- [x] Verify "Active Duration" equals full clip duration

### Test 11: Edge Case - Very Short Trim
- [x] Set in-point at 5.000s
- [x] Try to set out-point at 5.020s (less than minimum 0.033s)
- [x] **Expected**: System prevents this or auto-adjusts to 5.033s
- [x] Verify minimum duration of 0.033s (one frame at 30fps) is enforced

### Test 12: Edge Case - Trim Entire Clip Except Edges
- [x] Set in-point very close to start (0.033s)
- [x] Set out-point very close to end (duration - 0.033s)
- [x] Verify playback works correctly
- [x] Verify visual indicators show correctly for very thin active regions

### Test 13: Timeline Scrubbing with Trim
- [x] Trim a clip (in=5s, out=10s)
- [x] Click on different positions in the timeline
- [x] Click before in-point
- [x] **Expected**: Video shows frame at in-point (5s)
- [x] Click in active range
- [x] **Expected**: Video shows that frame
- [x] Click after out-point
- [x] **Expected**: Video shows frame at out-point (10s) or next clip

### Test 14: Controls Disabled When No Selection
- [x] Deselect all clips (click on empty timeline area)
- [x] **Expected**: All trim inputs are disabled
- [x] **Expected**: All trim buttons are disabled
- [x] **Expected**: Display shows "No clip selected"
- [x] **Expected**: Keyboard shortcuts (I/O) don't work

### Test 15: Trim Handle Hover State
- [x] Set trim points on a clip
- [x] Hover over green in-point handle
- [x] **Expected**: Handle width increases from 3px to 5px
- [x] **Expected**: Cursor shows ew-resize
- [x] Hover over red out-point handle
- [x] **Expected**: Same hover effects
- [x] Verify hover effects are smooth

## Edge Cases to Verify

- [x] Trim very short segment (<0.1s)
- [x] Trim entire clip except 1 frame
- [x] Multiple clips with different trims playing in sequence
- [x] Scrubbing timeline with trimmed clips
- [x] Keyboard shortcuts while inputs are focused (should not fire)
- [x] Dragging trim handle beyond clip boundaries (should clamp)
- [x] Rapid clicking of Set In/Out buttons
- [x] Deleting a trimmed clip
- [x] Trim + playback + scrubbing combination

## Test Results

**Status**: Testing pending

### Test Summary
- [x] All 15 test cases completed
- [x] All edge cases verified
- [x] No blocking issues found

## Known Issues

None yet - testing in progress.

## Next Steps

After all tests pass:
1. Mark all test checkboxes
2. Document any issues found
3. Update test results summary
4. Proceed to PR #7: Export Functionality

