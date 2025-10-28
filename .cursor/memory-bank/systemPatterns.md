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
- `select_video_file()` - Opens native file picker
- `get_video_metadata()` - Extracts video info via FFprobe
- `validate_video_file()` - Checks file size, format, existence
- `export_single_clip()` - Trims single clip with FFmpeg
- `export_timeline()` - Concatenates multiple clips
- `check_codec_compatibility()` - Validates clip codecs match

**Pattern**: React calls `invoke('command_name', { params })` → Rust executes → returns result

### 2. State Management (React Hooks)
All application state lives in the root App component:
- `clips[]` - Array of all imported clips with metadata
- `selectedClipId` - Currently active clip in player
- `playheadPosition` - Current timeline position (seconds)
- `isExporting` - Loading state during export

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
}
```

### 4. File Path Conversion (Tauri)
Local file paths must be converted to URLs for HTML5 video:
```typescript
const videoUrl = convertFileSrc(clip.path);
// Converts: /Users/path/video.mp4 → http://asset.localhost/Users/path/video.mp4
```

### 5. FFmpeg Integration
- **Binary Bundling**: FFmpeg binaries placed in `src-tauri/binaries/`
- **Path Resolution**: Use `app_handle.path_resolver().resolve_resource()` to get bundled binary path
- **Fast Processing**: Use `-c copy` flag to avoid re-encoding (just copy codec)
- **Metadata**: Use `ffprobe` with JSON output for structured data

### 6. Error Handling Strategy
- **Rust**: All commands return `Result<String, String>` with user-friendly error messages
- **React**: Wrap all `invoke()` calls in try-catch, display errors in UI
- **FFmpeg**: Parse stderr for common errors, translate to user-friendly messages
- **File Validation**: Check before processing (size, format, existence)

## Component Architecture

### React Components
1. **App.tsx** - Root component, manages all state
2. **VideoPlayer.tsx** - HTML5 video with play/pause controls
3. **Timeline.tsx** - Visual timeline with clips and playhead
4. **TrimControls.tsx** - In/out point inputs and buttons
5. **ExportButton.tsx** - Export trigger with loading state
6. **ImportButton.tsx** - File picker trigger

### Rust Commands
All commands live in `src-tauri/src/lib.rs`:
- Decorated with `#[tauri::command]`
- Registered in `invoke_handler()` with `tauri::generate_handler![...]`
- All async operations use `.await`

## Communication Flow

### Import Flow
```
User drops file → Tauri file-drop event → validate_video_file() → 
get_video_metadata() → Add to clips[] state → Timeline re-renders
```

### Preview Flow
```
User clicks clip → selectedClipId changes → VideoPlayer receives new clip → 
convertFileSrc() → Video element src updates → Video loads
```

### Trim Flow
```
User sets in/out points → Clip object updated in state → 
VideoPlayer seeks to new position → Timeline visual indicators update
```

### Export Flow
```
User clicks Export → Check codec compatibility → Select save location → 
Call export_single_clip() or export_timeline() → FFmpeg processes → 
Return success/error → Show result to user
```

## Key Implementation Details

### Timeline Visualization
- **Scale**: 50 pixels per second (configurable constant `PIXELS_PER_SECOND`)
- **Clip Width**: `clip.duration * PIXELS_PER_SECOND`
- **Clip Position**: Sum of all previous clips' durations
- **Playhead**: Red vertical line at `playheadPosition * PIXELS_PER_SECOND`

### Video Playback Sync
- HTML5 video `onTimeUpdate` event fires during playback
- Convert `currentTime` to absolute timeline position
- Account for clip start offset when multiple clips exist
- Update `playheadPosition` state

### Drag & Drop
- Tauri provides `tauri://file-drop`, `file-drop-hover`, `file-drop-cancelled` events
- Listen with `listen()` from React
- Filter for video extensions only
- Show visual feedback (border highlight, overlay message)

### FFmpeg Commands

**Single Clip Trim:**
```bash
ffmpeg -i input.mp4 -ss 5 -t 10 -c copy output.mp4
# -ss 5: Start at 5 seconds
# -t 10: Duration of 10 seconds (outPoint - inPoint)
# -c copy: Fast copy, no re-encoding
```

**Multiple Clip Concat:**
```bash
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

**Metadata Extraction:**
```bash
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of json input.mp4
```

