# ClipForge API Documentation

This document provides comprehensive documentation for all Tauri commands available in ClipForge.

## Overview

ClipForge uses Tauri 2.0 for secure communication between the React frontend and Rust backend. All video processing is handled by FFmpeg, which is bundled with the application.

## Command Reference

### Video Validation

#### `validate_video_file(file_path: String) -> Result<String, String>`

Validates a video file for compatibility with ClipForge.

**Parameters:**
- `file_path` (String): Absolute path to the video file

**Returns:**
- `Ok(String)`: Success message
- `Err(String)`: Error description

**Example:**
```typescript
try {
  const result = await invoke('validate_video_file', { 
    filePath: '/path/to/video.mp4' 
  });
  console.log('File is valid:', result);
} catch (error) {
  console.error('Validation failed:', error);
}
```

**Error Cases:**
- File not found
- File too large (>2GB)
- Unsupported format
- Corrupted file

---

### File Selection

#### `select_video_file() -> Result<String, String>`

Opens a native file dialog for video file selection.

**Parameters:** None

**Returns:**
- `Ok(String)`: Selected file path
- `Err(String)`: Error description or "cancelled"

**Example:**
```typescript
try {
  const filePath = await invoke('select_video_file');
  console.log('Selected file:', filePath);
} catch (error) {
  if (error === 'cancelled') {
    console.log('User cancelled file selection');
  } else {
    console.error('File selection failed:', error);
  }
}
```

---

### Video Metadata

#### `get_video_metadata(file_path: String) -> Result<VideoMetadata, String>`

Extracts metadata from a video file using FFprobe.

**Parameters:**
- `file_path` (String): Absolute path to the video file

**Returns:**
- `Ok(VideoMetadata)`: Video metadata object
- `Err(String)`: Error description

**VideoMetadata Structure:**
```typescript
interface VideoMetadata {
  duration: number;    // Duration in seconds
  width: number;       // Video width in pixels
  height: number;      // Video height in pixels
  codec: string;       // Video codec (e.g., "h264")
  fps: number;         // Frames per second
  bitrate: number;     // Bitrate in bits per second
}
```

**Example:**
```typescript
try {
  const metadata = await invoke('get_video_metadata', { 
    filePath: '/path/to/video.mp4' 
  });
  console.log('Duration:', metadata.duration, 'seconds');
  console.log('Resolution:', metadata.width, 'x', metadata.height);
  console.log('Codec:', metadata.codec);
} catch (error) {
  console.error('Metadata extraction failed:', error);
}
```

---

### Export Path Selection

#### `select_export_path() -> Result<String, String>`

Opens a native save dialog for export file selection.

**Parameters:** None

**Returns:**
- `Ok(String)`: Selected export path
- `Err(String)`: Error description or "cancelled"

**Example:**
```typescript
try {
  const exportPath = await invoke('select_export_path');
  console.log('Export path:', exportPath);
} catch (error) {
  if (error === 'cancelled') {
    console.log('User cancelled export path selection');
  } else {
    console.error('Export path selection failed:', error);
  }
}
```

---

### Video Export

#### `export_video(clips: Vec<ClipExportInfo>, output_path: String) -> Result<String, String>`

Exports trimmed video clips as a single concatenated MP4 file.

**Parameters:**
- `clips` (Vec<ClipExportInfo>): Array of clip information
- `output_path` (String): Output file path

**ClipExportInfo Structure:**
```typescript
interface ClipExportInfo {
  path: string;        // Source file path
  in_point: number;    // In point in seconds
  out_point: number;   // Out point in seconds
  volume: number;      // Volume percentage (0-200)
  muted: boolean;      // Whether audio is muted
}
```

**Returns:**
- `Ok(String)`: Success message with export path
- `Err(String)`: Error description

**Example:**
```typescript
const clips = [
  {
    path: '/path/to/video1.mp4',
    in_point: 10.0,
    out_point: 30.0,
    volume: 100,
    muted: false
  },
  {
    path: '/path/to/video2.mp4',
    in_point: 5.0,
    out_point: 25.0,
    volume: 80,
    muted: false
  }
];

try {
  const result = await invoke('export_video', {
    clips: clips,
    outputPath: '/path/to/output.mp4'
  });
  console.log('Export successful:', result);
} catch (error) {
  console.error('Export failed:', error);
}
```

**FFmpeg Process:**
1. Validates all input files exist
2. Creates filter complex for trimming and concatenation
3. Applies volume adjustments and mute settings
4. Scales all videos to 1280x720 for compatibility
5. Concatenates clips with seamless transitions
6. Exports as MP4 with H.264 video and AAC audio

---

### Project Management

#### `save_project(project_data: ProjectFile) -> Result<String, String>`

Saves a ClipForge project to a JSON file.

**Parameters:**
- `project_data` (ProjectFile): Project data structure

**ProjectFile Structure:**
```typescript
interface ProjectFile {
  version: string;           // Project format version
  clips: ClipInfo[];         // Array of clip information
  timeline_state: TimelineState; // Timeline state
  created: string;           // Creation timestamp (ISO 8601)
  modified: string;          // Modification timestamp (ISO 8601)
}

interface ClipInfo {
  id: string;                // Unique clip identifier
  path: string;              // Source file path
  filename: string;          // Display filename
  duration: number;          // Duration in seconds
  width: number;             // Video width
  height: number;            // Video height
  codec: string;             // Video codec
  in_point: number;         // In point in seconds
  out_point: number;         // Out point in seconds
  volume: number;            // Volume percentage
  muted: boolean;            // Mute state
}

interface TimelineState {
  selected_clip_id: string | null; // Currently selected clip
  playhead_position: number;       // Playhead position in seconds
}
```

**Returns:**
- `Ok(String)`: Saved file path
- `Err(String)`: Error description

**Example:**
```typescript
const projectData = {
  version: "1.0",
  clips: [
    {
      id: "clip-1",
      path: "/path/to/video.mp4",
      filename: "video.mp4",
      duration: 60.0,
      width: 1920,
      height: 1080,
      codec: "h264",
      in_point: 10.0,
      out_point: 50.0,
      volume: 100,
      muted: false
    }
  ],
  timeline_state: {
    selected_clip_id: "clip-1",
    playhead_position: 20.0
  },
  created: "2024-12-19T10:00:00Z",
  modified: "2024-12-19T10:00:00Z"
};

try {
  const savedPath = await invoke('save_project', { 
    projectData: projectData 
  });
  console.log('Project saved to:', savedPath);
} catch (error) {
  console.error('Save failed:', error);
}
```

---

#### `load_project() -> Result<ProjectFile, String>`

Loads a ClipForge project from a JSON file.

**Parameters:** None

**Returns:**
- `Ok(ProjectFile)`: Loaded project data
- `Err(String)`: Error description

**Example:**
```typescript
try {
  const project = await invoke('load_project');
  console.log('Project loaded:', project);
  console.log('Clips:', project.clips.length);
  console.log('Version:', project.version);
} catch (error) {
  console.error('Load failed:', error);
}
```

**Validation:**
- Checks project version compatibility
- Verifies all clip files still exist
- Validates JSON structure
- Updates modification timestamp

---

### Thumbnail Extraction

#### `extract_thumbnails(file_path: String, count: usize) -> Result<Vec<String>, String>`

Extracts thumbnail images from a video file at evenly distributed time points.

**Parameters:**
- `file_path` (String): Absolute path to the video file
- `count` (number): Number of thumbnails to extract

**Returns:**
- `Ok(Vec<String>)`: Array of base64-encoded data URLs
- `Err(String)`: Error description

**Example:**
```typescript
try {
  const thumbnails = await invoke('extract_thumbnails', {
    filePath: '/path/to/video.mp4',
    count: 5
  });
  
  // thumbnails is an array of data URLs like:
  // ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...", ...]
  
  thumbnails.forEach((thumbnail, index) => {
    console.log(`Thumbnail ${index + 1}:`, thumbnail);
  });
} catch (error) {
  console.error('Thumbnail extraction failed:', error);
}
```

**Process:**
1. Validates file exists
2. Gets video duration using FFprobe
3. Calculates evenly distributed time points
4. Uses FFmpeg to extract frames at each time point
5. Converts images to base64 data URLs
6. Cleans up temporary files
7. Returns array of data URLs

---

## Error Handling

All commands return `Result<T, String>` where the error string provides detailed information about what went wrong.

### Common Error Patterns

```typescript
try {
  const result = await invoke('command_name', { params });
  // Handle success
} catch (error) {
  // Handle error
  console.error('Command failed:', error);
  
  // Show user-friendly error message
  showErrorToast(`Operation failed: ${error}`);
}
```

### Error Types

- **File Errors**: "File not found", "Cannot read file", "File too large"
- **FFmpeg Errors**: Detailed FFmpeg error messages
- **Validation Errors**: "Invalid video format", "Unsupported codec"
- **User Cancellation**: "cancelled" (for dialog operations)
- **System Errors**: "Permission denied", "Disk full", etc.

## Performance Considerations

### Large Files
- Files >2GB may cause performance issues
- Consider chunked processing for very large exports
- Thumbnail extraction is optimized for reasonable file sizes

### Memory Usage
- Thumbnail data URLs are base64-encoded and can be large
- Consider caching thumbnails to avoid re-extraction
- Export operations use streaming to minimize memory usage

### FFmpeg Integration
- All video processing uses FFmpeg for consistency
- Hardware acceleration is used when available
- Error messages include FFmpeg output for debugging

## Security Notes

- All file operations are restricted to user-selected files
- No network access or data collection
- Temporary files are cleaned up after processing
- File paths are validated before processing

## Troubleshooting

### Common Issues

1. **"File not found"**: Check file path and permissions
2. **"FFmpeg failed"**: Verify video file is not corrupted
3. **"Unsupported format"**: Try converting to MP4 first
4. **"Export failed"**: Check output path permissions and disk space

### Debug Information

Enable debug logging by setting the log level in the Tauri configuration:

```json
{
  "tauri": {
    "logLevel": "debug"
  }
}
```

This will provide detailed FFmpeg output and processing information.
