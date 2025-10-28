# PR #5: Video Player Component - Testing Instructions

**Status**: Implementation Complete ✅ | Testing Required ⏳

## How to Test

The app is now running. Please perform the following manual tests:

### Test Setup
1. The dev server is running at `http://localhost:1420`
2. The Tauri window should open automatically
3. Test videos are available in `test-assets/` folder

### Manual Test Checklist

Please test each of these scenarios:

#### 1. Basic Video Loading Test
- [ ] Import a video file using the Import button
- [ ] Click on the clip in the timeline to select it
- [ ] Verify the video loads in the player area
- [ ] Verify the video displays at the correct aspect ratio

#### 2. Play/Pause Controls Test
- [ ] Click the Play button
- [ ] Verify the video starts playing with audio
- [ ] Verify the button text changes to "Pause"
- [ ] Click the Pause button
- [ ] Verify the video stops playing
- [ ] Verify the button text changes to "Play"

#### 3. Time Display Test
- [ ] Start playing a video
- [ ] Verify the current time updates in real-time
- [ ] Verify the format is "0.00s / [duration]s"
- [ ] Verify the duration matches the clip's actual duration

#### 4. Keyboard Shortcuts Test
- [ ] Press Spacebar
- [ ] Verify the video toggles between play and pause
- [ ] Select a clip and press Delete key
- [ ] Verify a confirmation dialog appears
- [ ] Click Cancel - verify clip remains
- [ ] Press Delete again and confirm deletion
- [ ] Verify the clip is removed from timeline

#### 5. Playhead Synchronization Test
- [ ] Play a video
- [ ] Verify the red playhead on the timeline moves in sync with the video
- [ ] Click on a different position in the timeline
- [ ] Verify the video seeks to that position
- [ ] Verify the time display updates accordingly

#### 6. Error Handling Test
- [ ] Try to play a corrupted video file (if available)
- [ ] Verify an error message is displayed
- [ ] Verify the error message auto-dismisses after 5 seconds
- [ ] Verify the error is logged to the console

#### 7. Clip Switching Test
- [ ] Import multiple video files
- [ ] Click on the first clip
- [ ] Verify it loads and displays correctly
- [ ] Click on the second clip
- [ ] Verify the player smoothly switches to the new clip
- [ ] Verify the time display resets
- [ ] Verify playback state resets (should be paused)

#### 8. Video Placeholder Test
- [ ] Delete all clips from the timeline
- [ ] Verify the placeholder message appears: "No clip selected"
- [ ] Verify the placeholder has instructions to select a clip

## Reporting Results

After completing these tests:
1. Mark each test as passed or failed
2. Document any issues found
3. Take screenshots of any errors
4. Update PR5-COMPLETE.md with test results

## Next Steps

Once all tests pass:
1. Update memory bank files
2. Proceed to PR #6: Trim Functionality
