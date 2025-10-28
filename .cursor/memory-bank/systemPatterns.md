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
- `get_video_metadata()` - Extracts video info via FFprobe
- `select_export_path()` - Save file dialog with overwrite protection
- `export_video()` - Professional single-pass FFmpeg export
- `save_project()` - JSON project file save
- `load_project()` - JSON project file load
- `extract_thumbnails()` - Multiple thumbnail generation per clip with robust error handling

**Pattern**: React calls `invoke('command_name', { params })` → Rust executes → returns result

### 2. State Management (React Hooks)
**Core State Management:**
- `clips[]` - Array of all imported clips with metadata
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
  codec: string;        // Video codec (h264, hevc, etc.)
  inPoint: number;      // Trim start (default: 0)
  outPoint: number;     // Trim end (default: duration)
  volume: number;       // Audio volume (0-200, 100 = normal)
  muted: boolean;       // Audio mute state
}
```

### 4. File Path Conversion (Tauri v2)
Local file paths must be converted to URLs for HTML5 video:
```typescript
import { convertFileSrc } from "@tauri-apps/api/core"; // ⚠️ Tauri v2: use /core NOT /tauri

const videoUrl = convertFileSrc(clip.path);
// Converts: /Users/path/video.mp4 → http://asset.localhost/Users/path/video.mp4
```

### 5. FFmpeg Integration
- **Binary Bundling**: FFmpeg binaries placed in `src-tauri/binaries/`
- **Path Resolution**: Multiple fallback paths for FFmpeg/FFprobe discovery
- **Professional Export**: Single-pass filter_complex approach (industry standard)
- **Hybrid Seeking**: Fast `-ss` before `-i` + precise `trim` filters
- **Resolution Normalization**: All clips scaled to 1280x720 with letterboxing
- **Metadata**: Use `ffprobe` with JSON output for structured data

### 6. Error Handling Strategy
- **Rust**: All commands return `Result<T, String>` with user-friendly error messages
- **React**: Toast notification system with expandable error details
- **FFmpeg**: Parse stderr for common errors, translate to user-friendly messages
- **File Validation**: Check before processing (size, format, existence)
- **Graceful Degradation**: Continue operation when non-critical components fail

## Component Architecture

### React Components
1. **App.tsx** - Root component, manages all state (refactored to 428 lines)
2. **VideoPlayer.tsx** - HTML5 video with universal timeline playback
3. **Timeline.tsx** - Visual timeline with clips, playhead, and zoom
4. **TrimControls.tsx** - In/out point inputs and keyboard shortcuts
5. **ExportButton.tsx** - Export trigger with intelligent loading states
6. **ImportButton.tsx** - File picker trigger
7. **AudioControls.tsx** - Per-clip volume and mute controls
8. **ZoomControls.tsx** - Timeline zoom with frame-accurate view
9. **ClipThumbnails.tsx** - Multiple thumbnails per clip
10. **UndoRedoButtons.tsx** - History navigation controls
11. **ProjectMenu.tsx** - Save/load project functionality
12. **KeyboardShortcutsHelp.tsx** - Help modal with all shortcuts
13. **Toast.tsx** - Individual toast notification
14. **ToastContainer.tsx** - Toast management system

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
get_video_metadata() → Add to clips[] state → Timeline re-renders → 
Thumbnail extraction → ClipThumbnails component updates
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

### Professional Keyboard Shortcuts
- **Cmd+N/Ctrl+N**: New Project
- **Cmd+S/Ctrl+S**: Save Project
- **Cmd+O/Ctrl+O**: Open Project
- **Cmd+E/Ctrl+E**: Quick Export
- **Cmd+Z/Ctrl+Z**: Undo
- **Cmd+Shift+Z/Ctrl+Y**: Redo
- **Spacebar**: Play/Pause
- **I/O**: Set In/Out Points
- **Arrow Left/Right**: Seek ±5 seconds
- **J/K/L**: Playback control
- **Home/End**: Jump to start/end
- **?**: Show keyboard help

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