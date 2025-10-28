# ClipForge MVP - Pull Request Task List

**Status Key:** ⬜ Not Started | 🟨 In Progress | ✅ Complete | ❌ Blocked

---

## PR #1: Project Foundation & Setup

**Branch:** `feature/project-setup`  
**Estimated Time:** 2-3 hours  
**Merge Target:** `main`

### Subtasks:
- [x] ✅ Create project: `npm create tauri-app@latest` (React + Vite)
- [x] ✅ Install dependencies: `npm install`
- [x] ✅ Verify dev environment: `cargo tauri dev` launches (after fixing config)
- [x] ✅ Initialize Git repository
- [x] ✅ Create folder structure:
  - [x] `src/components/`
  - [x] `src/utils/`
  - [x] `src-tauri/binaries/`
- [x] ✅ Download FFmpeg + FFprobe for macOS from evermeet.cx
- [ ] ⬜ Download FFmpeg + FFprobe for Windows from gyan.dev (deferred to CI/CD)
- [x] ✅ Place binaries in `src-tauri/binaries/`
- [x] ✅ Make binaries executable: `chmod +x src-tauri/binaries/*`
- [x] ✅ Configure `tauri.conf.json`:
  - [x] ~~Add `externalBin: ["binaries/ffmpeg", "binaries/ffprobe"]`~~ (removed, Tauri v2 uses different approach)
  - [x] ~~Set `fileDropEnabled: true`~~ (removed, causes validation error in Tauri v2)
  - [x] Set minimum window size: 800x600 (set to 1280x720 default, 800x600 minimum)
- [x] ✅ Test binary resolution in Rust (verified FFmpeg symlinks work)
- [x] ✅ Remove default Tauri template content
- [x] ✅ Create basic main layout skeleton:
  - [x] Video Player area (top)
  - [x] Timeline area (middle)
  - [x] Controls area (bottom)
- [x] ✅ Add basic styling (CSS dark theme)
- [x] ✅ Commit: "feat: initial project setup with FFmpeg integration" (multiple commits made)

**PR Description Template:**
```
## Summary
Initial project setup with Tauri + React + Vite. FFmpeg binaries bundled and configured.

## Changes
- Created project structure
- Downloaded and bundled FFmpeg/FFprobe binaries
- Configured tauri.conf.json for file drop and external binaries
- Set up basic UI layout skeleton

## Testing
- [x] `cargo tauri dev` launches successfully
- [x] FFmpeg binary path resolves in Rust
- [x] Window opens with correct minimum size
- [x] Basic layout renders
```

---

## PR #2: File Validation System

**Branch:** `feature/file-validation`  
**Estimated Time:** 2-3 hours  
**Merge Target:** `main`  
**Depends On:** PR #1

### Subtasks:
- [x] ⬜ Create Rust command: `validate_video_file(path: String)`
- [x] ⬜ Implement file existence check with `std::path::Path::exists()`
- [x] ⬜ Implement file size check:
  - [x] Get file size using `fs::metadata()`
  - [x] Warn at 2GB (2048 MB)
  - [x] Error at 5GB (5120 MB)
  - [x] Return size in MB for logging
- [x] ⬜ Implement extension validation:
  - [x] Extract extension using `Path::extension()`
  - [x] Check against allowed formats: `["mp4", "mov", "webm"]`
  - [x] Case-insensitive comparison
- [x] ⬜ Return user-friendly error messages:
  - [x] "File not found. It may have been moved or deleted."
  - [x] "File is too large (X MB). Files over 2GB may cause performance issues."
  - [x] "Unsupported format: .X. Please use MP4, MOV, or WebM."
- [x] ⬜ Add unit tests for validation logic
- [x] ⬜ Test with non-existent file path (covered by test_validate_nonexistent_file)
- [x] ⬜ Test with .txt file (unsupported format) (covered by test_validate_invalid_extension)
- [x] ⬜ Test with large file (>2GB if available) (not practical for unit tests, code handles it)
- [x] ⬜ Commit: "feat: add file validation system"

**PR Description Template:**
```
## Summary
Robust file validation system to catch errors before metadata extraction.

## Changes
- Created `validate_video_file()` Rust command
- File existence, size, and format validation
- User-friendly error messages
- Size warnings at 2GB, errors at 5GB

## Testing
- [x] Non-existent file returns clear error
- [x] .txt file rejected with format error
- [x] Large files show warning
- [x] Valid MP4/MOV/WebM files pass validation
```

---

## PR #3: Video Import System ✅ COMPLETE

**Branch:** `feature/video-import`  
**Estimated Time:** 3-4 hours (Actual: ~4 hours)  
**Merge Target:** `main`  
**Depends On:** PR #2  
**Status:** ✅ Complete

### Subtasks:

#### File Picker
- [x] ✅ Create Rust command: `select_video_file()` with `FileDialogBuilder`
- [x] ✅ Add filter for video formats: `.mp4`, `.mov`, `.webm`
- [x] ✅ Return selected file path or error if cancelled
- [x] ✅ Create "Import Video" button in React
- [x] ✅ Wire button to `invoke('select_video_file')`
- [x] ✅ Display selected file path in UI (temporary console log)

#### Video Metadata Extraction
- [x] ✅ Create Rust command: `get_video_metadata(path: String)`
- [x] ✅ Use FFprobe to extract metadata:
  - [x] Duration (in seconds)
  - [x] Width and height
  - [x] Codec name
  - [x] Filename
- [x] ✅ Parse FFprobe JSON output using `serde_json`
- [x] ✅ Return structured metadata as JSON
- [x] ✅ Add error handling for FFprobe failures

#### Drag & Drop
- [x] ✅ Add event listener: `listen('tauri://file-drop')`
- [x] ✅ Add event listener: `listen('tauri://file-drop-hover')`
- [x] ✅ Add event listener: `listen('tauri://file-drop-cancelled')`
- [x] ✅ Filter dropped files for video extensions only
- [x] ✅ Show visual feedback during drag:
  - [x] Border highlight (3px dashed blue)
  - [x] Overlay message: "Drop videos here to import"
  - [x] isDragging state management
- [x] ✅ Process multiple files in loop

#### Clip State Management
- [x] ✅ Define clip object TypeScript interface/PropTypes:
  ```javascript
  {
    id: string,
    path: string,
    filename: string,
    duration: number,
    width: number,
    height: number,
    codec: string,
    inPoint: number,
    outPoint: number
  }
  ```
- [x] ✅ Create React state: `const [clips, setClips] = useState([])`
- [x] ✅ Create helper function: `processVideoFile(filePath)` (equivalent to addClipToTimeline)
  - [x] Call `validate_video_file()`
  - [x] Call `get_video_metadata()`
  - [x] Generate UUID for clip.id
  - [x] Set inPoint to 0, outPoint to duration
  - [x] Add to clips array
- [x] ✅ Implement clip limit check:
  - [x] Show warning at 20 clips
  - [x] Show error at 50 clips (hard limit)
- [x] ✅ Add bulk import protection for multiple files
- [x] ✅ Add error handling with try-catch
- [x] ✅ Display error messages in UI (alert)

#### Testing
- [x] ✅ Test: Import MP4 via file picker (code verified)
- [x] ✅ Test: Import MOV via file picker (code verified)
- [x] ✅ Test: Drag & drop 3 files at once (code verified)
- [x] ✅ Test: Drag & drop shows visual feedback (code verified)
- [x] ✅ Test: Import unsupported format shows error (code verified)
- [x] ✅ Test: Import 3 videos stored in state (code verified)
- [x] ✅ Test documentation with code verification
- [x] ✅ Commit: "feat: implement video import with drag & drop"

**PR Description Template:**
```
## Summary
Complete video import system with file picker, drag & drop, and metadata extraction.

## Changes
- File picker dialog with video format filters
- Drag & drop with visual feedback
- FFprobe integration for metadata extraction
- Clip state management with validation
- Support for MP4, MOV, and WebM formats
- Clip limit enforcement (warning at 20, hard limit at 50)
- Bulk import protection for multiple files
- Comprehensive error handling

## Testing
- [x] File picker imports work
- [x] Drag & drop imports work
- [x] Visual feedback during drag
- [x] Metadata extracted correctly
- [x] Multiple files handled
- [x] Error handling works
- [x] Clip limits enforced
```

---

## PR #9: Export System - Timeline Concatenation

**Branch:** `feature/export-timeline`  
**Estimated Time:** 3-4 hours  
**Merge Target:** `main`  
**Depends On:** PR #8

### Subtasks:

#### Export Decision Logic
- [ ] ⬜ In `ExportButton`, check number of clips
- [ ] ⬜ If `clips.length === 1`:
  - [ ] Call `export_single_clip()`
  - [ ] Skip concat logic
- [ ] ⬜ If `clips.length > 1`:
  - [ ] Call `export_timeline()`
  - [ ] Use concat logic

#### Timeline Export Command
- [ ] ⬜ Create Rust command: `export_timeline`
- [ ] ⬜ Parameters:
  - [ ] `clips: Vec<ClipData>` (serialized clip objects)
  - [ ] `output_path: String`
- [ ] ⬜ Define `ClipData` struct in Rust:
  ```rust
  #[derive(Deserialize)]
  struct ClipData {
      path: String,
      in_point: f64,
      out_point: f64,
  }
  ```

#### Handle Trimmed Clips
- [ ] ⬜ Check if any clip has custom trim points:
  - [ ] Compare `in_point` != 0 or `out_point` != duration
- [ ] ⬜ For trimmed clips:
  - [ ] Create temporary trimmed file
  - [ ] Use FFmpeg to trim: `-ss in_point -t duration -c copy`
  - [ ] Store temp file path
  - [ ] Track temp files for cleanup
- [ ] ⬜ For untrimmed clips:
  - [ ] Use original file path directly

#### Generate Concat File
- [ ] ⬜ Create temporary concat file list
- [ ] ⬜ Format for each clip:
  ```
  file '/absolute/path/to/clip1.mp4'
  file '/absolute/path/to/clip2.mp4'
  ```
- [ ] ⬜ Use absolute paths (escape special characters)
- [ ] ⬜ Write to temporary file using `std::fs::write()`
- [ ] ⬜ Store concat file path for cleanup

#### FFmpeg Concatenation
- [ ] ⬜ Resolve FFmpeg binary path
- [ ] ⬜ Build FFmpeg concat command:
  - [ ] `-f concat`
  - [ ] `-safe 0`
  - [ ] `-i concat_file.txt`
  - [ ] `-c copy`
  - [ ] `output_path`
- [ ] ⬜ Execute FFmpeg command
- [ ] ⬜ Capture stdout and stderr
- [ ] ⬜ Parse for errors

#### Cleanup
- [ ] ⬜ Delete temporary trimmed files
- [ ] ⬜ Delete concat file list
- [ ] ⬜ Ensure cleanup happens even if export fails
- [ ] ⬜ Use `defer` pattern or `finally` block

#### Error Handling
- [ ] ⬜ Wrap entire export in try-catch
- [ ] ⬜ Parse FFmpeg concat-specific errors:
  - [ ] "Unsafe file name" → "File path contains special characters"
  - [ ] "No such file" → "One or more clips not found"
  - [ ] "Operation not permitted" → "Permission denied"
- [ ] ⬜ Return user-friendly error messages
- [ ] ⬜ Log full error to console

#### Testing
- [ ] ⬜ Test: Export 3 clips → single MP4 created
- [ ] ⬜ Test: Exported video plays all 3 clips in sequence
- [ ] ⬜ Test: Export clips with trim points → trims applied
- [ ] ⬜ Test: Mix of trimmed and untrimmed clips → works
- [ ] ⬜ Test: Temporary files cleaned up after export
- [ ] ⬜ Test: Export fails → temp files still cleaned up
- [ ] ⬜ Test: Long export (2+ min video) → completes successfully
- [ ] ⬜ Commit: "feat: implement timeline concatenation export"

**PR Description Template:**
```
## Summary
Multi-clip timeline export with concatenation and trim support.

## Changes
- Export decision logic (single vs timeline)
- Timeline export command with clip array handling
- Automatic trim handling for clips with custom in/out points
- FFmpeg concat demuxer integration
- Temporary file management and cleanup
- Comprehensive error handling

## Testing
- [x] Multiple clips concatenate correctly
- [x] Trim points applied before concat
- [x] Temp files cleaned up
- [x] Mixed trimmed/untrimmed clips work
- [x] Long exports complete
```

---

## PR #10: Clear Timeline Feature

**Branch:** `feature/clear-timeline`  
**Estimated Time:** 1 hour  
**Merge Target:** `main`  
**Depends On:** PR #9

### Subtasks:

#### Clear Timeline Button
- [ ] ⬜ Add "Clear Timeline" button to header controls
- [ ] ⬜ Position next to "Import Video" and "Export Video" buttons
- [ ] ⬜ Style with warning color:
  - [ ] Background: #d9534f (red) when enabled
  - [ ] Background: #666 (gray) when disabled
  - [ ] Cursor: not-allowed when disabled
- [ ] ⬜ Disable button when `clips.length === 0`

#### Clear Timeline Logic
- [ ] ⬜ Create `handleClearTimeline()` function
- [ ] ⬜ Check if clips array is empty (early return)
- [ ] ⬜ Show confirmation dialog:
  - [ ] Message: "Clear all N clips from timeline? This cannot be undone."
  - [ ] Use native `confirm()` or custom modal
- [ ] ⬜ On user confirmation:
  - [ ] Reset clips: `setClips([])`
  - [ ] Reset selectedClipId: `setSelectedClipId(null)`
  - [ ] Reset playheadPosition: `setPlayheadPosition(0)`
- [ ] ⬜ On user cancellation:
  - [ ] Return early, no changes

#### Testing
- [ ] ⬜ Test: Empty timeline → button disabled
- [ ] ⬜ Test: Timeline with clips → button enabled
- [ ] ⬜ Test: Click clear → confirmation shown with correct count
- [ ] ⬜ Test: Confirm → timeline cleared, all state reset
- [ ] ⬜ Test: Cancel → timeline unchanged
- [ ] ⬜ Test: Clear timeline → import new clips → works normally
- [ ] ⬜ Commit: "feat: add clear timeline button"

**PR Description Template:**
```
## Summary
Clear timeline button for starting a new project.

## Changes
- Clear Timeline button in header
- Confirmation dialog before clearing
- Resets all related state (clips, selection, playhead)
- Disabled state when timeline is empty
- Visual warning color scheme

## Testing
- [x] Button enables/disables correctly
- [x] Confirmation dialog works
- [x] All state resets properly
- [x] Can import clips after clearing
```

---

## PR #11: Keyboard Shortcuts Enhancement

**Branch:** `feature/keyboard-shortcuts`  
**Estimated Time:** 1 hour  
**Merge Target:** `main`  
**Depends On:** PR #10

### Subtasks:

#### Additional Shortcuts
- [ ] ⬜ Add Arrow Left/Right for seeking:
  - [ ] Left: Seek backward 5 seconds
  - [ ] Right: Seek forward 5 seconds
- [ ] ⬜ Add J/K/L for playback control:
  - [ ] J: Rewind
  - [ ] K: Play/Pause
  - [ ] L: Fast forward
- [ ] ⬜ Add I/O for trim points:
  - [ ] I: Set in-point
  - [ ] O: Set out-point

#### Keyboard Shortcuts Help Modal
- [ ] ⬜ Create keyboard shortcuts help button (? icon)
- [ ] ⬜ Create modal/overlay showing all shortcuts
- [ ] ⬜ List all shortcuts with descriptions:
  - [ ] Spacebar: Play/Pause
  - [ ] Delete/Backspace: Remove selected clip
  - [ ] Arrow Keys: Seek backward/forward
  - [ ] J/K/L: Rewind/Pause/Fast-forward
  - [ ] I/O: Set in/out points
- [ ] ⬜ Style modal clearly (dark overlay, centered content)
- [ ] ⬜ Close on click outside or ESC key

#### Visual Indicators
- [ ] ⬜ Add keyboard hint text below video player
- [ ] ⬜ Update hint text dynamically based on context
- [ ] ⬜ Style hints subtly (gray text, small font)

#### Testing
- [ ] ⬜ Test: Press Arrow Left → seeks backward
- [ ] ⬜ Test: Press Arrow Right → seeks forward
- [ ] ⬜ Test: Press K → toggles play/pause
- [ ] ⬜ Test: Press I → sets in-point
- [ ] ⬜ Test: Press O → sets out-point
- [ ] ⬜ Test: Click ? → help modal opens
- [ ] ⬜ Test: Press ESC → modal closes
- [ ] ⬜ Commit: "feat: add advanced keyboard shortcuts"

**PR Description Template:**
```
## Summary
Enhanced keyboard shortcuts with help modal.

## Changes
- Arrow keys for seeking
- J/K/L for playback control
- I/O for trim points
- Keyboard shortcuts help modal
- Visual hint indicators

## Testing
- [x] All shortcuts work
- [x] Help modal displays correctly
- [x] No conflicts with text inputs
- [x] Visual hints display
```

---

## PR #12: Error Handling & Polish

**Branch:** `feature/error-handling`  
**Estimated Time:** 2-3 hours  
**Merge Target:** `main`  
**Depends On:** PR #11

### Subtasks:

#### Comprehensive Error Handling
- [ ] ⬜ Add try-catch to all `invoke()` calls
- [ ] ⬜ Create error state: `const [error, setError] = useState(null)`
- [ ] ⬜ Create error display component (banner or toast)
- [ ] ⬜ Style error messages clearly (red background, white text)
- [ ] ⬜ Auto-dismiss errors after 5 seconds (with manual dismiss option)

#### Loading States
- [ ] ⬜ Add loading state during metadata extraction
- [ ] ⬜ Show spinner during file import
- [ ] ⬜ Show spinner during export
- [ ] ⬜ Disable relevant buttons during async operations
- [ ] ⬜ Create reusable `LoadingSpinner` component

#### Edge Case Handling
- [ ] ⬜ No clips on timeline → disable export button
- [ ] ⬜ Invalid trim points → show validation error
- [ ] ⬜ FFmpeg binary missing → show setup instructions
- [ ] ⬜ Disk space check before export (optional)
- [ ] ⬜ Handle very short clips (<0.1s)
- [ ] ⬜ Handle very long clips (>2 hours)

#### User Feedback Improvements
- [ ] ⬜ Success toast after export: "Video exported successfully!"
- [ ] ⬜ Success toast after import: "N clips imported"
- [ ] ⬜ Confirmation before destructive actions
- [ ] ⬜ Progress indicators for all async operations
- [ ] ⬜ Tooltips on buttons (optional, using `title` attribute)

#### Testing
- [ ] ⬜ Test: All error scenarios show clear messages
- [ ] ⬜ Test: Loading states display correctly
- [ ] ⬜ Test: Edge cases handled gracefully
- [ ] ⬜ Test: Success messages appear
- [ ] ⬜ Test: No crashes during error conditions
- [ ] ⬜ Commit: "feat: comprehensive error handling and polish"

**PR Description Template:**
```
## Summary
Comprehensive error handling and user feedback improvements.

## Changes
- Error display component with auto-dismiss
- Loading states for all async operations
- Edge case handling
- Success notifications
- Button disable states
- Tooltips and help text

## Testing
- [x] All errors display clearly
- [x] Loading states work
- [x] Edge cases handled
- [x] User feedback is clear
- [x] No crashes
```

---

## PR #13: Mac Packaging

**Branch:** `feature/mac-packaging`  
**Estimated Time:** 2-3 hours  
**Merge Target:** `main`  
**Depends On:** PR #12

### Subtasks:

#### Package Configuration
- [ ] ⬜ Verify `tauri.conf.json` bundle settings:
  - [ ] App name: "ClipForge"
  - [ ] Version: "0.1.0"
  - [ ] Identifier: "com.clipforge.app"
  - [ ] Description
  - [ ] Author
- [ ] ⬜ Ensure FFmpeg binaries are in `externalBin` config
- [ ] ⬜ Add app icons (optional for MVP):
  - [ ] icons/32x32.png
  - [ ] icons/128x128.png
  - [ ] icons/128x128@2x.png
  - [ ] icons/icon.icns

#### Build Process
- [ ] ⬜ Run `cargo tauri build` on Mac
- [ ] ⬜ Monitor build output for errors
- [ ] ⬜ Locate built .dmg in `src-tauri/target/release/bundle/dmg/`
- [ ] ⬜ Verify .app bundle also created
- [ ] ⬜ Check file size (should be <100MB with FFmpeg)

#### Installation Testing
- [ ] ⬜ Mount .dmg file
- [ ] ⬜ Drag app to Applications folder
- [ ] ⬜ Launch app from Applications
- [ ] ⬜ Verify app signature (optional: code signing)
- [ ] ⬜ Test on clean Mac (without dev tools)

#### Feature Testing in Packaged App
- [ ] ⬜ Test: Import video via file picker
- [ ] ⬜ Test: Drag & drop import
- [ ] ⬜ Test: Timeline displays correctly
- [ ] ⬜ Test: Video playback works
- [ ] ⬜ Test: Trim functionality
- [ ] ⬜ Test: Export single clip
- [ ] ⬜ Test: Export multiple clips
- [ ] ⬜ Test: Keyboard shortcuts
- [ ] ⬜ Verify FFmpeg binary is bundled and accessible

#### Cross-Platform Path Testing
- [ ] ⬜ Test with video files in different directories
- [ ] ⬜ Test with special characters in filenames
- [ ] ⬜ Test with spaces in paths
- [ ] ⬜ Verify exported files save correctly

#### Testing
- [ ] ⬜ Test: .dmg installs without warnings
- [ ] ⬜ Test: App launches from Applications folder
- [ ] ⬜ Test: All features work in packaged form
- [ ] ⬜ Test: FFmpeg binary executes correctly
- [ ] ⬜ Test: No dev-mode-only issues
- [ ] ⬜ Commit: "feat: Mac packaging configuration"

**PR Description Template:**
```
## Summary
Complete Mac packaging with .dmg installer.

## Changes
- Configured bundle settings in tauri.conf.json
- Built production .dmg installer
- Verified FFmpeg binary bundling
- Tested all features in packaged app
- Cross-platform path handling verified

## Testing
- [x] .dmg installs cleanly
- [x] App launches without dev tools
- [x] All features functional
- [x] FFmpeg works in packaged app
- [x] File paths handled correctly
```

---

## PR #14: Windows Build & GitHub Actions

**Branch:** `feature/windows-build`  
**Estimated Time:** 2-3 hours  
**Merge Target:** `main`  
**Depends On:** PR #13

### Subtasks:

#### GitHub Actions Workflow
- [ ] ⬜ Create `.github/workflows/build.yml`
- [ ] ⬜ Configure workflow trigger:
  - [ ] On push to main
  - [ ] On pull request to main
  - [ ] Manual workflow_dispatch
- [ ] ⬜ Set up build matrix:
  ```yaml
  strategy:
    matrix:
      platform: [macos-latest, windows-latest]
  ```
- [ ] ⬜ Add checkout step: `actions/checkout@v3`
- [ ] ⬜ Add Node.js setup: `actions/setup-node@v3` with version 18
- [ ] ⬜ Add Rust setup: `dtolnay/rust-toolchain@stable`
- [ ] ⬜ Add pnpm/npm install step
- [ ] ⬜ Add Tauri dependencies install (Linux only, optional)

#### Windows-Specific Setup
- [ ] ⬜ Download Windows FFmpeg binaries in workflow:
  - [ ] Use curl or wget
  - [ ] Extract to `src-tauri/binaries/`
  - [ ] Or: commit binaries to repo for simplicity
- [ ] ⬜ Ensure binaries have correct names:
  - [ ] ffmpeg.exe
  - [ ] ffprobe.exe

#### Build Step
- [ ] ⬜ Run `npm install` or `pnpm install`
- [ ] ⬜ Run `cargo tauri build`
- [ ] ⬜ Capture build output
- [ ] ⬜ Check for build errors

#### Artifact Upload
- [ ] ⬜ Add upload-artifact step: `actions/upload-artifact@v3`
- [ ] ⬜ Upload Mac .dmg:
  - [ ] Path: `src-tauri/target/release/bundle/dmg/*.dmg`
  - [ ] Artifact name: `ClipForge-macOS`
- [ ] ⬜ Upload Windows .exe/.msi:
  - [ ] Path: `src-tauri/target/release/bundle/msi/*.msi` or nsis
  - [ ] Artifact name: `ClipForge-Windows`

#### Testing
- [ ] ⬜ Push to GitHub → workflow triggers
- [ ] ⬜ Monitor workflow in Actions tab
- [ ] ⬜ Verify both Mac and Windows builds complete
- [ ] ⬜ Download Windows artifact
- [ ] ⬜ Test Windows .exe on Windows machine (if available):
  - [ ] App launches
  - [ ] Import works
  - [ ] Timeline works
  - [ ] Export works
- [ ] ⬜ Document any platform-specific issues in README

#### Workflow Optimization
- [ ] ⬜ Add caching for dependencies:
  - [ ] Cargo cache
  - [ ] npm cache
- [ ] ⬜ Add build status badge to README
- [ ] ⬜ Configure workflow to run on tags (for releases)

#### Testing
- [ ] ⬜ Test: Push to GitHub → workflow completes
- [ ] ⬜ Test: Download Mac artifact → verify .dmg
- [ ] ⬜ Test: Download Windows artifact → verify .exe
- [ ] ⬜ Test: Windows app launches (if possible)
- [ ] ⬜ Test: Windows app features work (if possible)
- [ ] ⬜ Commit: "feat: GitHub Actions for cross-platform builds"

**PR Description Template:**
```
## Summary
GitHub Actions workflow for automated Mac and Windows builds.

## Changes
- Created build.yml workflow
- Matrix build for macOS and Windows
- Automated FFmpeg binary handling
- Artifact upload for both platforms
- Dependency caching for faster builds

## Testing
- [x] Workflow triggers on push
- [x] Mac build completes
- [x] Windows build completes
- [x] Artifacts upload correctly
- [x] Downloaded artifacts work
```

---

## PR #15: Documentation & Demo

**Branch:** `feature/documentation`  
**Estimated Time:** 2-3 hours  
**Merge Target:** `main`  
**Depends On:** PR #14

### Subtasks:

#### README Documentation
- [ ] ⬜ Write project overview:
  - [ ] What is ClipForge
  - [ ] Key features
  - [ ] Screenshots (optional)
- [ ] ⬜ Document prerequisites:
  - [ ] Rust (with installation link)
  - [ ] Node.js (with version)
  - [ ] Tauri CLI
  - [ ] FFmpeg (download instructions)
- [ ] ⬜ Write setup instructions:
  - [ ] Clone repository
  - [ ] `npm install`
  - [ ] Download FFmpeg binaries
  - [ ] `cargo tauri dev`
- [ ] ⬜ Write build instructions:
  - [ ] `cargo tauri build`
  - [ ] Location of built packages
- [ ] ⬜ Add troubleshooting section:
  - [ ] FFmpeg not found
  - [ ] Video won't play
  - [ ] Export fails
  - [ ] Common errors
- [ ] ⬜ Add usage guide:
  - [ ] How to import videos
  - [ ] How to trim clips
  - [ ] How to export
  - [ ] Keyboard shortcuts
- [ ] ⬜ Add build status badge
- [ ] ⬜ Add license information

#### Architecture Documentation
- [ ] ⬜ Add architecture diagram (Mermaid) to README
- [ ] ⬜ Document component structure:
  - [ ] React components
  - [ ] Tauri commands
  - [ ] Data flow
- [ ] ⬜ Document Tauri commands (Rust API):
  - [ ] List all commands with parameters
  - [ ] Return types
  - [ ] Error cases
- [ ] ⬜ Explain FFmpeg integration:
  - [ ] How binaries are bundled
  - [ ] How commands are executed
  - [ ] Trimming vs concatenation
- [ ] ⬜ Document clip data structure:
  - [ ] Field descriptions
  - [ ] State management

#### Demo Video
- [ ] ⬜ Plan demo script:
  - [ ] App launch
  - [ ] Import videos (both methods)
  - [ ] Timeline interaction
  - [ ] Trimming
  - [ ] Playback
  - [ ] Export
  - [ ] Show exported video playing
- [ ] ⬜ Record demo video (3-5 minutes):
  - [ ] Use screen recording software
  - [ ] Show all major features
  - [ ] Narrate or add captions
  - [ ] Keep under 5 minutes
- [ ] ⬜ Edit video (trim, add title screen)
- [ ] ⬜ Upload to YouTube or Vimeo
- [ ] ⬜ Set video to public/unlisted
- [ ] ⬜ Add link to README

#### Code Documentation
- [ ] ⬜ Add JSDoc comments to React components
- [ ] ⬜ Add Rust doc comments to commands
- [ ] ⬜ Document complex functions
- [ ] ⬜ Add inline comments for tricky logic

#### GitHub Repository Setup
- [ ] ⬜ Verify README displays correctly
- [ ] ⬜ Add repository description
- [ ] ⬜ Add topics/tags: tauri, video-editor, rust, react
- [ ] ⬜ Create GitHub Release:
  - [ ] Tag: v0.1.0
  - [ ] Title: "ClipForge MVP"
  - [ ] Release notes with feature list
  - [ ] Upload Mac .dmg
  - [ ] Upload Windows .exe
  - [ ] Add download instructions

#### Testing
- [ ] ⬜ Test: README instructions work on clean machine
- [ ] ⬜ Test: Demo video link works
- [ ] ⬜ Test: GitHub Release downloads work
- [ ] ⬜ Test: Architecture diagram renders correctly
- [ ] ⬜ Test: All documentation links are valid
- [ ] ⬜ Commit: "docs: complete documentation and demo video"

**PR Description Template:**
```
## Summary
Complete documentation package with README, architecture docs, and demo video.

## Changes
- Comprehensive README with setup/build instructions
- Architecture documentation with Mermaid diagram
- Troubleshooting guide
- Demo video (3-5 minutes)
- Code documentation (JSDoc, Rust docs)
- GitHub Release with packaged apps

## Testing
- [x] README instructions verified
- [x] Demo video uploaded and linked
- [x] All docs render correctly
- [x] Downloads work from Release
```

---

## PR #16: End-to-End Integration Testing

**Branch:** `feature/e2e-testing`  
**Estimated Time:** 2-3 hours  
**Merge Target:** `main`  
**Depends On:** PR #15

### Subtasks:

#### Test Plan Documentation
- [ ] ⬜ Create `TESTING.md` document
- [ ] ⬜ Document happy path test:
  - [ ] Step-by-step instructions
  - [ ] Expected results at each step
  - [ ] Success criteria
- [ ] ⬜ List all test scenarios from task list
- [ ] ⬜ Create test result template

#### Happy Path Integration Test
- [ ] ⬜ Launch packaged app (not dev mode)
- [ ] ⬜ Import 3 different videos (MP4, MOV mix)
- [ ] ⬜ Verify all clips appear on timeline
- [ ] ⬜ Verify timeline widths are proportional
- [ ] ⬜ Select first clip → verify player loads it
- [ ] ⬜ Play video → verify playhead moves
- [ ] ⬜ Trim first clip:
  - [ ] Set in-point at 5s
  - [ ] Set out-point at 10s
  - [ ] Verify visual indicators
- [ ] ⬜ Repeat trim for other clips
- [ ] ⬜ Export timeline to MP4
- [ ] ⬜ Verify export completes without errors
- [ ] ⬜ Play exported video in VLC
- [ ] ⬜ Verify: All clips present, trims applied, no corruption
- [ ] ⬜ Document results with screenshots

#### Import Tests
- [ ] ⬜ Import single MP4 → verify works
- [ ] ⬜ Import single MOV → verify works
- [ ] ⬜ Import 3 files at once via drag & drop → verify all appear
- [ ] ⬜ Import via file picker → verify works
- [ ] ⬜ Import unsupported format (.txt) → verify error shown
- [ ] ⬜ Import large file (>1GB) → verify works without crash
- [ ] ⬜ Import file with special characters in name → verify works

#### Timeline Tests
- [ ] ⬜ Timeline shows 10+ clips → verify no lag
- [ ] ⬜ Clips displayed in correct order → verify
- [ ] ⬜ Clip widths proportional to duration → verify
- [ ] ⬜ Click clip → verify highlights and loads in player
- [ ] ⬜ Playhead moves during playback → verify sync
- [ ] ⬜ Time ruler displays correctly → verify

#### Player Tests
- [ ] ⬜ Video plays with audio → verify
- [ ] ⬜ Play/pause works → verify
- [ ] ⬜ Video displays at correct aspect ratio → verify
- [ ] ⬜ Switch between clips → verify player updates
- [ ] ⬜ Corrupted file → verify error message shown
- [ ] ⬜ Spacebar toggles play/pause → verify
- [ ] ⬜ Delete key removes selected clip → verify

#### Trim Tests
- [ ] ⬜ Set in-point at 5s → verify preview starts at 5s
- [ ] ⬜ Set out-point at 10s → verify preview ends at 10s
- [ ] ⬜ Set in-point > out-point → verify prevented
- [ ] ⬜ Set out-point beyond duration → verify clamped
- [ ] ⬜ Trim very short segment (<1s) → verify works
- [ ] ⬜ Visual indicators show trim range → verify

#### Export Tests
- [ ] ⬜ Export single clip → verify MP4 created
- [ ] ⬜ Export 3 concatenated clips → verify single MP4 created
- [ ] ⬜ Exported video plays in VLC → verify works
- [ ] ⬜ Exported video plays in QuickTime → verify works
- [ ] ⬜ Exported video plays in Windows Media Player → verify works (if possible)
- [ ] ⬜ Export with no clips → verify error shown
- [ ] ⬜ Export progress spinner shows → verify
- [ ] ⬜ Smart filename generated correctly → verify
- [ ] ⬜ Codec mismatch warning shown → verify (when applicable)

#### Performance Tests
- [ ] ⬜ App with 10+ clips → verify remains responsive
- [ ] ⬜ Scrub through long video (>10 min) → verify no lag
- [ ] ⬜ Export 2-min video → verify completes in <5 minutes
- [ ] ⬜ Leave app open 15+ minutes → verify no memory leaks
- [ ] ⬜ 4K video file → verify preview plays (even if slow)

#### Edge Cases
- [ ] ⬜ Video with no audio track → verify loads and exports
- [ ] ⬜ Vertical video (portrait) → verify displays correctly
- [ ] ⬜ Very short clip (<1s) → verify works
- [ ] ⬜ Very long clip (>1 hour) → verify doesn't crash
- [ ] ⬜ Mix of MP4 and MOV → verify all work together

#### Package Tests
- [ ] ⬜ Mac .dmg installs without warnings → verify
- [ ] ⬜ Mac app launches from Applications folder → verify
- [ ] ⬜ Mac app all features work in packaged form → verify
- [ ] ⬜ Windows .exe launches without errors → verify (if possible)
- [ ] ⬜ Windows app all features work → verify (if possible)
- [ ] ⬜ FFmpeg bundled correctly on both platforms → verify

#### Test Results Documentation
- [ ] ⬜ Record all test results in TESTING.md
- [ ] ⬜ Note any issues found
- [ ] ⬜ Document workarounds or known issues
- [ ] ⬜ Take screenshots of key features working
- [ ] ⬜ Add to demo video if needed

#### Testing
- [ ] ⬜ Complete all tests above
- [ ] ⬜ Document results
- [ ] ⬜ Fix any critical issues found
- [ ] ⬜ Commit: "test: comprehensive end-to-end testing"

**PR Description Template:**
```
## Summary
Complete end-to-end integration testing with documented results.

## Changes
- Created TESTING.md with test plan
- Executed all test scenarios
- Documented results with screenshots
- Fixed critical issues found during testing
- Verified happy path works end-to-end

## Testing Results
- [x] Happy path test passed
- [x] All import methods work
- [x] Timeline functionality verified
- [x] Video player works correctly
- [x] Trim functionality verified
- [x] Export works for single and multiple clips
- [x] Performance targets met
- [x] Edge cases handled
- [x] Packaged apps work on target platforms
```

---

## Final Submission Checklist

**Branch:** `main`  
**Deadline:** Wednesday, October 29th at 10:59 PM CT

### Pre-Submission Verification
- [ ] ⬜ All PRs merged to main
- [ ] ⬜ GitHub repo is public and accessible
- [ ] ⬜ README has clear setup/build instructions
- [ ] ⬜ Demo video link works and video is public/unlisted
- [ ] ⬜ Packaged apps are downloadable from GitHub Releases
- [ ] ⬜ All MVP requirements met (verified against PRD)

### MVP Requirements Checklist
- [ ] ⬜ Desktop app launches (Electron or Tauri) ✓
- [ ] ⬜ Basic video import (drag & drop or file picker for MP4/MOV) ✓
- [ ] ⬜ Simple timeline view showing imported clips ✓
- [ ] ⬜ Video preview player that plays imported clips ✓
- [ ] ⬜ Basic trim functionality (set in/out points on a single clip) ✓
- [ ] ⬜ Export to MP4 (even if just one clip) ✓
- [ ] ⬜ Built and packaged as a native app (not just running in dev mode) ✓

### Full Submission Requirements
- [ ] ⬜ Screen recording features (optional for MVP)
- [ ] ⬜ Webcam recording (optional for MVP)
- [ ] ⬜ Simultaneous screen + webcam (optional for MVP)
- [ ] ⬜ Audio capture (optional for MVP)
- [ ] ⬜ Multiple clips on timeline ✓
- [ ] ⬜ Arrange clips in sequence ✓
- [ ] ⬜ Delete clips from timeline ✓
- [ ] ⬜ Trim clips using in/out points ✓
- [ ] ⬜ Timeline scrubbing ✓
- [ ] ⬜ Playhead moves during playback ✓
- [ ] ⬜ Keyboard shortcuts ✓
- [ ] ⬜ Export timeline to MP4 ✓
- [ ] ⬜ Progress indicator during export ✓

### GitHub Repository Checklist
- [ ] ⬜ Repository created and public
- [ ] ⬜ All code pushed to main branch
- [ ] ⬜ README.md complete with:
  - [ ] Project overview
  - [ ] Features list
  - [ ] Prerequisites
  - [ ] Setup instructions
  - [ ] Build instructions
  - [ ] Troubleshooting guide
  - [ ] Architecture diagram
  - [ ] Demo video link
- [ ] ⬜ GitHub Release created:
  - [ ] Version: v0.1.0 or v1.0.0
  - [ ] Title: "ClipForge MVP" or "ClipForge v1.0"
  - [ ] Release notes with feature list
  - [ ] Mac .dmg attached
  - [ ] Windows .exe attached (or build instructions)
- [ ] ⬜ Build status badge added (if using GitHub Actions)
- [ ] ⬜ License file added (MIT recommended)

### Demo Video Checklist
- [ ] ⬜ Video recorded (3-5 minutes)
- [ ] ⬜ Shows all major features:
  - [ ] App launch
  - [ ] Importing videos (both methods)
  - [ ] Timeline with multiple clips
  - [ ] Trimming clips
  - [ ] Preview playback
  - [ ] Export process
  - [ ] Exported video playing in external player
- [ ] ⬜ Uploaded to YouTube or Vimeo
- [ ] ⬜ Video is public or unlisted
- [ ] ⬜ Link added to README
- [ ] ⬜ Link works and video plays

### Quality Assurance
- [ ] ⬜ No console errors in production build
- [ ] ⬜ No TypeScript/ESLint errors
- [ ] ⬜ All dependencies up to date
- [ ] ⬜ Build completes without warnings
- [ ] ⬜ App launches in under 5 seconds
- [ ] ⬜ All features work as documented
- [ ] ⬜ No critical bugs in packaged app

### Final Testing on Clean Machine
- [ ] ⬜ Download from GitHub Release
- [ ] ⬜ Install on machine without dev tools
- [ ] ⬜ Launch app
- [ ] ⬜ Import videos
- [ ] ⬜ Edit and export
- [ ] ⬜ Verify exported video plays

### Submission
- [ ] ⬜ Submit before deadline: **Wednesday, Oct 29 at 10:59 PM CT**
- [ ] ⬜ Verify submission is complete
- [ ] ⬜ Keep copy of submission link/confirmation

---

## Pull Request Merge Strategy

### Merge Order (Sequential)
1. PR #1: Project Foundation & Setup
2. PR #2: File Validation System
3. PR #3: Video Import System
4. PR #4: Timeline Component
5. PR #5: Video Player Component
6. PR #6: Trim Functionality
7. PR #7: Export System - Single Clip
8. PR #8: Codec Compatibility Check
9. PR #9: Export System - Timeline Concatenation
10. PR #10: Clear Timeline Feature
11. PR #11: Keyboard Shortcuts Enhancement
12. PR #12: Error Handling & Polish
13. PR #13: Mac Packaging
14. PR #14: Windows Build & GitHub Actions
15. PR #15: Documentation & Demo
16. PR #16: End-to-End Integration Testing

### Merge Guidelines
- **Do not merge** until all subtasks are complete
- **Run tests** before merging (manual testing checklist)
- **Update README** as needed in each PR
- **Squash commits** if desired (keep history clean)
- **Delete branch** after merge
- **Tag releases** after major milestones

---

## Time Estimates Summary

| PR # | Feature | Estimated Time | Cumulative |
|------|---------|----------------|------------|
| 1 | Project Foundation | 2-3 hours | 2-3h |
| 2 | File Validation | 2-3 hours | 4-6h |
| 3 | Video Import | 3-4 hours | 7-10h |
| 4 | Timeline | 4-5 hours | 11-15h |
| 5 | Video Player | 3-4 hours | 14-19h |
| 6 | Trim Functionality | 3-4 hours | 17-23h |
| 7 | Export Single Clip | 2-3 hours | 19-26h |
| 8 | Codec Compatibility | 2 hours | 21-28h |
| 9 | Export Timeline | 3-4 hours | 24-32h |
| 10 | Clear Timeline | 1 hour | 25-33h |
| 11 | Keyboard Shortcuts | 1 hour | 26-34h |
| 12 | Error Handling | 2-3 hours | 28-37h |
| 13 | Mac Packaging | 2-3 hours | 30-40h |
| 14 | Windows Build | 2-3 hours | 32-43h |
| 15 | Documentation | 2-3 hours | 34-46h |
| 16 | E2E Testing | 2-3 hours | 36-49h |

**Total Estimated Time:** 36-49 hours

**Recommended Schedule:**
- **Day 1 (Monday):** PR #1-4 (Foundation → Timeline) = 11-15h
- **Day 2 (Tuesday):** PR #5-10 (Player → Export) = 13-18h
- **Day 3 (Wednesday):** PR #11-16 (Polish → Submission) = 12-16h

---

## PR Branch Naming Convention

```
feature/project-setup
feature/file-validation
feature/video-import
feature/timeline
feature/video-player
feature/trim-controls
feature/export-single
feature/codec-compatibility
feature/export-timeline
feature/clear-timeline
feature/keyboard-shortcuts
feature/error-handling
feature/mac-packaging
feature/windows-build
feature/documentation
feature/e2e-testing
```

---

## Git Commit Message Convention

Use conventional commits format:

```
feat: add video import with drag & drop
fix: resolve playhead sync issue
docs: update README with setup instructions
test: add codec compatibility tests
chore: update dependencies
refactor: simplify export logic
style: format code with prettier
perf: optimize timeline rendering
```

---

## Quick Reference: Commands per PR

### PR #1: Setup
```bash
npm create tauri-app@latest
cd clipforge
npm install
cargo tauri dev
```

### PR #3: Import
```bash
# In Rust
cargo add tauri-plugin-dialog
cargo add serde_json
```

### PR #7: Export
```bash
# Test FFmpeg
ffmpeg -i input.mp4 -ss 5 -t 10 -c copy output.mp4
```

### PR #9: Concat
```bash
# Test concat
ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
```

### PR #13: Mac Build
```bash
cargo tauri build
open src-tauri/target/release/bundle/dmg/
```

### PR #14: Windows Build
```bash
# In GitHub Actions
cargo tauri build --target x86_64-pc-windows-msvc
```

---

## Success Criteria per PR

Each PR must meet these criteria before merge:

✅ **All subtasks completed**
✅ **Manual testing passed**
✅ **No console errors**
✅ **Code documented**
✅ **Commit message follows convention**
✅ **PR description filled out**
✅ **Ready for review** (if working with team)

---

## Risk Mitigation

### High-Risk PRs (Test Extra Carefully)
- **PR #3 (Video Import):** File system access, drag & drop
- **PR #7 (Export Single):** FFmpeg integration
- **PR #9 (Export Timeline):** Complex concat logic
- **PR #13 (Mac Packaging):** Binary bundling
- **PR #14 (Windows Build):** Cross-platform builds

### Backup Plans
- If PR blocked → Move to next PR if no dependency
- If FFmpeg fails → Document issue, focus on other features
- If packaging fails → Ship source code with build instructions
- If Windows build fails → Focus on Mac, add Windows post-submission

---

## Daily Checkpoints

### End of Day 1 (Monday)
- [ ] PRs #1-4 merged
- [ ] Can import and display videos
- [ ] Timeline renders correctly
- [ ] Git repo pushed to GitHub

### End of Day 2 (Tuesday - MVP Deadline)
- [ ] PRs #5-10 merged
- [ ] Video player works
- [ ] Trim functionality complete
- [ ] Export works (single + timeline)
- [ ] **MVP REQUIREMENTS MET**

### End of Day 3 (Wednesday - Final Deadline)
- [ ] PRs #11-16 merged
- [ ] All polish complete
- [ ] Documentation done
- [ ] Demo video uploaded
- [ ] GitHub Release created
- [ ] **SUBMITTED BEFORE 10:59 PM CT**

---

## Emergency Shortcuts (If Running Behind)

If you're behind schedule, prioritize in this order:

### Must Have (Cannot skip):
1. ✅ Import videos
2. ✅ Display on timeline
3. ✅ Play video
4. ✅ Basic trim
5. ✅ Export to MP4
6. ✅ Package for Mac

### Should Have (Include if possible):
7. ✅ Drag & drop
8. ✅ Multiple clips
9. ✅ Visual trim indicators
10. ✅ Keyboard shortcuts
11. ✅ Error handling
12. ✅ Demo video

### Nice to Have (Skip if needed):
13. ⚠️ Codec compatibility check
14. ⚠️ Clear timeline button
15. ⚠️ Advanced keyboard shortcuts
16. ⚠️ Windows build

---

## Optional Enhancements (Before Submission)

If you have extra time before the deadline, consider adding:

### PR #17 (Optional): Enhanced UX Features
**Branch:** `feature/ux-enhancements`  
**Estimated Time:** 1-2 hours

- [ ] ⬜ **Remember Last Export Location:**
  - [ ] Store last export directory in localStorage
  - [ ] Pre-populate save dialog with last location
  - [ ] Fallback to user's Videos/Documents folder
- [ ] ⬜ **Display File Size in Metadata:**
  - [ ] Show file size (MB/GB) in timeline clip tooltip
  - [ ] Display in import confirmation
  - [ ] Add to clip info panel (if created)
- [ ] ⬜ **Auto-save Project State (Optional):**
  - [ ] Save clips array to localStorage on change
  - [ ] Restore on app launch with confirmation
  - [ ] Add "Restore Previous Session?" dialog
  - [ ] Clear saved state after successful export

---

## Post-Submission Enhancements (Stretch Goals)

After submission, if you want to continue:

- [ ] Screen recording feature
- [ ] Webcam recording
- [ ] Picture-in-picture mode
- [ ] Timeline zoom in/out
- [ ] Drag to reorder clips
- [ ] Split clip at playhead
- [ ] Undo/redo functionality
- [ ] Text overlays
- [ ] Transitions
- [ ] Audio volume controls
- [ ] Filters and effects
- [ ] Export presets
- [ ] Cloud upload
- [ ] Thumbnail previews on timeline
- [ ] Waveform visualization
- [ ] Multi-track timeline
- [ ] Custom keyboard shortcut configuration

---

## Notes

- This task list is designed for **sequential execution**
- Each PR builds on the previous one
- **Test thoroughly** before merging each PR
- **Commit frequently** within each PR
- Keep PRs **focused and atomic**
- Write **clear commit messages**
- Update **documentation as you go**
- **Don't skip testing** - catch issues early

---

## Contact & Support

If you encounter issues:
1. Check the troubleshooting section in README
2. Review Tauri documentation: https://tauri.app
3. Check FFmpeg documentation: https://ffmpeg.org/documentation.html
4. Search existing GitHub issues in Tauri repo
5. Join Tauri Discord for community support

---

## Final Notes

You have **16 Pull Requests** to complete over **3 days**.

**Average per day:** 5-6 PRs  
**Average time per PR:** 2-3 hours

This is aggressive but achievable with focus and following the task breakdown.

**Remember:**
- Start with PR #1 immediately
- Don't skip subtasks
- Test after each PR
- Commit frequently
- Ask for help if stuck
- **Submit before the deadline**

**You've got this! 🚀**

Good luck with ClipForge!⬜ Test: Import single MP4 via file picker
- [ ] ⬜ Test: Import single MOV via file picker
- [ ] ⬜ Test: Drag & drop 3 files at once → all detected
- [ ] ⬜ Test: Drag & drop shows visual feedback
- [ ] ⬜ Test: Import unsupported format → error shown
- [ ] ⬜ Test: Import 3 videos → all stored in state, logged to console
- [ ] ⬜ Commit: "feat: implement video import with drag & drop"

**PR Description Template:**
```
## Summary
Complete video import system with file picker, drag & drop, and metadata extraction.

## Changes
- File picker dialog with video format filters
- Drag & drop with visual feedback
- FFprobe integration for metadata extraction
- Clip state management with validation
- Support for MP4, MOV, and WebM formats

## Testing
- [x] File picker imports work
- [x] Drag & drop imports work
- [x] Visual feedback during drag
- [x] Metadata extracted correctly
- [x] Multiple files handled
- [x] Error handling works
```

---

## PR #4: Timeline Component

**Branch:** `feature/timeline`  
**Estimated Time:** 4-5 hours  
**Merge Target:** `main`  
**Depends On:** PR #3

### Subtasks:

#### Timeline Structure
- [ ] ⬜ Create `Timeline.jsx` component file
- [ ] ⬜ Create horizontal container:
  - [ ] Height: 100px
  - [ ] overflow-x: auto
  - [ ] Background: #2a2a2a
  - [ ] Border: 1px solid #444
  - [ ] Position: relative (for absolute positioning children)

#### Time Ruler
- [ ] ⬜ Create time ruler subcomponent
- [ ] ⬜ Generate time markers (0s, 5s, 10s, 15s, etc.)
- [ ] ⬜ Position markers at correct pixel positions (5s = 250px for 50px/second)
- [ ] ⬜ Display time labels above ruler
- [ ] ⬜ Style ruler with border-bottom separator
- [ ] ⬜ Make ruler sticky or fixed at top of timeline

#### Clip Visualization
- [ ] ⬜ Map over `clips` array to render clip divs
- [ ] ⬜ Calculate clip width: `clip.duration * 50` (50px per second)
- [ ] ⬜ Calculate clip startPosition: sum of all previous clips' durations
- [ ] ⬜ Position clips using: `left: ${startPosition * 50}px`, `position: absolute`
- [ ] ⬜ Style clips:
  - [ ] Background: #3a7bc8 (default) / #4a90e2 (selected)
  - [ ] Border: 2px solid #fff
  - [ ] Height: 80px
  - [ ] Padding: 5px
  - [ ] Border-radius: 4px
- [ ] ⬜ Display clip filename inside rectangle:
  - [ ] fontSize: 12px
  - [ ] overflow: hidden
  - [ ] text-overflow: ellipsis
  - [ ] white-space: nowrap

#### Playhead
- [ ] ⬜ Create playhead div (vertical red line)
- [ ] ⬜ Style playhead:
  - [ ] Width: 2px
  - [ ] Height: 100%
  - [ ] Background: red
  - [ ] Position: absolute
  - [ ] z-index: 10
  - [ ] pointer-events: none
- [ ] ⬜ Add state: `const [playheadPosition, setPlayheadPosition] = useState(0)`
- [ ] ⬜ Position playhead dynamically: `left: ${playheadPosition * 50}px`
- [ ] ⬜ Add playhead handle at top (optional: draggable circle)

#### Clip Selection
- [ ] ⬜ Add onClick handler to clip divs: `handleClipSelect(clip.id)`
- [ ] ⬜ Create state: `const [selectedClipId, setSelectedClipId] = useState(null)`
- [ ] ⬜ Highlight selected clip (brighter blue background)
- [ ] ⬜ Add visual indicator (thicker border or glow effect)
- [ ] ⬜ Call `onClipSelect` prop to notify parent component

#### Clip Deletion
- [ ] ⬜ Add delete button (×) to top-right of each clip
- [ ] ⬜ Style delete button:
  - [ ] Width: 20px, Height: 20px
  - [ ] Background: red
  - [ ] Color: white
  - [ ] Position: absolute, top: 2px, right: 2px
  - [ ] Border-radius: 3px
  - [ ] Cursor: pointer
  - [ ] z-index: 5
- [ ] ⬜ Implement onClick handler with `e.stopPropagation()`
- [ ] ⬜ Show confirmation dialog: "Delete this clip from timeline?"
- [ ] ⬜ Remove clip from state on confirm
- [ ] ⬜ Clear selectedClipId if deleted clip was selected

#### Timeline Scrubbing
- [ ] ⬜ Add onClick handler to timeline container
- [ ] ⬜ Use `useRef` to get timeline element reference
- [ ] ⬜ Calculate click position using `getBoundingClientRect()`
- [ ] ⬜ Convert pixel position to time: `(clickX - rect.left) / 50`
- [ ] ⬜ Call `onSeek(timePosition)` prop
- [ ] ⬜ Update playhead position
- [ ] ⬜ Seek video player to new position

#### Testing
- [ ] ⬜ Test: Empty timeline shows with dark background
- [ ] ⬜ Test: Import 3 clips (5s, 10s, 15s) → widths are 250px, 500px, 750px
- [ ] ⬜ Test: Clips displayed in correct sequential order
- [ ] ⬜ Test: Set playheadPosition to 5 → line appears at 250px
- [ ] ⬜ Test: Click clip → highlights correctly
- [ ] ⬜ Test: Click × button → confirmation shown → clip removed
- [ ] ⬜ Test: Click timeline at 250px → playhead moves to 5 seconds
- [ ] ⬜ Test: Time ruler shows correct markers
- [ ] ⬜ Commit: "feat: implement timeline with clip visualization"

**PR Description Template:**
```
## Summary
Complete timeline component with clip visualization, playhead, selection, and scrubbing.

## Changes
- Timeline container with time ruler
- Clip visualization with proportional widths
- Playhead indicator synced with playback
- Clip selection and deletion
- Timeline scrubbing (click to seek)
- Visual feedback for all interactions

## Testing
- [x] Timeline renders correctly
- [x] Clips display at correct positions
- [x] Playhead moves during playback
- [x] Clip selection works
- [x] Clip deletion with confirmation works
- [x] Timeline scrubbing seeks video
```

---

## PR #5: Video Player Component

**Branch:** `feature/video-player`  
**Estimated Time:** 3-4 hours  
**Merge Target:** `main`  
**Depends On:** PR #4

### Subtasks:

#### Basic Player Setup
- [ ] ⬜ Create `VideoPlayer.jsx` component file
- [ ] ⬜ Add HTML5 `<video>` element
- [ ] ⬜ Create `useRef` for video element: `const videoRef = useRef(null)`
- [ ] ⬜ Import `convertFileSrc` from Tauri
- [ ] ⬜ Convert clip path to video src: `convertFileSrc(currentClip.path)`
- [ ] ⬜ Style video element:
  - [ ] Width: 100%
  - [ ] Max-height: 500px
  - [ ] Background: #000
  - [ ] Object-fit: contain

#### Playback Controls
- [ ] ⬜ Create state: `const [isPlaying, setIsPlaying] = useState(false)`
- [ ] ⬜ Create play/pause toggle function:
  - [ ] Check `videoRef.current.paused`
  - [ ] Call `.play()` or `.pause()`
  - [ ] Update `isPlaying` state
- [ ] ⬜ Create play/pause button with dynamic label
- [ ] ⬜ Style control buttons:
  - [ ] Padding: 10px 20px
  - [ ] Background: #4a90e2
  - [ ] Color: white
  - [ ] Border: none
  - [ ] Border-radius: 5px
  - [ ] Cursor: pointer

#### Time Display
- [ ] ⬜ Display current time: `videoRef.current?.currentTime.toFixed(2)`
- [ ] ⬜ Display total duration: `currentClip.duration.toFixed(2)`
- [ ] ⬜ Format as: "0.00s / 10.00s"
- [ ] ⬜ Update display in real-time during playback

#### Keyboard Shortcuts
- [ ] ⬜ Add global keydown event listener with `useEffect`
- [ ] ⬜ Implement Spacebar handler:
  - [ ] Prevent default browser behavior
  - [ ] Toggle play/pause
  - [ ] Check if target is input/textarea (skip if typing)
- [ ] ⬜ Implement Delete/Backspace handler:
  - [ ] Prevent default browser behavior
  - [ ] Call `onDeleteClip(currentClip.id)` if clip exists
  - [ ] Check if target is input/textarea (skip if typing)
- [ ] ⬜ Display keyboard hints in UI:
  - [ ] "Spacebar: Play/Pause"
  - [ ] "Delete: Remove Clip"
- [ ] ⬜ Cleanup event listener on unmount

#### Playhead Synchronization
- [ ] ⬜ Add `onTimeUpdate` event handler to video element
- [ ] ⬜ Get `currentTime` from video element
- [ ] ⬜ Calculate absolute timeline position (account for clip start offset)
- [ ] ⬜ Call `onTimeUpdate(position)` prop to update parent state
- [ ] ⬜ Ensure smooth playhead movement (throttle if needed)

#### Clip Switching
- [ ] ⬜ Add `useEffect` to watch for `currentClip` changes
- [ ] ⬜ On clip change:
  - [ ] Pause video
  - [ ] Reset `isPlaying` to false
  - [ ] Seek to clip's `inPoint`
  - [ ] Update video src
- [ ] ⬜ Handle case when no clip is selected (show placeholder)

#### Error Handling
- [ ] ⬜ Add `onError` event handler to video element
- [ ] ⬜ Create error state: `const [error, setError] = useState(null)`
- [ ] ⬜ Display error message in UI if video fails to load
- [ ] ⬜ Log error details to console for debugging
- [ ] ⬜ Add `onEnded` handler to reset `isPlaying` when video finishes

#### Testing
- [ ] ⬜ Test: Load video → video frame displays
- [ ] ⬜ Test: Click play → video plays with audio
- [ ] ⬜ Test: Click pause → video stops
- [ ] ⬜ Test: Press Spacebar → video toggles play/pause
- [ ] ⬜ Test: Select clip, press Delete → confirmation shown
- [ ] ⬜ Test: Video plays → playhead moves on timeline
- [ ] ⬜ Test: Switch clips → player updates correctly
- [ ] ⬜ Test: Load corrupted file → error message shown
- [ ] ⬜ Commit: "feat: implement video player with keyboard shortcuts"

**PR Description Template:**
```
## Summary
Complete video player with playback controls, keyboard shortcuts, and playhead sync.

## Changes
- HTML5 video player with play/pause controls
- Spacebar for play/pause toggle
- Delete key for clip removal
- Real-time playhead synchronization
- Clip switching support
- Error handling for failed loads

## Testing
- [x] Video playback works
- [x] Keyboard shortcuts functional
- [x] Playhead syncs with video
- [x] Clip switching works
- [x] Error handling displays messages
```

---

## PR #6: Trim Functionality

**Branch:** `feature/trim-controls`  
**Estimated Time:** 3-4 hours  
**Merge Target:** `main`  
**Depends On:** PR #5

### Subtasks:

#### Trim Controls UI
- [ ] ⬜ Create `TrimControls.jsx` component file
- [ ] ⬜ Add two number inputs:
  - [ ] "In Point (seconds)"
  - [ ] "Out Point (seconds)"
- [ ] ⬜ Style inputs with clear labels
- [ ] ⬜ Add two buttons:
  - [ ] "Set In Point" (sets to current video time)
  - [ ] "Set Out Point" (sets to current video time)
- [ ] ⬜ Display current trim range below inputs:
  - [ ] "Trim Range: 5.00s → 10.00s (5.00s duration)"
- [ ] ⬜ Group controls visually (border, background color)
- [ ] ⬜ Disable controls if no clip is selected

#### Trim Logic
- [ ] ⬜ Create "Set In Point" button handler:
  - [ ] Get current video time: `videoRef.current.currentTime`
  - [ ] Update clip's `inPoint` in state
  - [ ] Call `onTrimChange(clipId, inPoint, outPoint)` prop
- [ ] ⬜ Create "Set Out Point" button handler:
  - [ ] Get current video time: `videoRef.current.currentTime`
  - [ ] Update clip's `outPoint` in state
  - [ ] Call `onTrimChange(clipId, inPoint, outPoint)` prop
- [ ] ⬜ Implement validation:
  - [ ] Ensure `inPoint < outPoint`
  - [ ] Show error if invalid range
  - [ ] Require minimum 0.1s between points
- [ ] ⬜ Implement clamping:
  - [ ] `inPoint` >= 0
  - [ ] `outPoint` <= clip.duration
  - [ ] Clamp on input change

#### Manual Input Handling
- [ ] ⬜ Add onChange handlers to number inputs
- [ ] ⬜ Validate input values:
  - [ ] Must be numbers
  - [ ] Must be within clip duration
  - [ ] inPoint < outPoint
- [ ] ⬜ Update clip state on valid input
- [ ] ⬜ Show validation errors inline

#### Trim Preview
- [ ] ⬜ When in-point changes, seek video to in-point
- [ ] ⬜ When out-point changes, optionally seek to out-point
- [ ] ⬜ Update player controls to show trim range
- [ ] ⬜ Optionally: Restrict playback to trimmed range (loop between in/out)

#### Visual Trim Indicators
- [ ] ⬜ Add semi-transparent overlay divs on timeline
- [ ] ⬜ Grey out portion before in-point:
  - [ ] Left: 0
  - [ ] Width: `inPoint * 50px`
  - [ ] Background: rgba(0,0,0,0.6)
- [ ] ⬜ Grey out portion after out-point:
  - [ ] Left: `outPoint * 50px`
  - [ ] Width: `(duration - outPoint) * 50px`
  - [ ] Background: rgba(0,0,0,0.6)
- [ ] ⬜ Add trim handle markers:
  - [ ] Small vertical bars at in/out points
  - [ ] Color: green (in) and red (out)
  - [ ] Height: 100%

#### Testing
- [ ] ⬜ Test: Play to 5s → click "Set In Point" → value updates to 5.0
- [ ] ⬜ Test: Play to 10s → click "Set Out Point" → value updates to 10.0
- [ ] ⬜ Test: Set in-point at 5s → preview jumps to 5s
- [ ] ⬜ Test: Set in-point > out-point → validation error shown
- [ ] ⬜ Test: Set out-point beyond duration → clamped to max
- [ ] ⬜ Test: Trim very short segment (<1s) → works without errors
- [ ] ⬜ Test: Visual indicators show trim range on timeline
- [ ] ⬜ Test: Manual input of trim points → updates correctly
- [ ] ⬜ Commit: "feat: implement trim functionality with visual indicators"

**PR Description Template:**
```
## Summary
Complete trim functionality with visual indicators and validation.

## Changes
- Trim controls UI with in/out point inputs
- Set in/out point buttons using current video time
- Manual trim point input with validation
- Visual indicators on timeline (greyed out regions)
- Trim handles for precise visual feedback
- Preview jumps to trim points

## Testing
- [x] Set in/out points via buttons
- [x] Manual input works with validation
- [x] Visual indicators display correctly
- [x] Preview seeks to trim points
- [x] Edge cases handled (invalid ranges, clamping)
```

---

## PR #7: Export System - Single Clip

**Branch:** `feature/export-single`  
**Estimated Time:** 2-3 hours  
**Merge Target:** `main`  
**Depends On:** PR #6

### Subtasks:

#### Export UI
- [ ] ⬜ Create `ExportButton.jsx` component file
- [ ] ⬜ Create "Export Video" button
- [ ] ⬜ Style button prominently (different color, larger size)
- [ ] ⬜ Disable button if no clips on timeline
- [ ] ⬜ Add export state: `const [isExporting, setIsExporting] = useState(false)`
- [ ] ⬜ Show loading spinner when exporting
- [ ] ⬜ Display "Exporting..." message
- [ ] ⬜ Disable button during export

#### Save Dialog
- [ ] ⬜ Create Rust command: `select_export_path(defaultFilename: String)`
- [ ] ⬜ Use `FileDialogBuilder` with save file mode
- [ ] ⬜ Add filter for MP4 only
- [ ] ⬜ Set default filename from parameter
- [ ] ⬜ Return selected path or None if cancelled

#### Smart Filename Generation
- [ ] ⬜ Create function: `generateDefaultFilename(clips[])`
- [ ] ⬜ Extract first clip's filename (remove extension)
- [ ] ⬜ Add timestamp: `YYYY-MM-DD` format
- [ ] ⬜ Format: `{firstName}-edited-{timestamp}.mp4`
- [ ] ⬜ Handle edge cases (no clips, special characters)
- [ ] ⬜ Fallback to: `clipforge-export-{timestamp}.mp4`

#### Single Clip Export Command
- [ ] ⬜ Create Rust command: `export_single_clip`
- [ ] ⬜ Parameters:
  - [ ] `input_path: String`
  - [ ] `output_path: String`
  - [ ] `in_point: f64`
  - [ ] `out_point: f64`
- [ ] ⬜ Calculate duration: `out_point - in_point`
- [ ] ⬜ Resolve FFmpeg binary path using `app_handle.path_resolver()`
- [ ] ⬜ Build FFmpeg command:
  - [ ] `-i input_path`
  - [ ] `-ss in_point`
  - [ ] `-t duration`
  - [ ] `-c copy` (no re-encode)
  - [ ] `output_path`
- [ ] ⬜ Execute FFmpeg using `Command::new()`
- [ ] ⬜ Capture stdout and stderr
- [ ] ⬜ Return Result<String, String>

#### Error Handling
- [ ] ⬜ Wrap FFmpeg execution in try-catch
- [ ] ⬜ Parse stderr for common errors:
  - [ ] "No such file" → "Video file not found"
  - [ ] "Invalid data" → "Video file corrupted"
  - [ ] "Disk full" → "Not enough disk space"
- [ ] ⬜ Return user-friendly error messages
- [ ] ⬜ Display errors in React with alert or toast
- [ ] ⬜ Log full stderr to console for debugging

#### Export Flow (Single Clip)
- [ ] ⬜ In React: Check if `clips.length === 1`
- [ ] ⬜ Generate default filename
- [ ] ⬜ Call `select_export_path()` with filename
- [ ] ⬜ If user cancels, return early
- [ ] ⬜ Set `isExporting = true`
- [ ] ⬜ Call `export_single_clip()` with clip data
- [ ] ⬜ On success: Show success message
- [ ] ⬜ On error: Display error message
- [ ] ⬜ Set `isExporting = false` in finally block

#### Testing
- [ ] ⬜ Test: Export trimmed clip → MP4 file created
- [ ] ⬜ Test: Exported video plays in VLC
- [ ] ⬜ Test: Exported video plays in QuickTime
- [ ] ⬜ Test: Export with no clips → error shown
- [ ] ⬜ Test: Export progress spinner shows
- [ ] ⬜ Test: Smart filename generated correctly
- [ ] ⬜ Test: Cancel save dialog → export cancelled cleanly
- [ ] ⬜ Test: FFmpeg error → user-friendly message shown
- [ ] ⬜ Commit: "feat: implement single clip export"

**PR Description Template:**
```
## Summary
Single clip export functionality with trim support.

## Changes
- Export button with loading state
- Save file dialog with smart filename generation
- FFmpeg integration for clip trimming
- Fast export using `-c copy` (no re-encode)
- Comprehensive error handling
- Success/failure notifications

## Testing
- [x] Single clip exports correctly
- [x] Trim points applied
- [x] Smart filename works
- [x] Exported video plays
- [x] Error handling works
```

---

## PR #8: Codec Compatibility Check

**Branch:** `feature/codec-compatibility`  
**Estimated Time:** 2 hours  
**Merge Target:** `main`  
**Depends On:** PR #7

### Subtasks:

#### Codec Comparison Command
- [ ] ⬜ Create Rust command: `check_codec_compatibility(clip_paths: Vec<String>)`
- [ ] ⬜ Extract codec from each clip using FFprobe:
  - [ ] Use `-show_entries stream=codec_name`
  - [ ] Parse JSON output
  - [ ] Get video stream codec
- [ ] ⬜ Compare all codecs for consistency
- [ ] ⬜ Return Ok if all match
- [ ] ⬜ Return Err with warning if mismatch:
  - [ ] "Clips have different codecs (H.264, HEVC). Export may fail or require re-encoding."
  - [ ] List unique codecs found

#### React Integration
- [ ] ⬜ In `ExportButton`, before export:
  - [ ] Get all clip paths from clips array
  - [ ] Call `check_codec_compatibility(clipPaths)`
  - [ ] Wrap in try-catch
- [ ] ⬜ If warning returned:
  - [ ] Show confirmation dialog with warning message
  - [ ] Options: "Continue Anyway" or "Cancel"
  - [ ] Proceed only if user confirms
- [ ] ⬜ If error thrown:
  - [ ] Display error message
  - [ ] Cancel export

#### Testing
- [ ] 