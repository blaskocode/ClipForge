# ClipForge - System Patterns

## Architecture Overview
```
React Frontend (UI/State) 
    ↓ invoke() / listen()
Tauri IPC Layer
    ↓ process commands
Rust Backend (FFmpeg, File I/O)
    ↓ binary execution
FFmpeg/FFprobe
    ↓ read/write
File System
```

## Key Design Patterns

### 1. Command Pattern (Tauri IPC)
All backend operations are exposed as Tauri commands that can be invoked from React:
- `validate_video_file()` - Checks file size, format, existence
- `select_video_file()` - Opens native file picker
- `get_video_metadata()` - Extracts video info via FFprobe (includes file size)
- `select_export_path()` - Save file dialog with overwrite protection
- `export_video()` - Professional single-pass FFmpeg export
- `save_project()` - JSON project file save
- `load_project()` - JSON project file load
- `extract_thumbnails()` - Multiple thumbnail generation per clip with robust error handling
- `save_recording()` - Saves recorded WebM files to `~/Movies/ClipForge Recordings/`

**Pattern**: React calls `invoke('command_name', { params })` → Rust executes → returns result

### 2. State Management (React Hooks)
**Core State Management:**
- `clips[]` - Array of clips on the timeline (active clips being edited)
- `libraryClips[]` - Array of imported clips in media library (available but not on timeline)
- `selectedClipId` - Currently active clip in player
- `playheadPosition` - Current timeline position (seconds)
- `isPlaying` - Playback state
- `zoomLevel` - Timeline zoom level
- `isExporting` - Loading state during export

**Professional State Management:**
- **Custom useHistory Hook**: Manages undo/redo functionality
- **Playhead Separation**: Playhead position excluded from undo/redo history (professional behavior)
- **useRef for Synchronous Access**: `playheadPositionRef` for real-time access during playback

**Pattern**: Lifted state pattern - state at root, props drilled down to children

### 3. Clip Data Structure
```typescript
interface Clip {
  id: string;           // Unique identifier (crypto.randomUUID())
  path: string;         // Absolute file path
  filename: string;     // Display name
  duration: number;     // Total duration in seconds
  width: number;        // Video width
  height: number;       // Video height
  codec: string;        // Video codec (h264, hevc, vp9, etc.)
  inPoint: number;      // Trim start (default: 0)
  outPoint: number;     // Trim end (default: duration)
  volume: number;       // Audio volume (0-200, 100 = normal)
  muted: boolean;       // Audio mute state
  track: 'main' | 'pip'; // Timeline track assignment
  sourceOffset?: number; // For split clips: offset into source file where clip starts
  fileSize?: number;     // File size in bytes (optional for backward compatibility)
  pipSettings?: {        // Picture-in-picture positioning
    x: number;           // 0-1 (percentage of main video width)
    y: number;           // 0-1 (percentage of main video height)
    width: number;       // 0-1 (percentage scale)
    height: number;      // 0-1 (percentage scale)
    opacity: number;     // 0-1
  };
}
```

### 4. Media Library Architecture
**Library vs Timeline:**
- **Library Clips** (`libraryClips[]`): Imported clips stored separately, available but not on timeline
- **Timeline Clips** (`clips[]`): Active clips being edited and exported
- **Workflow**: Import → Library → Manual add to Timeline (via drag or buttons)
- **Reusability**: Clips can be added to timeline multiple times from library
- **Independence**: Deleting from timeline doesn't remove from library

**MediaLibrary Component:**
- Grid view with clip cards showing thumbnails and metadata
- Drag-and-drop support: Library clips draggable to timeline tracks
- Action buttons: "Add to Main", "Add to PiP", Delete
- Metadata display: Filename, duration, resolution, file size, codec

**Library-to-Timeline Drag:**
- Uses `dataTransfer.setData` with JSON payload to mark drag source
- Timeline `handleClipDrop` detects library vs timeline clip drags
- Creates new timeline clip instance with unique ID when dropped

### 5. File Path Conversion (Tauri v2)
Local file paths must be converted to URLs for HTML5 video:
```typescript
import { convertFileSrc } from "@tauri-apps/api/core"; // ⚠️ Tauri v2: use /core NOT /tauri

const videoUrl = convertFileSrc(clip.path);
// Converts: /Users/path/video.mp4 → http://asset.localhost/Users/path/video.mp4
```

### 6. FFmpeg Integration
- **Binary Bundling**: FFmpeg binaries placed in `src-tauri/binaries/`
- **Path Resolution**: Multiple fallback paths for FFmpeg/FFprobe discovery
- **Professional Export**: Single-pass filter_complex approach (industry standard)
- **Hybrid Seeking**: Fast `-ss` before `-i` + precise `trim` filters
- **Resolution Normalization**: All clips scaled to 1280x720 with letterboxing
- **Metadata**: Use `ffprobe` with JSON output for structured data

### 7. Video Playback Synchronization (Professional NLE Approach)
**Video-Driven Playback** - Matches Premiere Pro, DaVinci Resolve, Final Cut Pro:
- **During playback**: Video is master → playhead syncs to `video.currentTime` via RAF loop
- **During scrubbing**: Playhead is master → video seeks to match position
- **Drift tolerance**: Only seeks when drift >200ms (imperceptible, prevents seeking artifacts)
- **Event-driven state**: Uses `playing`, `pause`, `waiting`, `ended` events for robust state tracking
- **RAF loop**: `requestAnimationFrame` provides 60fps sync matching display refresh rate
- **Smooth playback**: Video plays at native frame rate without constant seeking
- **Perfect sync**: Video position updates playhead every frame during playback
- **Trim boundaries**: VideoPlayer handles out-point detection and stops at correct position
- **Auto-pause**: Automatically pauses when reaching the end of the final clip
  - **Trimmed clips**: RAF loop detects when `videoTime >= clip.outPoint`
  - **Untrimmed clips**: `ended` event fires when video reaches natural end
  - **Dual detection**: Handles both trimmed and untrimmed scenarios
- **Professional clip transitions**: Seamless transitions between clips (Premiere Pro behavior)
  - **Multi-clip playback**: Automatically transitions to next clip when current clip ends
  - **No bouncing**: Playhead moves directly to start of next clip, no boundary gaps
  - **Last clip handling**: Pauses playback when reaching end of final clip
  - **Seamless flow**: Continuous playback through multiple clips without interruption
  - **Boundary fix**: Playhead moves slightly into next clip (+0.001s) to avoid boundary issues

### 7. Recording System Architecture
**MediaRecorder API Integration:**
- **Screen Recording**: `navigator.mediaDevices.getDisplayMedia()` for screen capture
- **Webcam Recording**: `navigator.mediaDevices.getUserMedia()` for camera + microphone
- **Simultaneous Recording**: Two separate MediaRecorder instances for screen + webcam
- **Format**: WebM with VP9 video codec and Opus audio codec
- **File Saving**: Blob → ArrayBuffer → Tauri command → File system

**Recording Flow:**
1. User clicks "Record" button or presses Cmd+R
2. RecordingModal opens with type selection (Screen/Webcam/Both)
3. Media streams requested via browser APIs
4. MediaRecorder instances created for each stream
5. Data chunks collected every 1 second
6. On stop: chunks combined into Blob, sent to Rust backend
7. File saved to `~/Movies/ClipForge Recordings/`
8. Metadata extracted via FFprobe (with fallbacks for WebM)
9. Clips automatically created and added to timeline
10. Screen recording → main track, Webcam recording → PiP track

**Audio Handling:**
- **System Audio**: Optional, requires user permission in screen picker
- **Microphone Audio**: Separate track with device selection dropdown
- **Audio Playback**: VideoPlayer respects clip.volume and clip.muted settings
- **Volume Control**: 0-200 range (100 = normal, 0 = mute, 200 = 2x boost)

**Key Components:**
- `RecordingModal.tsx` - Main recording UI with type selection and controls
- `RecordingModal.css` - Styling for recording interface
- `save_recording()` Rust command - File system save operation
- `handleRecordingComplete()` - Timeline integration handler

### 8. Clip Splitting System
**Split Operation:**
- **Keyboard Shortcut**: `S` key splits clip at current playhead position
- **Behavior**: Creates two independent clips, both starting from 0
- **Part 1**: Original clip start to split point
- **Part 2**: Split point to original clip end (with sourceOffset)

**Split Clip Structure:**
```typescript
// Original clip: 5 seconds, split at 2 seconds
// Part 1:
{
  id: "clip-part1-...",
  inPoint: 0,           // Clean clip, starts at 0
  outPoint: 2,          // Ends at its duration
  duration: 2,
  sourceOffset: 0,      // Starts at 0 seconds in source file
  // ... other properties
}

// Part 2:
{
  id: "clip-part2-...",
  inPoint: 0,           // Clean clip, starts at 0
  outPoint: 3,          // Ends at its duration
  duration: 3,
  sourceOffset: 2,      // Starts at 2 seconds in source file
  // ... other properties
}
```

**VideoPlayer Source Offset Logic:**
- For playback: `targetTime = sourceOffset + localTime`
- For sync: `localClipTime = video.currentTime - sourceOffset`
- Both parts behave as independent clips starting from 0 in the UI
- Source file seeking handled automatically via sourceOffset

**Export Integration:**
- FFmpeg uses `sourceOffset` for trim start: `trim=start={sourceOffset}:duration={outPoint - inPoint}`
- Both ClipData and PipClipData support `sourceOffset` field
- Export correctly references source file positions for split clips

**Key Files:**
- `src/utils/clipSplitting.ts` - Split logic with validation
- `src/components/VideoPlayer.tsx` - Source offset handling in playback
- `src-tauri/src/export.rs` - Export logic with sourceOffset support

**Key Implementation:**
```typescript
// Split creates clean clips with sourceOffset
const firstClip = { inPoint: 0, outPoint: duration1, sourceOffset: originalInPoint };
const secondClip = { inPoint: 0, outPoint: duration2, sourceOffset: originalInPoint + splitTime };

// VideoPlayer uses sourceOffset for seeking
const targetTime = sourceOffset + localTime;
video.currentTime = Math.max(sourceOffset, Math.min(targetTime, sourceOffset + outPoint));
```

### 9. Error Handling Strategy
- **Rust**: All commands return `Result<T, String>` with user-friendly error messages
- **React**: Toast notification system with expandable error details
- **FFmpeg**: Parse stderr for common errors, translate to user-friendly messages
- **File Validation**: Check before processing (size, format, existence)
- **Graceful Degradation**: Continue operation when non-critical components fail

## Component Architecture

### React Components
1. **App.tsx** - Root component, manages all state
2. **VideoPlayer.tsx** - HTML5 video with RAF-based video-driven playback sync
3. **Timeline.tsx** - Visual timeline with clips, playhead, drag-and-drop reordering, and zoom
4. **TrimControls.tsx** - In/out point inputs and keyboard shortcuts
5. **ExportButton.tsx** - Export trigger with intelligent loading states
6. **ImportButton.tsx** - File picker trigger
7. **AudioControls.tsx** - Per-clip volume and mute controls
8. **ZoomControls.tsx** - Timeline zoom with frame-accurate view
9. **ClipThumbnails.tsx** - Multiple thumbnails per clip with metadata (file size, resolution, duration)
10. **UndoRedoButtons.tsx** - History navigation controls
11. **ProjectMenu.tsx** - Save/load project functionality
12. **KeyboardShortcutsHelp.tsx** - Help modal with all shortcuts
13. **Toast.tsx** - Individual toast notification
14. **ToastContainer.tsx** - Toast management system
15. **RecordingModal.tsx** - Recording UI with type selection and controls
16. **RecordingModal.css** - Recording interface styling
17. **MediaLibrary.tsx** - Media library panel with grid view of imported clips

### Rust Commands
All commands live in `src-tauri/src/lib.rs` (458 lines):
- Decorated with `#[tauri::command]`
- Registered in `invoke_handler()` with `tauri::generate_handler![...]`
- All async operations use `.await`
- Professional error handling with user-friendly messages

## Communication Flow

### Import Flow
```
User drops file → Tauri file-drop event → validate_video_file() → 
get_video_metadata() → Add to libraryClips[] state → MediaLibrary re-renders → 
Thumbnail extraction → MediaLibrary displays clips → 
User drags/double-clicks → Add to clips[] (timeline) → Timeline re-renders
```

### Preview Flow
```
User clicks clip → selectedClipId changes → VideoPlayer receives new clip → 
convertFileSrc() → Video element src updates → Video loads → 
Universal timeline playback with multi-clip support
```

### Trim Flow
```
User sets in/out points (I/O keys or manual input) → Clip object updated in state → 
VideoPlayer seeks to new position → Timeline visual indicators update → 
Smart playback skips trimmed sections
```

### Recording Flow
```
User clicks Record (Cmd+R) → RecordingModal opens → User selects type (Screen/Webcam/Both) →
Media streams requested → MediaRecorder instances created → Chunks collected every 1s →
User stops recording → Blobs combined → Save to file system → Metadata extracted →
Clips created and auto-added to timeline (screen→main, webcam→pip)
```

### Split Flow
```
User presses S key at playhead → Active clip found at playhead position →
Clip validated (not at edges) → Split into Part 1 and Part 2 →
Both parts have inPoint=0, outPoint=duration, sourceOffset for playback →
New clips inserted into timeline → Part 1 selected automatically →
Undo/redo history updated
```

### Export Flow
```
User clicks Export → select_export_path() → Check for file overwrite → 
Call export_video() → Professional single-pass FFmpeg → 
Resolution normalization → Multi-clip concatenation → 
Return success/error → Show result with "Open Folder" button
```

### Undo/Redo Flow
```
User action → pushState() to history → State updated → 
Undo/Redo buttons update → Keyboard shortcuts (Cmd+Z/Cmd+Shift+Z) → 
Previous state restored → UI updates
```

## Key Implementation Details

### Timeline Visualization
- **Scale**: Dynamic based on zoom level (PIXELS_PER_SECOND * zoomLevel)
- **Clip Width**: `clip.duration * PIXELS_PER_SECOND * zoomLevel`
- **Clip Position**: Sum of all previous clips' durations
- **Playhead**: Red vertical line at `playheadPosition * PIXELS_PER_SECOND * zoomLevel`
- **Trim Indicators**: Gray overlays showing trimmed portions
- **Thumbnails**: Multiple thumbnails per clip displayed as filmstrip

### Video Playback Sync
- **Universal Timeline Playback**: Works across all clips, not clip-specific
- **Professional UX**: Preview follows playhead position, independent of clip selection
- **Multi-Clip Playback**: Automatic transitions between clips at ~30fps
- **Smart Trim Skipping**: Automatically skips trimmed sections during playback
- **useRef for Synchronous Access**: `playheadPositionRef` ensures accurate I/O point setting during playback

### Drag & Drop
- Tauri provides `tauri://file-drop`, `file-drop-hover`, `file-drop-cancelled` events
- Listen with `listen()` from React
- Filter for video extensions only
- Show visual feedback (border highlight, overlay message)
- Bulk import protection (warning at 20 clips, hard limit at 50)

### Clip Reordering (Drag-and-Drop)
- Native HTML5 drag-and-drop API for timeline clip reordering
- Auto-pause playback during drag for clarity
- Visual feedback: dragged clip opacity + green drop indicator
- Edge case handling: prevents no-op drags, validates indices, disables during export
- Undo/redo integration: reordering pushes to history stack
- Custom drag image showing clip filename
- Drop indicator shows insertion point between clips
- Trim handle conflicts prevented with preventDefault()
- **Professional Snap-to Behavior**: Clips automatically snap to logical positions (clip boundaries, timeline start)
- **Drop Event Handling**: Drop handler attached to timeline container to enable dropping between clips
- **Tauri Configuration**: `dragDropEnabled: false` in tauri.conf.json prevents conflicts with custom implementation

### Professional Keyboard Shortcuts
- **Cmd+N/Ctrl+N**: New Project
- **Cmd+S/Ctrl+S**: Save Project
- **Cmd+O/Ctrl+O**: Open Project
- **Cmd+E/Ctrl+E**: Quick Export
- **Cmd+R/Ctrl+R**: Start Recording
- **Cmd+Z/Ctrl+Z**: Undo
- **Cmd+Shift+Z/Ctrl+Y**: Redo
- **Spacebar**: Play/Pause
- **S**: Split clip at playhead
- **I/O**: Set In/Out Points
- **Arrow Left/Right**: Seek ±5 seconds
- **J/K/L**: Playback control
- **Home/End**: Jump to start/end
- **?**: Show keyboard help
- **Esc**: Close dialogs/modals

### FFmpeg Commands

**Professional Single-Pass Export:**
```bash
ffmpeg -ss 5 -i clip1.mp4 -ss 10 -i clip2.mp4 \
  -filter_complex "[0:v]trim=end=3,setpts=PTS-STARTPTS[v0s];[v0s]scale=1280:720[v0];[1:v]trim=end=5,setpts=PTS-STARTPTS[v1s];[v1s]scale=1280:720[v1];[v0][v1]concat=n=2:v=1:a=0[outv]" \
  -map "[outv]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -y output.mp4
```

**Thumbnail Extraction:**
```bash
ffmpeg -i input.mp4 -ss 1.5 -vframes 1 -q:v 2 -y thumbnail.jpg
```

**Enhanced Error Handling:**
- Comprehensive FFmpeg error logging with full command and stderr
- Graceful degradation - continues with other thumbnails if individual ones fail
- Partial results - returns successfully extracted thumbnails even if some fail
- Temp file cleanup - automatically removes temporary thumbnail files
- Smart count adjustment - extracts fewer thumbnails for very short videos (< 1 second)

**Metadata Extraction:**
```bash
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of json input.mp4
```

## Architecture Decisions

### Code Quality Standards
- **500-Line Rule**: All source files must be under 500 lines
- **Modular Architecture**: Extracted utilities, hooks, and components
- **Type Safety**: Comprehensive TypeScript interfaces
- **Error Handling**: User-friendly error messages throughout

### Professional UX Standards
- **Non-Destructive Editing**: Clips maintain full timeline length with trim overlays
- **Frame-Accurate Editing**: All values snap to 30fps grid (0.033s intervals)
- **Industry-Standard Shortcuts**: Complete keyboard shortcut system
- **Toast Notifications**: User-friendly feedback with expandable details
- **Professional Export**: Single-pass FFmpeg matching Premiere Pro/Final Cut Pro

### State Management Patterns
- **History Exclusion**: Playhead position excluded from undo/redo (professional behavior)
- **Synchronous Access**: useRef for real-time access during playback
- **Centralized State**: All core state managed in App.tsx
- **Custom Hooks**: useHistory, usePlaybackLoop, useExport for specialized functionality

## Known Limitations & Future Enhancements

### ✅ Recently Implemented Features

**1. Media Library Panel** ✅
- **Status**: Complete
- **Implementation**: Left sidebar panel with grid view of imported clips
- **Key Features**:
  - Imported clips go to library first (not directly to timeline)
  - Drag-and-drop from library to timeline tracks (main/PiP)
  - Action buttons for adding to tracks or deleting from library
  - Thumbnail previews and full metadata display
  - Clips can remain in library after being added to timeline (reusable)
- **Architecture**: Separate `libraryClips[]` state from timeline `clips[]` state
- **Components**: `MediaLibrary.tsx`, `media-library.css`

**2. File Size Metadata** ✅
- **Status**: Complete
- **Implementation**: File size captured during metadata extraction and displayed in UI
- **Backend**: Added `file_size: u64` to `VideoMetadata` struct in Rust
- **Frontend**: Added `fileSize?: number` to `Clip` interface, displayed in `ClipThumbnails`
- **Formatting**: Human-readable format (B, KB, MB, GB) via `formatHelpers.ts`
- **Impact**: Users can now see file size information for all clips

### ✅ Recently Implemented Features (Continued)

**3. Export Resolution Options** ✅
- **Status**: Complete
- **Implementation**: Export settings modal with resolution selector
- **Key Features**:
  - Resolution options: 720p (1280×720), 1080p (1920×1080), Source (max clip dimensions)
  - Source resolution calculation ensures even dimensions (FFmpeg requirement)
  - Upscaling warning when exporting higher than source
  - Dynamic resolution in all FFmpeg filter chains (main track, PiP track)
  - Resolution validation (64×64 to 7680×4320)
  - Keyboard shortcut: Cmd+E opens export settings
- **Components**: `ExportSettingsModal.tsx`, `export-settings.css`

### Missing Requirements (Not Yet Implemented)

**4. Drag from Library to Timeline**
- **Status**: ✅ Complete
- **Implementation**: Library clips are draggable, Timeline detects library vs timeline drags
- **Behavior**: Can drag library clips to timeline main or PiP tracks
- **Detection**: Uses `dataTransfer.setData` to mark drag source (library vs timeline)

**5. Cloud Upload/Sharing (Bonus)**
- **Status**: Not implemented (documented as out of scope)
- **Requires**: Third-party API integrations (Google Drive, Dropbox, etc.)
- **Impact**: Export must be local only

### Future Enhancement Priorities

1. **Export Resolution Options** - High (explicit requirement, user-requested)
2. **Media Library Panel** - Medium (improves workflow for large projects)
3. **File Size Display** - Low (nice to have)
4. **Cloud Upload** - Low (bonus feature, requires external services)

## File Organization

### Frontend Structure
```
src/
├── components/          # React components (all <500 lines)
├── hooks/              # Custom hooks (useHistory, usePlaybackLoop, useExport)
├── utils/              # Utility functions (keyboardHandler, dragDrop, etc.)
├── types/              # TypeScript type definitions
├── styles/             # Modular CSS files
└── App.tsx             # Main component (428 lines)
```

### Backend Structure
```
src-tauri/src/
├── lib.rs              # All Tauri commands (458 lines)
└── binaries/           # FFmpeg/FFprobe binaries
```

### CSS Organization
```
src/styles/
├── header-modals.css   # Header and modal styles
├── controls.css        # Control component styles
├── video-player.css    # Video player styles
├── timeline.css        # Timeline styles
├── trim.css           # Trim functionality styles
└── export.css         # Export functionality styles
```

This architecture supports all implemented features while maintaining code quality, professional UX standards, and comprehensive error handling.