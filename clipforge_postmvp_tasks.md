- [ ] ⬜ Test: Export with Instagram preset → 1080x1080 square video, correct bitrate
- [ ] ⬜ **Success Criteria:** Platform presets produce correctly formatted videos

### Real-Time Export Progress (2-3 hours)

- [ ] ⬜ Modify export Tauri command to use `-progress pipe:1` FFmpeg flag
- [ ] ⬜ Spawn FFmpeg with stdout piped: `.stdout(Stdio::piped())`
- [ ] ⬜ Read stdout line-by-line in real-time using BufReader
- [ ] ⬜ Parse FFmpeg progress output:
  ```rust
  if line.starts_with("out_time_ms=") {
    let time_ms: f64 = line.split('=').nth(1).unwrap().parse().unwrap();
    let current_seconds = time_ms / 1_000_000.0;
    let percentage = (current_seconds / total_duration * 100.0).min(100.0);
  }
  ```
- [ ] ⬜ Emit progress events to frontend:
  ```rust
  app_handle.emit_all("export-progress", ExportProgress {
    percentage,
    current_time,
    total_time
  }).ok();
  ```
- [ ] ⬜ In React: Listen for progress events, update progress bar
- [ ] ⬜ Calculate estimated time remaining:
  ```javascript
  const elapsed = (Date.now() - startTime) / 1000;
  const estimatedTotal = (elapsed / percentage) * 100;
  const remaining = estimatedTotal - elapsed;
  ```
- [ ] ⬜ Add "Cancel Export" button → kills FFmpeg process
- [ ] ⬜ **Implementation Hint:** Store process ID globally in Rust, kill on cancel
- [ ] ⬜ **Success Criteria:** Progress bar updates in real-time, ETA is reasonably accurate

---

## PHASE 5: Project Management

**Total Estimated Time:** 8-10 hours

### Save/Load Project (3-4 hours)

- [ ] ⬜ Define project file format (JSON):
  ```json
  {
    "version": "1.0.0",
    "projectName": "My Video",
    "createdAt": "2025-10-28T12:00:00Z",
    "lastModified": "2025-10-28T14:30:00Z",
    "timeline": {
      "mainTrack": [...],
      "overlayTrack": [...]
    },
    "transitions": [...],
    "textOverlays": [...],
    "settings": {...}
  }
  ```
- [ ] ⬜ Create Rust commands:
  - `save_project(projectData: ClipForgeProject, filePath: String)`
  - `load_project(filePath: String) -> ClipForgeProject`
  - `select_project_save_path(defaultName: String) -> String`
  - `select_project_open_path() -> String`
- [ ] ⬜ Implement save: Serialize project to JSON using serde_json
- [ ] ⬜ Implement load: Parse JSON and validate structure
- [ ] ⬜ Add error handling: Invalid JSON, missing fields, version mismatch
- [ ] ⬜ Create `ProjectMenu.jsx` component with buttons:
  - New Project
  - Open Project
  - Save (disabled if no changes)
  - Save As
- [ ] ⬜ Track "unsaved changes" state using useEffect
- [ ] ⬜ Show "*" indicator in title if unsaved changes exist
- [ ] ⬜ Warn before closing app with unsaved changes
- [ ] ⬜ Test: Save project → close app → reopen → load project → all data restored
- [ ] ⬜ **Success Criteria:** Can save and load complete project state including all tracks, effects, transitions

### Auto-Save (2 hours)

- [ ] ⬜ Create auto-save directory: `~/Library/Application Support/ClipForge/`
- [ ] ⬜ Create Tauri command: `get_autosave_path() -> String`
  - Returns: `~/Library/Application Support/ClipForge/autosave.clipforge`
- [ ] ⬜ Create Tauri command: `check_file_exists(path: String) -> bool`
- [ ] ⬜ Create Tauri command: `delete_file(path: String)`
- [ ] ⬜ Create `AutoSave.jsx` component (no UI, runs in background)
- [ ] ⬜ Use setInterval to auto-save every 2 minutes (configurable):
  ```javascript
  useEffect(() => {
    const interval = setInterval(async () => {
      await invoke('save_project', {
        projectData: projectState,
        filePath: AUTOSAVE_PATH
      });
      console.log('Auto-saved');
    }, 120000);  // 2 minutes
    
    return () => clearInterval(interval);
  }, [projectState]);
  ```
- [ ] ⬜ On app launch: Check for autosave file
- [ ] ⬜ If exists: Show dialog "Restore previous session?"
- [ ] ⬜ If yes: Load autosave, delete file after load
- [ ] ⬜ If no: Delete autosave file
- [ ] ⬜ On successful manual save: Delete autosave file
- [ ] ⬜ Test: Make changes → wait 2 min → check autosave file exists → crash app → relaunch → restore prompt appears
- [ ] ⬜ **Success Criteria:** Auto-save runs silently, can restore after crash

### Undo/Redo System (3-4 hours)

- [ ] ⬜ Create `useUndoRedo.js` hook
- [ ] ⬜ Implement history tracking:
  ```javascript
  const [past, setPast] = useState([]);  // Array of previous states
  const [present, setPresent] = useState(initialState);
  const [future, setFuture] = useState([]);  // For redo
  ```
- [ ] ⬜ Create setState function that records history:
  ```javascript
  const setState = (newState, actionName) => {
    setPast(prev => [...prev.slice(-49), { state: present, action: actionName }]);
    setPresent(newState);
    setFuture([]);  // Clear redo stack
  };
  ```
- [ ] ⬜ Implement undo function:
  ```javascript
  const undo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(prev => prev.slice(0, -1));
    setFuture(prev => [{ state: present, action: previous.action }, ...prev]);
    setPresent(previous.state);
  };
  ```
- [ ] ⬜ Implement redo function (reverse of undo)
- [ ] ⬜ Add keyboard shortcuts: Cmd+Z (undo), Cmd+Shift+Z (redo)
- [ ] ⬜ Add undo/redo buttons in UI, disable when stack is empty
- [ ] ⬜ Update all state-modifying actions to use setState with action name:
  - `setState(newState, 'Add Clip')`
  - `setState(newState, 'Delete Clip')`
  - `setState(newState, 'Trim Clip')`
  - etc.
- [ ] ⬜ Test: Add clip → undo → clip disappears → redo → clip reappears
- [ ] ⬜ Test: 50+ actions → undo 50 times → works → undo 51st time → nothing happens
- [ ] ⬜ **Success Criteria:** All actions are undoable/redoable, 50-level history limit enforced

---

## PHASE 6: Cloud Upload (Nice-to-Have)

**Total Estimated Time:** 6-8 hours

### Google OAuth Setup (2 hours)

- [ ] ⬜ Create Google Cloud Console project
- [ ] ⬜ Enable Google Drive API
- [ ] ⬜ Create OAuth 2.0 credentials (Desktop app)
- [ ] ⬜ Configure redirect URI: `http://localhost:8000/oauth/callback`
- [ ] ⬜ Download client credentials JSON
- [ ] ⬜ Add OAuth dependencies to Cargo.toml: `oauth2`, `reqwest`, `tokio`
- [ ] ⬜ Store client ID and secret securely (environment variables or config file)
- [ ] ⬜ **Implementation Hint:** Don't commit credentials to Git, use .env file

### OAuth Flow Implementation (2-3 hours)

- [ ] ⬜ Create Tauri command: `initiate_google_oauth() -> String`
  - Build OAuth URL with required scopes
  - Scope: `https://www.googleapis.com/auth/drive.file`
  - Open URL in default browser using `open::that()`
  - Return auth URL
- [ ] ⬜ Set up local HTTP server to receive OAuth callback:
  - Listen on `http://localhost:8000/oauth/callback`
  - Extract authorization code from query params
  - Exchange code for access token
  - Store token securely
- [ ] ⬜ Create Tauri command: `get_access_token() -> String`
  - Return stored access token
  - Handle token refresh if expired
- [ ] ⬜ In React: Add "Sign in with Google" button
- [ ] ⬜ On click: Invoke OAuth flow, show "Waiting for authorization..." message
- [ ] ⬜ After successful auth: Enable upload button
- [ ] ⬜ Store authentication state in React
- [ ] ⬜ **Success Criteria:** OAuth flow completes, access token is obtained

### Google Drive Upload (2-3 hours)

- [ ] ⬜ Create Tauri command: `upload_to_google_drive(filePath: String, accessToken: String) -> String`
- [ ] ⬜ Read file as binary: `tokio::fs::read(&file_path).await`
- [ ] ⬜ Use reqwest to upload:
  ```rust
  let response = client
    .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=media")
    .header("Authorization", format!("Bearer {}", access_token))
    .header("Content-Type", "video/mp4")
    .body(file_data)
    .send()
    .await?;
  ```
- [ ] ⬜ Parse response JSON to get file ID
- [ ] ⬜ Create shareable link: Make file publicly accessible
  ```rust
  client
    .post(format!("https://www.googleapis.com/drive/v3/files/{}/permissions", file_id))
    .header("Authorization", format!("Bearer {}", access_token))
    .json(&json!({ "role": "reader", "type": "anyone" }))
    .send()
    .await?;
  ```
- [ ] ⬜ Generate shareable link: `https://drive.google.com/file/d/{file_id}/view`
- [ ] ⬜ Return link to React
- [ ] ⬜ Add upload progress tracking (parse response stream)
- [ ] ⬜ Test: Upload 100MB video → completes successfully → link opens video in Drive
- [ ] ⬜ **Success Criteria:** Can upload video to Google Drive and get shareable link

### Upload UI (1 hour)

- [ ] ⬜ Create `CloudUploadDialog.jsx` component
- [ ] ⬜ Show after successful export (optional step)
- [ ] ⬜ Display upload button (disabled if not authenticated)
- [ ] ⬜ Show "Sign in with Google" button if not authenticated
- [ ] ⬜ During upload: Show progress bar and percentage
- [ ] ⬜ After upload: Display shareable link in read-only input
- [ ] ⬜ Add "Copy Link" button → copies to clipboard
- [ ] ⬜ Add "Open in Drive" button → opens link in browser
- [ ] ⬜ Handle errors: Network failure, quota exceeded, permission denied
- [ ] ⬜ **Success Criteria:** Upload UI is intuitive, link is easily shareable

---

## PHASE 7: Additional Polish

**Total Estimated Time:** 6-8 hours

### Keyboard Shortcuts (2 hours)

- [ ] ⬜ Create `KeyboardShortcutHandler.jsx` component
- [ ] ⬜ Define complete shortcut map (see PRD for full list)
- [ ] ⬜ Implement global keyboard event listener
- [ ] ⬜ Add checks: Don't trigger if typing in input/textarea
- [ ] ⬜ Implement all shortcuts:
  - **Playback:** Space, K, J, L, arrows, Home, End
  - **Editing:** Delete, Backspace, Cmd+C/V/X/D, S, I, O
  - **Timeline:** Cmd+Plus, Cmd+Minus, Cmd+0
  - **Project:** Cmd+N/O/S/Shift+S, Cmd+Z/Shift+Z
  - **Export:** Cmd+E
  - **UI:** Cmd+Comma, Cmd+Slash
- [ ] ⬜ Create "Keyboard Shortcuts" help dialog (Cmd+/)
  - Display all shortcuts in organized table
  - Categories: Playback, Editing, Timeline, Project, Export
- [ ] ⬜ Test: All shortcuts work, don't interfere with typing
- [ ] ⬜ **Success Criteria:** All keyboard shortcuts functional, help dialog is clear

### Timeline Zoom (1-2 hours)

- [ ] ⬜ Add zoom state: `const [zoomLevel, setZoomLevel] = useState(1.0)`
- [ ] ⬜ Update PIXELS_PER_SECOND: `const pxPerSec = 50 * zoomLevel`
- [ ] ⬜ Add zoom controls in timeline header:
  - "-" button (zoom out)
  - "100%" label (current zoom)
  - "+" button (zoom in)
  - "Reset" button
- [ ] ⬜ Implement zoom functions:
  - Zoom in: `setZoomLevel(prev => Math.min(prev * 1.5, 4.0))` (max 400%)
  - Zoom out: `setZoomLevel(prev => Math.max(prev / 1.5, 0.25))` (min 25%)
- [ ] ⬜ Add mouse wheel zoom (with Cmd key held)
- [ ] ⬜ Center zoom around playhead position (adjust scroll after zoom)
- [ ] ⬜ Update all timeline calculations to use zoomLevel
- [ ] ⬜ **Success Criteria:** Can zoom timeline smoothly, all interactions still work

### Snap-to-Edges (1-2 hours)

- [ ] ⬜ Add snap toggle in preferences: `snapEnabled: true`
- [ ] ⬜ Define snap threshold: `const SNAP_THRESHOLD = 0.2` (seconds)
- [ ] ⬜ Create function: `findSnapPosition(draggedClip, proposedPosition)`
  - Get all clip edges (start and end positions)
  - Check if proposedPosition is within threshold of any edge
  - Return snapped position or original position
- [ ] ⬜ Apply snap logic during drag:
  ```javascript
  const handleClipDrag = (clipId, newPosition) => {
    const snappedPos = snapEnabled ? findSnapPosition(clip, newPosition) : newPosition;
    updateClipPosition(clipId, snappedPos);
    
    if (snappedPos !== newPosition) {
      showSnapIndicator();  // Visual feedback
    }
  };
  ```
- [ ] ⬜ Add visual snap indicator (brief flash or border)
- [ ] ⬜ Test: Drag clip near another → snaps when within 0.2s
- [ ] ⬜ **Success Criteria:** Snap feels natural, doesn't interfere with precise positioning

### Preferences Dialog (2-3 hours)

- [ ] ⬜ Create `PreferencesDialog.jsx` component
- [ ] ⬜ Add "Preferences" menu item (Cmd+Comma)
- [ ] ⬜ Build settings sections:
  - **Project:**
    - Auto-save interval (1-10 minutes, dropdown or slider)
  - **Export:**
    - Default resolution (dropdown)
    - Default quality/CRF (slider 18-28)
  - **Timeline:**
    - Snap-to-edges enabled (checkbox)
    - Snap threshold (0.1-0.5s, slider)
  - **Appearance:**
    - Theme (Dark/Light dropdown)
  - **Advanced:**
    - FFmpeg binary path (text input, browse button)
- [ ] ⬜ Create Tauri commands: `save_preferences(settings)`, `load_preferences()`
- [ ] ⬜ Store preferences in: `~/Library/Application Support/ClipForge/preferences.json`
- [ ] ⬜ Load preferences on app launch
- [ ] ⬜ Apply theme changes immediately (CSS variables or class toggle)
- [ ] ⬜ **Success Criteria:** All preferences persist across app restarts

---

## Testing & Quality Assurance

**Estimated Time:** 8-10 hours

### Recording Tests (2 hours)

- [ ] ⬜ Record full screen with system audio → plays correctly
- [ ] ⬜ Record full screen with microphone → audio is clear
- [ ] ⬜ Record specific window → only window is captured
- [ ] ⬜ Record webcam at 1080p → correct resolution
- [ ] ⬜ Record screen + webcam simultaneously → both clips appear on correct tracks
- [ ] ⬜ Recording timer shows accurate time
- [ ] ⬜ Stop recording → processing completes without errors
- [ ] ⬜ Recorded files play in VLC and QuickTime

### Multi-Track Tests (1-2 hours)

- [ ] ⬜ Drag clip from main to overlay → converts to PiP
- [ ] ⬜ Resize PiP by dragging corners → maintains aspect ratio if locked
- [ ] ⬜ Move PiP by dragging → follows cursor
- [ ] ⬜ Position presets work correctly
- [ ] ⬜ Opacity slider affects PiP transparency
- [ ] ⬜ Export with PiP → overlay appears correctly in video
- [ ] ⬜ Multiple PiP clips on timeline → all render correctly

### Effects Tests (2 hours)

- [ ] ⬜ Add text overlay → appears at correct position
- [ ] ⬜ Text with background box → background is visible
- [ ] ⬜ All font presets work
- [ ] ⬜ Export with text → text appears in final video
- [ ] ⬜ Add fade transition between clips → smooth crossfade
- [ ] ⬜ Add wipe transition → correct direction
- [ ] ⬜ Transition duration slider works
- [ ] ⬜ Apply brightness filter → preview updates in real-time
- [ ] ⬜ Apply multiple filters → all render correctly
- [ ] ⬜ Export with filters → filters appear in final video
- [ ] ⬜ Audio fade in/out works
- [ ] ⬜ Volume adjustment works

### Export Tests (1-2 hours)

- [ ] ⬜ Export at 720p → correct resolution
- [ ] ⬜ Export at 4K (upscale from 1080p) → warning shown, video is 4K
- [ ] ⬜ Export with YouTube preset → correct bitrate and settings
- [ ] ⬜ Export with Instagram preset → square 1080x1080
- [ ] ⬜ Export progress bar updates in real-time
- [ ] ⬜ ETA is reasonably accurate
- [ ] ⬜ Cancel export mid-process → FFmpeg stops
- [ ] ⬜ Complex export (PiP + transitions + text + filters) → all elements render

### Project Management Tests (1 hour)

- [ ] ⬜ Save project → .clipforge file created
- [ ] ⬜ Load project → all data restored (clips, effects, transitions, text)
- [ ] ⬜ Auto-save runs every 2 minutes
- [ ] ⬜ Crash app → relaunch → restore prompt appears
- [ ] ⬜ Undo 10 actions → redo 10 actions → state is correct
- [ ] ⬜ Keyboard shortcuts Cmd+Z/Shift+Z work
- [ ] ⬜ 50 level undo limit enforced

### Cloud Upload Tests (1 hour)

- [ ] ⬜ OAuth flow completes successfully
- [ ] ⬜ Upload 100MB video → completes without errors
- [ ] ⬜ Upload progress bar updates
- [ ] ⬜ Shareable link works → opens video in Drive
- [ ] ⬜ Unauthenticated user sees "Sign in" prompt
- [ ] ⬜ Handle upload failure gracefully

### Polish Tests (1 hour)

- [ ] ⬜ All keyboard shortcuts work
- [ ] ⬜ Keyboard shortcut help dialog displays correctly
- [ ] ⬜ Timeline zoom works smoothly
- [ ] ⬜ Mouse wheel zoom works (with Cmd)
- [ ] ⬜ Snap-to-edges works as expected
- [ ] ⬜ Toggle snap off → can position precisely
- [ ] ⬜ Preferences save and load correctly
- [ ] ⬜ Theme changes apply immediately
- [ ] ⬜ All preferences persist across restarts

### Performance Tests (1 hour)

- [ ] ⬜ Timeline with 20+ clips → UI remains responsive
- [ ] ⬜ Timeline with 50+ clips → may be slow but doesn't crash
- [ ] ⬜ Zoom timeline to 400% → rendering is smooth
- [ ] ⬜ Undo/redo 50 times → no noticeable lag
- [ ] ⬜ Export 10-minute video → completes successfully
- [ ] ⬜ App runs for 1+ hour without memory leaks
- [ ] ⬜ Record 30-minute screen capture → doesn't crash

---

## Documentation

**Estimated Time:** 4-6 hours

### README Updates (2 hours)

- [ ] ⬜ Update feature list to include all post-MVP features
- [ ] ⬜ Document recording capabilities:
  - Screen recording (full screen, window selection)
  - Webcam recording
  - Simultaneous screen + webcam
  - Audio options (system, microphone)
- [ ] ⬜ Document multi-track editing and PiP
- [ ] ⬜ Document effects:
  - Text overlays
  - Transitions
  - Filters
  - Audio effects
- [ ] ⬜ Document export options:
  - Resolution selection
  - Platform presets
  - Real-time progress
- [ ] ⬜ Document project management:
  - Save/load projects
  - Auto-save
  - Undo/redo (50 levels)
- [ ] ⬜ Document cloud upload (Google Drive)
- [ ] ⬜ Add keyboard shortcuts reference table
- [ ] ⬜ Update screenshots to show new features

### Demo Video (2-3 hours)

- [ ] ⬜ Script demo video outline (5-7 minutes):
  1. Introduction and app overview
  2. Recording screen + webcam simultaneously
  3. Importing and arranging clips on timeline
  4. Multi-track editing with PiP
  5. Adding text overlays
  6. Applying transitions between clips
  7. Adjusting filters and audio
  8. Exporting with platform preset
  9. Uploading to Google Drive
  10. Showing keyboard shortcuts in action
- [ ] ⬜ Record demo video using ClipForge itself (dogfooding!)
- [ ] ⬜ Add voiceover explaining features
- [ ] ⬜ Add text overlays highlighting key features
- [ ] ⬜ Export at 1080p with YouTube preset
- [ ] ⬜ Upload to YouTube (unlisted or public)
- [ ] ⬜ Add link to README

### User Guide (1 hour)

- [ ] ⬜ Create `GUIDE.md` with sections:
  - Getting Started
  - Recording Videos
  - Multi-Track Editing
  - Adding Effects
  - Exporting Videos
  - Keyboard Shortcuts Reference
  - Troubleshooting
- [ ] ⬜ Include screenshots for each major feature
- [ ] ⬜ Link from main README

---

## Deployment & Release

**Estimated Time:** 3-4 hours

### Build & Package (2 hours)

- [ ] ⬜ Test build on macOS: `cargo tauri build`
- [ ] ⬜ Verify FFmpeg binaries are bundled correctly
- [ ] ⬜ Test packaged .dmg on clean macOS install
- [ ] ⬜ Verify all permissions work (camera, microphone, screen recording)
- [ ] ⬜ Code sign with Apple Developer certificate
- [ ] ⬜ Notarize app for macOS
- [ ] ⬜ Test notarized app on macOS Catalina+

### GitHub Release (1 hour)

- [ ] ⬜ Create Git tag: `v1.0.0`
- [ ] ⬜ Push tag to GitHub
- [ ] ⬜ Create GitHub Release
- [ ] ⬜ Upload .dmg file
- [ ] ⬜ Write release notes highlighting all features
- [ ] ⬜ Include installation instructions
- [ ] ⬜ Link to demo video

### Final Verification (1 hour)

- [ ] ⬜ Download release from GitHub
- [ ] ⬜ Install on fresh macOS machine
- [ ] ⬜ Test all major features:
  - Recording
  - Multi-track editing
  - Effects
  - Export
  - Project save/load
  - Cloud upload
- [ ] ⬜ Verify no crashes or major bugs
- [ ] ⬜ Submit project (if applicable)

---

## Summary

**Total Tasks:** ~280
**Total Estimated Time:** 50-70 hours

**Phase Breakdown:**
- Phase 1 (Recording): 12-15 hours, ~40 tasks
- Phase 2 (Multi-Track): 8-12 hours, ~30 tasks
- Phase 3 (Effects): 12-16 hours, ~45 tasks
- Phase 4 (Export): 6-8 hours, ~20 tasks
- Phase 5 (Project): 8-10 hours, ~25 tasks
- Phase 6 (Cloud): 6-8 hours, ~20 tasks
- Phase 7 (Polish): 6-8 hours, ~25 tasks
- Testing: 8-10 hours, ~40 tasks
- Documentation: 4-6 hours, ~15 tasks
- Deployment: 3-4 hours, ~10 tasks

**Critical Path:**
Recording → Multi-Track → Effects → Export → Project Management

**Priority Order:**
1. 🔴 Recording (enables core use case)
2. 🔴 Multi-Track/PiP (differentiating feature)
3. 🟡 Effects (polish and wow factor)
4. 🟡 Export enhancements (quality of life)
5. 🟢 Project management (necessary but can be last)
6. 🟢 Cloud upload (nice-to-have)

**Tips for Success:**
1. Complete one phase fully before moving to next
2. Test each feature immediately after implementation
3. Keep MVP functional while adding post-MVP features
4. Use undo/redo for all new features as you build them
5. Record demo video as you go (capture features when fresh)
6. Don't perfectly optimize—ship working features first# ClipForge Post-MVP - Implementation Task List

**Status Key:** ⬜ Not Started | 🟨 In Progress | ✅ Complete | ❌ Blocked

**Time Estimates:** Each task includes estimated hours in parentheses

---

## PHASE 1: Recording Features (HIGHEST PRIORITY)

**Total Estimated Time:** 12-15 hours

### Screen Recording Setup (2-3 hours)

- [ ] ⬜ Research macOS screen capture APIs (AVFoundation vs ScreenCaptureKit)
- [ ] ⬜ Create Rust module: `src-tauri/src/recording.rs`
- [ ] ⬜ Add dependencies to Cargo.toml: `serde`, `serde_json`, `tokio`
- [ ] ⬜ Create Tauri command: `list_available_screens()` 
  - Returns Vec<ScreenInfo> with display IDs and names
  - **Implementation Hint:** Use `screencapture -l` command or ScreenCaptureKit API
- [ ] ⬜ Create Tauri command: `list_available_windows()`
  - Returns Vec<WindowInfo> with window IDs, titles, app names
  - Filter out system windows and hidden windows
- [ ] ⬜ Test: Call commands from React → console logs available screens/windows
- [ ] ⬜ **Success Criteria:** Can list all displays and open application windows

### Screen Recording Implementation (3-4 hours)

- [ ] ⬜ Create Tauri command: `start_screen_recording(source_type, source_id, audio_source, output_path)`
  - **Implementation Hint:** Use FFmpeg with `-f avfoundation -i "1:0"` for macOS
  - For full screen: source_id = display number (0, 1, 2...)
  - For window: source_id = window ID
  - audio_source: "system" (device 0), "microphone" (device 1), or "none"
- [ ] ⬜ Build FFmpeg command string based on parameters:
  ```
  ffmpeg -f avfoundation -i "{video_device}:{audio_device}" -r 30 -pix_fmt yuv420p output.mp4
  ```
- [ ] ⬜ Spawn FFmpeg process asynchronously using Command::new()
- [ ] ⬜ Store process handle globally (for stopping later)
- [ ] ⬜ Create Tauri command: `stop_screen_recording()`
  - Send SIGTERM to FFmpeg process
  - Wait for process to complete
  - Return output file path
- [ ] ⬜ Add error handling: FFmpeg not found, permission denied, invalid device
- [ ] ⬜ Test: Record 10-second screen capture → MP4 file created
- [ ] ⬜ **Success Criteria:** Can record full screen with microphone audio, file plays in VLC

### Screen Recording UI (2-3 hours)

- [ ] ⬜ Create `RecordingPanel.jsx` component
- [ ] ⬜ Add "Record Screen" button in header
- [ ] ⬜ On click: Show recording settings dialog
- [ ] ⬜ Add dropdown: "Source" → options: Full Screen, Specific Window
- [ ] ⬜ If "Specific Window": Fetch and display window list from `list_available_windows()`
- [ ] ⬜ Add radio buttons: "Audio Source" → System Audio, Microphone, None
- [ ] ⬜ Add preview window showing what will be recorded (optional, complex)
- [ ] ⬜ Add "Start Recording" button
- [ ] ⬜ On start: Show countdown (3-2-1) before actual recording
- [ ] ⬜ Show recording indicator (red dot + timer)
- [ ] ⬜ Add "Stop Recording" button
- [ ] ⬜ On stop: Show "Processing..." spinner
- [ ] ⬜ When complete: Add clip to timeline automatically
- [ ] ⬜ **Implementation Hint:** Use setInterval for timer, format as MM:SS
- [ ] ⬜ **Success Criteria:** User can select window, choose audio source, record, see timer, stop, clip appears on timeline

### Webcam Recording (2-3 hours)

- [ ] ⬜ Create `WebcamRecording.jsx` component
- [ ] ⬜ Add "Record Webcam" button in header
- [ ] ⬜ On click: Request camera/microphone permissions using `navigator.mediaDevices.getUserMedia()`
- [ ] ⬜ Show live preview window with video feed
- [ ] ⬜ Add dropdown: "Camera" → list available cameras (if multiple)
- [ ] ⬜ Add dropdown: "Resolution" → 720p, 1080p, 4K (if supported)
- [ ] ⬜ Add toggle: "Microphone" → on/off
- [ ] ⬜ Implement recording using MediaRecorder API:
  ```javascript
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });
  ```
- [ ] ⬜ Collect chunks in array during recording
- [ ] ⬜ On stop: Convert chunks to Blob, then to Uint8Array
- [ ] ⬜ Create Tauri command: `save_webcam_recording(data: Vec<u8>, filename: String)`
  - Write binary data to file
  - Optionally convert WebM to MP4 using FFmpeg
- [ ] ⬜ Add clip to timeline after save
- [ ] ⬜ **Success Criteria:** Can record webcam at 1080p with microphone, clip appears on timeline

### Simultaneous Screen + Webcam (3-4 hours)

- [ ] ⬜ Create `SimultaneousRecording.jsx` component
- [ ] ⬜ Add "Record Screen + Webcam" button
- [ ] ⬜ On click: Show combined settings panel
- [ ] ⬜ Left side: Screen recording settings (source, audio)
- [ ] ⬜ Right side: Webcam preview (live feed)
- [ ] ⬜ Add "Start Recording" button (starts both simultaneously)
- [ ] ⬜ Generate timestamp for filename synchronization:
  ```javascript
  const timestamp = Date.now();
  const screenFile = `screen-${timestamp}.mp4`;
  const webcamFile = `webcam-${timestamp}.webm`;
  ```
- [ ] ⬜ Start screen recording via Tauri command
- [ ] ⬜ Start webcam recording via MediaRecorder
- [ ] ⬜ Show synchronized timer for both
- [ ] ⬜ Add "Stop Recording" button (stops both)
- [ ] ⬜ Wait for both to complete
- [ ] ⬜ Add screen clip to Main Track automatically
- [ ] ⬜ Add webcam clip to Overlay Track automatically
- [ ] ⬜ Set webcam clip PiP position to default (bottom-right corner)
- [ ] ⬜ **Implementation Hint:** Use Promise.all() to wait for both recordings
- [ ] ⬜ **Success Criteria:** Both clips appear on correct tracks, timestamps match, PiP is positioned

---

## PHASE 2: Multi-Track Timeline (HIGH PRIORITY)

**Total Estimated Time:** 8-12 hours

### Track System Architecture (2-3 hours)

- [ ] ⬜ Update clip data structure to include `track` property:
  ```javascript
  {
    id, path, duration, inPoint, outPoint,
    track: 'main' | 'overlay',
    position: number,  // Timeline position in seconds
    pipSettings: { x, y, width, height, opacity } | null
  }
  ```
- [ ] ⬜ Refactor state management to support multi-track:
  ```javascript
  const [timeline, setTimeline] = useState({
    mainTrack: [],
    overlayTrack: []
  });
  ```
- [ ] ⬜ Create helper functions:
  - `addClipToTrack(clip, track)` - Add clip to specified track
  - `moveClipBetweenTracks(clipId, fromTrack, toTrack)` - Move clip
  - `getClipsByTrack(track)` - Filter clips by track
- [ ] ⬜ Update undo/redo to handle multi-track changes
- [ ] ⬜ **Success Criteria:** State correctly stores clips on separate tracks

### Visual Multi-Track Timeline (2-3 hours)

- [ ] ⬜ Refactor `Timeline.jsx` to render two track lanes
- [ ] ⬜ Create track container structure:
  ```jsx
  <div className="timeline-container">
    <div className="track-labels">
      <div>Overlay</div>
      <div>Main</div>
    </div>
    <div className="tracks">
      <div className="track overlay-track" onDrop={handleDrop}>
        {/* Overlay clips */}
      </div>
      <div className="track main-track" onDrop={handleDrop}>
        {/* Main clips */}
      </div>
    </div>
  </div>
  ```
- [ ] ⬜ Style tracks: height 100px each, different background colors
- [ ] ⬜ Overlay track: darker or lighter shade to distinguish
- [ ] ⬜ Render clips on correct tracks based on clip.track property
- [ ] ⬜ Update playhead to span both tracks vertically
- [ ] ⬜ **Success Criteria:** Two distinct track lanes visible, clips appear on correct track

### Drag & Drop Between Tracks (2-3 hours)

- [ ] ⬜ Add draggable attribute to clip divs: `draggable="true"`
- [ ] ⬜ Implement onDragStart handler:
  ```javascript
  const handleDragStart = (e, clip) => {
    e.dataTransfer.setData('clipId', clip.id);
    e.dataTransfer.setData('sourceTrack', clip.track);
  };
  ```
- [ ] ⬜ Implement onDragOver handler for tracks (allow drop):
  ```javascript
  const handleDragOver = (e) => {
    e.preventDefault();  // Required to allow drop
  };
  ```
- [ ] ⬜ Implement onDrop handler for each track:
  ```javascript
  const handleDrop = (e, targetTrack) => {
    const clipId = e.dataTransfer.getData('clipId');
    const sourceTrack = e.dataTransfer.getData('sourceTrack');
    
    if (sourceTrack !== targetTrack) {
      moveClipBetweenTracks(clipId, sourceTrack, targetTrack);
      
      if (targetTrack === 'overlay') {
        // Convert to PiP with default settings
        initializePiP(clipId);
      }
    }
  };
  ```
- [ ] ⬜ Add visual feedback during drag (ghost outline, highlight drop zone)
- [ ] ⬜ **Success Criteria:** Drag clip from main to overlay → clip moves, PiP settings initialized

### Picture-in-Picture Settings (3-4 hours)

- [ ] ⬜ Create `PiPEditor.jsx` component
- [ ] ⬜ Show PiP editor when clip on overlay track is selected
- [ ] ⬜ Render PiP preview box on top of video player:
  ```jsx
  <div className="pip-preview-container">
    <video src={mainVideoSrc} />  {/* Main video */}
    <div 
      className="pip-box"
      style={{
        position: 'absolute',
        left: `${pipSettings.x * 100}%`,
        top: `${pipSettings.y * 100}%`,
        width: `${pipSettings.width * 100}%`,
        height: `${pipSettings.height * 100}%`,
        border: '2px solid red'
      }}
    >
      <video src={overlayVideoSrc} />  {/* PiP video */}
    </div>
  </div>
  ```
- [ ] ⬜ Add 8 resize handles (corners + edges) to PiP box
- [ ] ⬜ Implement resize logic:
  ```javascript
  const handleResize = (e, handle) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = pipSettings.width;
    const startHeight = pipSettings.height;
    
    const onMouseMove = (e) => {
      const deltaX = (e.clientX - startX) / videoWidth;
      const deltaY = (e.clientY - startY) / videoHeight;
      
      // Calculate new dimensions based on handle
      let newWidth, newHeight;
      if (handle === 'se') {  // Southeast corner
        newWidth = startWidth + deltaX;
        newHeight = startHeight + deltaY;
      }
      // ... other handles
      
      updatePiPSettings({ width: newWidth, height: newHeight });
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', onMouseMove);
    }, { once: true });
  };
  ```
- [ ] ⬜ Implement drag-to-move logic (similar to resize, but changes x/y)
- [ ] ⬜ Add opacity slider: 0-100%
- [ ] ⬜ Add "Lock Aspect Ratio" checkbox
- [ ] ⬜ Add "Reset to Default" button (bottom-right corner, 25% size)
- [ ] ⬜ Add position presets buttons:
  - Top-Left, Top-Right, Bottom-Left, Bottom-Right, Center
- [ ] ⬜ **Implementation Hint:** Use relative units (0-1) internally, convert to pixels for display
- [ ] ⬜ **Success Criteria:** Can resize PiP by dragging corners, move by dragging box, opacity slider works

---

## PHASE 3: Effects & Transitions

**Total Estimated Time:** 12-16 hours

### Text Overlay System (3-4 hours)

- [ ] ⬜ Create `TextOverlayEditor.jsx` component
- [ ] ⬜ Add "Add Text" button in effects panel
- [ ] ⬜ Create text overlay data structure:
  ```javascript
  {
    type: 'text',
    id: uuid,
    content: '',
    font: 'Arial',
    fontSize: 36,
    color: '#FFFFFF',
    position: { x: 0.5, y: 0.1 },  // Relative to video
    background: { enabled: false, color: '#000000', opacity: 0.7 },
    startTime: 0,  // When text appears on timeline
    duration: 3.0   // How long it displays
  }
  ```
- [ ] ⬜ Add state: `const [textOverlays, setTextOverlays] = useState([])`
- [ ] ⬜ Build text editor UI:
  - Textarea for content (multi-line support)
  - Dropdown for font selection (Arial, Helvetica, Times New Roman, Courier New, Georgia, Verdana, Impact, Comic Sans MS)
  - Number input for font size (12-72)
  - Color picker for text color
  - Position preset buttons (9 presets: corners, edges, center)
  - Background toggle + color picker + opacity slider
  - Number inputs for start time and duration
- [ ] ⬜ Add "Preview" button → shows text on video player at current position
- [ ] ⬜ Add "Add to Timeline" button → adds text overlay to state
- [ ] ⬜ Render text overlays on timeline (as separate elements above video tracks)
- [ ] ⬜ **Success Criteria:** Can add text, position it, preview on video

### Text Overlay Export (2 hours)

- [ ] ⬜ Create Rust function: `build_drawtext_filter(overlay: TextOverlay) -> String`
  - Convert text overlay to FFmpeg drawtext filter string:
    ```
    drawtext=text='Hello World':fontfile=/path/to/Arial.ttf:fontsize=36:fontcolor=white:x=(w-text_w)/2:y=100
    ```
  - Handle special characters in text (escape quotes)
  - Convert position from relative (0-1) to absolute pixels
  - Add background box if enabled: `box=1:boxcolor=black@0.7`
- [ ] ⬜ Download system fonts or bundle fonts with app
  - macOS fonts located in: `/Library/Fonts/` and `/System/Library/Fonts/`
  - Map font names to file paths
- [ ] ⬜ Modify `export_timeline` command to include text overlays in filter chain
- [ ] ⬜ Test: Export video with text overlay → text appears at correct position and time
- [ ] ⬜ **Success Criteria:** Text overlay appears in exported video

### Transition System (3-4 hours)

- [ ] ⬜ Create `TransitionEditor.jsx` component
- [ ] ⬜ Add "Add Transition" button (appears when two adjacent clips are selected)
- [ ] ⬜ Create transition data structure:
  ```javascript
  {
    type: 'fade' | 'dissolve' | 'wipe-left' | 'wipe-right' | 'slide-up' | 'slide-down',
    duration: 1.0,  // seconds
    between: [clipId1, clipId2],
    position: number  // Timeline position where transition occurs
  }
  ```
- [ ] ⬜ Build transition editor UI:
  - Dropdown for transition type (6 options)
  - Slider for duration (0.5s - 3.0s)
  - Preview button (shows transition effect)
  - "Add Transition" button
- [ ] ⬜ Visual indicator on timeline:
  - Show overlap region between clips
  - Display transition type icon
  - Show duration as width of overlap
- [ ] ⬜ Allow clicking transition to edit or delete
- [ ] ⬜ **Implementation Hint:** Store transitions in separate array, linked by clip IDs
- [ ] ⬜ **Success Criteria:** Can add transition between clips, visual indicator appears

### Transition Export (2-3 hours)

- [ ] ⬜ Create Rust function: `build_xfade_filter(transition: Transition) -> String`
  - Convert transition to FFmpeg xfade filter:
    ```
    [0:v][1:v]xfade=transition=fade:duration=1:offset=9
    ```
  - Calculate offset based on clip durations and positions
  - Map transition types to FFmpeg xfade types
- [ ] ⬜ Modify export command to chain transitions:
  ```
  [v0][v1]xfade=transition=fade:duration=1:offset=9[v01];
  [v01][v2]xfade=transition=dissolve:duration=0.5:offset=19[final]
  ```
- [ ] ⬜ Handle case where clips have different resolutions (scale to match)
- [ ] ⬜ Test: Export 3 clips with 2 transitions → smooth crossfades appear
- [ ] ⬜ **Success Criteria:** Transitions render correctly in exported video

### Filter System (2-3 hours)

- [ ] ⬜ Create `FilterEditor.jsx` component (already partially done in MVP)
- [ ] ⬜ Expand filter options:
  - Brightness (-100 to +100)
  - Contrast (-100 to +100)
  - Saturation (-100 to +100)
  - Hue Shift (0-360 degrees)
  - Blur (0-10)
  - Sharpen (0-10)
- [ ] ⬜ Add real-time preview (apply CSS filters to video player):
  ```javascript
  const cssFilterString = `
    brightness(${1 + brightness/100})
    contrast(${1 + contrast/100})
    saturate(${1 + saturation/100})
    hue-rotate(${hue}deg)
    blur(${blur}px)
  `;
  videoElement.style.filter = cssFilterString;
  ```
- [ ] ⬜ Note: CSS filters are for preview only, FFmpeg filters used for export
- [ ] ⬜ Add "Reset All Filters" button
- [ ] ⬜ Store filters in clip object: `clip.filters = { brightness: 0, ... }`
- [ ] ⬜ **Success Criteria:** Can adjust all filters, see changes in real-time

### Filter Export (1-2 hours)

- [ ] ⬜ Create Rust function: `build_filter_chain(filters: FilterSettings) -> String`
  - Convert filter values to FFmpeg filter string:
    ```
    eq=brightness=0.1:contrast=1.2:saturation=1.5,hue=h=30,unsharp=5:5:1.0
    ```
  - Convert percentage values to FFmpeg scale
  - Chain multiple filters with commas
- [ ] ⬜ Apply filters to each clip before concatenation in export
- [ ] ⬜ Test: Export clip with brightness +20, contrast +10 → video is brighter and more contrasty
- [ ] ⬜ **Success Criteria:** Filters apply correctly to exported video

### Audio Effects (2 hours)

- [ ] ⬜ Expand `AudioEditor.jsx` component (already exists in MVP)
- [ ] ⬜ Add volume slider (0-200%)
- [ ] ⬜ Add fade in slider (0-3 seconds)
- [ ] ⬜ Add fade out slider (0-3 seconds)
- [ ] ⬜ Store audio settings in clip: `clip.audioSettings = { volume: 1.0, fadeIn: 0, fadeOut: 0 }`
- [ ] ⬜ Create Rust function: `build_audio_filter(settings: AudioSettings) -> String`
  - Convert to FFmpeg audio filter:
    ```
    volume=1.5,afade=t=in:st=0:d=2,afade=t=out:st=8:d=2
    ```
- [ ] ⬜ Apply audio filters during export
- [ ] ⬜ Handle audio mixing when multiple tracks have audio
- [ ] ⬜ **Success Criteria:** Volume and fades work in exported video

---

## PHASE 4: Export Enhancements

**Total Estimated Time:** 6-8 hours

### Resolution Selection (2 hours)

- [ ] ⬜ Update `ExportDialog.jsx` to include resolution dropdown
- [ ] ⬜ Add resolution presets:
  ```javascript
  const resolutionPresets = [
    { label: 'Source', value: 'source', width: null, height: null },
    { label: '480p', value: '480p', width: 854, height: 480 },
    { label: '720p', value: '720p', width: 1280, height: 720 },
    { label: '1080p', value: '1080p', width: 1920, height: 1080 },
    { label: '1440p', value: '1440p', width: 2560, height: 1440 },
    { label: '4K', value: '4k', width: 3840, height: 2160 }
  ];
  ```
- [ ] ⬜ Detect source resolution from first clip in timeline
- [ ] ⬜ Show warning if upscaling: "⚠️ Upscaling from {sourceRes} to {targetRes}. Quality may be reduced."
- [ ] ⬜ Update export Tauri command to accept resolution parameters
- [ ] ⬜ Build FFmpeg scale filter with aspect ratio preservation:
  ```
  scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black
  ```
- [ ] ⬜ Test: Export 1080p video at 720p → correct resolution, letterbox if needed
- [ ] ⬜ **Success Criteria:** Can export at any resolution, maintains aspect ratio

### Platform Presets (2-3 hours)

- [ ] ⬜ Create `PlatformPresetSelector.jsx` component
- [ ] ⬜ Define presets:
  ```javascript
  const platformPresets = {
    youtube: {
      name: 'YouTube',
      resolution: { width: 1920, height: 1080 },
      codec: 'libx264',
      videoBitrate: '8M',
      audioBitrate: '192k',
      frameRate: 30,
      preset: 'medium',
      crf: 21
    },
    instagram: {
      name: 'Instagram Feed',
      resolution: { width: 1080, height: 1080 },
      codec: 'libx264',
      videoBitrate: '5M',
      audioBitrate: '128k',
      frameRate: 30,
      preset: 'medium',
      crf: 23
    },
    tiktok: {
      name: 'TikTok',
      resolution: { width: 1080, height: 1920 },
      codec: 'libx264',
      videoBitrate: '6M',
      audioBitrate: '128k',
      frameRate: 30,
      preset: 'medium',
      crf: 23
    },
    twitter: {
      name: 'Twitter',
      resolution: { width: 1280, height: 720 },
      codec: 'libx264',
      videoBitrate: '5M',
      audioBitrate: '128k',
      frameRate: 30,
      preset: 'medium',
      crf: 23
    }
  };
  ```
- [ ] ⬜ Build preset selector UI (4 cards in grid)
- [ ] ⬜ Show preset details: resolution, aspect ratio, bitrate
- [ ] ⬜ Create Tauri command: `export_with_preset(clips, preset, outputPath)`
- [ ] ⬜ Build FFmpeg command with preset parameters
- [ ] ⬜ Test: Export with Instagram preset → 1080x1080 square video, correct bit