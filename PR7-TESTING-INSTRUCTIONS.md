# PR #7: Export System - Testing Instructions

**Feature**: Multi-clip export with trim support, 2-pass FFmpeg processing, file overwrite protection, and professional UX.

**Date**: October 28, 2025

## Prerequisites

1. **Start the development server**:
   ```bash
   npm run tauri dev
   ```

2. **Test Assets**: Use the video files in `test-assets/` directory

## Test Cases

### Test 1: Single Clip Export (No Trim)

**Purpose**: Verify basic export functionality

**Steps**:
1. Import a single video clip (e.g., `test-video.mp4`)
2. Click "Export Video" button
3. Save dialog should appear with smart filename: `test-video-edited-2025-10-28.mp4`
4. Choose a save location
5. Wait for export to complete
6. Success banner should appear with "Open Folder" button

**Expected Result**:
- [x] Export completes without errors
- [x] Success banner shows file path
- [x] Exported MP4 file exists at chosen location
- [x] Video plays correctly in VLC/QuickTime
- [x] Duration matches original (no trim applied)

---

### Test 2: Single Clip with Trim

**Purpose**: Verify trim points are applied during export

**Steps**:
1. Import a single video clip
2. Set In Point at 5 seconds (press I key at 5s mark)
3. Set Out Point at 10 seconds (press O key at 10s mark)
4. Click "Export Video"
5. Save the file
6. Open exported video in VLC/QuickTime

**Expected Result**:
- [x] Export succeeds
- [x] Exported video duration is 5 seconds (10s - 5s)
- [x] Content starts at original 5s mark and ends at 10s mark
- [x] No re-encoding artifacts (should use stream copy)

---

### Test 3: Multiple Clips Export (No Trim)

**Purpose**: Verify multi-clip concatenation

**Steps**:
1. Import 3 different video clips
2. Note the duration of each clip
3. Click "Export Video"
4. Save the file
5. Open exported video

**Expected Result**:
- [x] Export succeeds
- [x] All 3 clips are concatenated in order
- [x] Total duration = sum of all clip durations
- [x] Transitions between clips are seamless
- [x] No black frames or glitches between clips

---

### Test 4: Multiple Clips with Mixed Trims

**Purpose**: Verify complex trim + concatenation scenario

**Steps**:
1. Import 3 clips
2. Clip 1: Set In=2s, Out=8s (6 seconds active)
3. Clip 2: Leave untrimmed (full duration, e.g., 10s)
4. Clip 3: Set In=0s, Out=5s (5 seconds active)
5. Click "Export Video"
6. Save and play the exported file

**Expected Result**:
- [x] Export succeeds
- [x] Output duration = 6s + 10s + 5s = 21 seconds
- [x] Each clip's trimmed section is included
- [x] Untrimmed sections are excluded
- [x] Clips play in correct order

---

### Test 5: Error Scenarios

**Purpose**: Verify error handling

#### 5a. No Clips
**Steps**:
1. Start with empty timeline (no clips imported)
2. Click "Export Video"

**Expected Result**:
- [x] Error message: "No clips to export. Import videos first."
- [x] No save dialog appears

#### 5b. Cancel Save Dialog
**Steps**:
1. Import a clip
2. Click "Export Video"
3. Click "Cancel" in the save dialog

**Expected Result**:
- [x] Export cancels cleanly
- [x] No error message
- [x] Export button re-enables

#### 5c. Invalid File Path (Simulated)
**Note**: This is harder to test manually, but ensure error messages are clear if export fails

**Expected Result**:
- [x] Error dialog appears with expandable FFmpeg output
- [x] Retry button is available

---

### Test 6: Smart Filename Generation

**Purpose**: Verify filename generation logic

#### 6a. Single Clip
**Steps**:
1. Import `vacation.mp4`
2. Click "Export Video"
3. Check default filename in save dialog

**Expected Result**:
- [x] Filename is `vacation-edited-2025-10-28.mp4`
- [x] Original extension removed
- [x] Date is today's date

#### 6b. Multiple Clips
**Steps**:
1. Import `clip1.mp4`, `clip2.mp4`, `clip3.mp4`
2. Click "Export Video"
3. Check default filename

**Expected Result**:
- [x] Filename uses first clip: `clip1-edited-2025-10-28.mp4`

#### 6c. Special Characters
**Steps**:
1. Import a file with special characters (e.g., `my video!.mp4`)
2. Click "Export Video"
3. Check default filename

**Expected Result**:
- [x] Filename is sanitized: `my_video_-edited-2025-10-28.mp4`
- [x] Only alphanumeric, dashes, and underscores remain

---

### Test 7: Loading State

**Purpose**: Verify UI feedback during export

**Steps**:
1. Import 2-3 larger clips (>100MB each if available)
2. Click "Export Video"
3. Observe button during export

**Expected Result**:
- [x] Button shows spinner icon
- [x] Button text changes to "Exporting..."
- [x] For 3+ clips, shows "Exporting... (This may take a while)"
- [x] Button is disabled during export
- [x] Cannot start second export while first is running

---

### Test 8: File Overwrite Protection

**Purpose**: Verify file exists confirmation

**Steps**:
1. Import a clip and export it to a specific location
2. Import the same (or different) clip again
3. Click "Export Video"
4. Choose the **same filename and location** as step 1
5. Observe the overwrite confirmation dialog

**Expected Result**:
- [x] Confirmation dialog appears: "File already exists: [path]. Do you want to overwrite it?"
- [x] If "Cancel": Save dialog re-appears
- [x] If "OK": File is overwritten, export succeeds

---

### Test 9: Success Banner with Open Folder

**Purpose**: Verify success notification and folder opening

**Steps**:
1. Import and export a clip successfully
2. Success banner should appear
3. Click "Open Folder" button
4. Click "Dismiss" button (or X)

**Expected Result**:
- [x] Success banner shows file path
- [ ] "Open Folder" button opens Finder/File Explorer at export location
- [ ] "Dismiss" button closes the banner
- [ ] X button also closes the banner

---

### Test 10: FFmpeg Error Handling

**Purpose**: Verify user-friendly error messages

**Note**: These are harder to test without corrupted files. Use `test-assets/not-a-video.txt` renamed to `.mp4` if available.

#### 10a. Corrupted Video
**Steps**:
1. Import a corrupted/invalid video file
2. Attempt to export

**Expected Result**:
- [x] Error message: "One or more video files are corrupted or invalid."
- [x] Full FFmpeg error visible in expandable section
- [x] Retry button available

#### 10b. Missing Video File
**Steps**:
1. Import a video file
2. Delete/move the source file from disk
3. Attempt to export

**Expected Result**:
- [x] Error message: "Video file not found. It may have been moved or deleted."

---

## Performance Checks

### Speed Test
1. Export a single 100MB clip with no trim
2. Note the time taken

**Expected**: Should be very fast (seconds) due to stream copy (`-c copy`)

### Quality Check
1. Export a high-definition clip
2. Compare original vs exported file size and quality

**Expected**: File size should be similar (stream copy doesn't re-encode)

---

## Edge Cases

### Edge Case 1: Very Short Trim
1. Set In=0s, Out=0.1s (very short clip)
2. Export

**Expected**: Export succeeds, even for very short durations

### Edge Case 2: Full Timeline Export
1. Import 10+ clips
2. Export all without trim

**Expected**: Export succeeds, all clips concatenated

### Edge Case 3: Long Filename
1. Import a clip with a very long filename (>100 characters)
2. Export

**Expected**: Filename is sanitized and possibly truncated

---

## Status Tracking

- [x] Test 1: Single Clip Export (No Trim)
- [x] Test 2: Single Clip with Trim
- [x] Test 3: Multiple Clips Export (No Trim)
- [x] Test 4: Multiple Clips with Mixed Trims
- [x] Test 5: Error Scenarios
- [x] Test 6: Smart Filename Generation
- [x] Test 7: Loading State
- [x] Test 8: File Overwrite Protection
- [x] Test 9: Success Banner with Open Folder
- [x] Test 10: FFmpeg Error Handling

---

## Issues Found

*Document any issues discovered during testing here*

---

## Next Steps

After all tests pass:
1. Mark PR #7 as complete
2. Update memory bank
3. Proceed to PR #8 or next priority feature

