**React (Upload UI):**
```jsx
function CloudUploadDialog({ exportedFilePath, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shareableLink, setShareableLink] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  
  const handleGoogleAuth = async () => {
    try {
      const authUrl = await invoke('initiate_google_oauth');
      // OAuth flow happens in browser
      // After success, callback server receives token
      // Token is stored and used for upload
      
      // For simplicity, assume we get token after auth
      setIsAuthenticated(true);
      setAccessToken('token_from_oauth');
    } catch (error) {
      alert(`Authentication failed: ${error}`);
    }
  };
  
  const handleUpload = async () => {
    if (!isAuthenticated) {
      await handleGoogleAuth();
      return;
    }
    
    try {
      setUploading(true);
      
      const link = await invoke('upload_to_google_drive', {
        filePath: exportedFilePath,
        accessToken: accessToken
      });
      
      setShareableLink(link);
      setUploading(false);
    } catch (error) {
      alert(`Upload failed: ${error}`);
      setUploading(false);
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    alert('Link copied to clipboard!');
  };
  
  return (
    <div className="cloud-upload-dialog">
      <h3>Upload to Google Drive</h3>
      
      {!isAuthenticated ? (
        <div>
          <p>Sign in with Google to upload your video</p>
          <button onClick={handleGoogleAuth}>Sign in with Google</button>
        </div>
      ) : uploading ? (
        <div>
          <p>Uploading... {progress}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : shareableLink ? (
        <div>
          <p>✓ Upload complete!</p>
          <input type="text" value={shareableLink} readOnly />
          <button onClick={handleCopyLink}>Copy Link</button>
          <button onClick={() => window.open(shareableLink)}>Open in Drive</button>
        </div>
      ) : (
        <div>
          <p>Ready to upload: {exportedFilePath.split('/').pop()}</p>
          <button onClick={handleUpload}>Upload to Google Drive</button>
        </div>
      )}
      
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

---

## Phase 7: Additional Polish

### 7.1 Keyboard Shortcuts

**Complete Shortcut List:**
```javascript
const keyboardShortcuts = {
  // Playback
  'Space': 'Play/Pause',
  'K': 'Play/Pause (alternate)',
  'J': 'Rewind 1 second',
  'L': 'Fast forward 1 second',
  'Left Arrow': 'Previous frame',
  'Right Arrow': 'Next frame',
  'Home': 'Jump to start',
  'End': 'Jump to end',
  
  // Editing
  'Delete': 'Delete selected clip',
  'Backspace': 'Delete selected clip',
  'Cmd+C': 'Copy clip',
  'Cmd+V': 'Paste clip',
  'Cmd+X': 'Cut clip',
  'Cmd+D': 'Duplicate clip',
  'S': 'Split clip at playhead',
  'I': 'Set in-point',
  'O': 'Set out-point',
  
  // Timeline
  'Cmd++': 'Zoom in timeline',
  'Cmd+-': 'Zoom out timeline',
  'Cmd+0': 'Reset zoom',
  
  // Project
  'Cmd+N': 'New project',
  'Cmd+O': 'Open project',
  'Cmd+S': 'Save project',
  'Cmd+Shift+S': 'Save As',
  'Cmd+Z': 'Undo',
  'Cmd+Shift+Z': 'Redo',
  
  // Export
  'Cmd+E': 'Export video',
  
  // UI
  'Cmd+,': 'Open preferences',
  'Cmd+/': 'Show keyboard shortcuts'
};
```

**Implementation:**
```jsx
function KeyboardShortcutHandler({ 
  onPlay, onPause, onDelete, onSplit, onSetInPoint, onSetOutPoint,
  onZoomIn, onZoomOut, onUndo, onRedo, onSave, onExport 
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in input
      if (e.target.tagName.match(/INPUT|TEXTAREA/)) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Playback shortcuts
      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        onPlay();
      } else if (e.key === 'j') {
        e.preventDefault();
        // Rewind logic
      } else if (e.key === 'l') {
        e.preventDefault();
        // Fast forward logic
      }
      
      // Editing shortcuts
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete();
      } else if (e.key === 's' && !modKey) {
        e.preventDefault();
        onSplit();
      } else if (e.key === 'i') {
        e.preventDefault();
        onSetInPoint();
      } else if (e.key === 'o') {
        e.preventDefault();
        onSetOutPoint();
      }
      
      // Project shortcuts
      else if (modKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
      } else if (modKey && e.key === 's') {
        e.preventDefault();
        onSave();
      } else if (modKey && e.key === 'e') {
        e.preventDefault();
        onExport();
      }
      
      // Timeline zoom
      else if (modKey && e.key === '=') {
        e.preventDefault();
        onZoomIn();
      } else if (modKey && e.key === '-') {
        e.preventDefault();
        onZoomOut();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return null;
}
```

### 7.2 Timeline Zoom

**Requirements:**
- ✅ Zoom levels: 25%, 50%, 100%, 200%, 400%
- ✅ Zoom in/out buttons
- ✅ Keyboard shortcuts: Cmd++ / Cmd+-
- ✅ Mouse wheel zoom (with Cmd held)
- ✅ Center zoom around playhead position

**Implementation:**
```jsx
function Timeline({ clips, playheadPosition }) {
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0 = 100%, 2.0 = 200%
  const PIXELS_PER_SECOND = 50 * zoomLevel;
  
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 4.0)); // Max 400%
  };
  
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.25)); // Min 25%
  };
  
  const resetZoom = () => {
    setZoomLevel(1.0);
  };
  
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    };
    
    const timelineEl = document.querySelector('.timeline');
    timelineEl?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      timelineEl?.removeEventListener('wheel', handleWheel);
    };
  }, []);
  
  return (
    <div className="timeline-container">
      <div className="timeline-controls">
        <button onClick={zoomOut}>-</button>
        <span>{Math.round(zoomLevel * 100)}%</span>
        <button onClick={zoomIn}>+</button>
        <button onClick={resetZoom}>Reset</button>
      </div>
      
      <div className="timeline" style={{ overflowX: 'auto' }}>
        {clips.map((clip, idx) => {
          const startPosition = clips.slice(0, idx).reduce((sum, c) => sum + c.duration, 0);
          return (
            <div
              key={clip.id}
              style={{
                position: 'absolute',
                left: `${startPosition * PIXELS_PER_SECOND}px`,
                width: `${clip.duration * PIXELS_PER_SECOND}px`,
                height: '80px'
              }}
            >
              {clip.filename}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 7.3 Snap-to-Edges

**Requirements:**
- ✅ When dragging clip, snap to edges of other clips
- ✅ Snap threshold: 10 pixels (or 0.2 seconds in timeline)
- ✅ Visual indicator when snapping occurs
- ✅ Toggle on/off in preferences

**Implementation:**
```jsx
function Timeline({ clips, onClipMove, snapEnabled }) {
  const SNAP_THRESHOLD = 0.2; // seconds
  
  const findSnapPosition = (draggedClip, proposedPosition) => {
    if (!snapEnabled) return proposedPosition;
    
    // Get all clip edges
    const edges = [];
    clips.forEach(clip => {
      if (clip.id === draggedClip.id) return;
      edges.push(clip.position); // Start edge
      edges.push(clip.position + clip.duration); // End edge
    });
    
    // Check if proposed position is close to any edge
    for (const edge of edges) {
      if (Math.abs(proposedPosition - edge) < SNAP_THRESHOLD) {
        return edge; // Snap to this edge
      }
    }
    
    return proposedPosition;
  };
  
  const handleClipDrag = (clipId, newPosition) => {
    const clip = clips.find(c => c.id === clipId);
    const snappedPosition = findSnapPosition(clip, newPosition);
    
    onClipMove(clipId, snappedPosition);
    
    // Visual feedback if snapped
    if (snappedPosition !== newPosition) {
      // Show snap indicator (flash or border)
      showSnapIndicator();
    }
  };
  
  // ... rest of timeline implementation
}
```

### 7.4 Preferences/Settings

**Requirements:**
- ✅ Auto-save interval (1-10 minutes)
- ✅ Default export resolution
- ✅ Default export quality (CRF value)
- ✅ Timeline snap enabled/disabled
- ✅ Keyboard shortcuts customization (advanced)
- ✅ Theme: Light/Dark mode

**UI Component:**
```jsx
function PreferencesDialog({ onClose }) {
  const [settings, setSettings] = useState({
    autoSaveInterval: 2, // minutes
    defaultResolution: '1080p',
    defaultQuality: 23, // CRF
    snapEnabled: true,
    theme: 'dark'
  });
  
  const saveSettings = async () => {
    await invoke('save_preferences', { settings });
    onClose();
  };
  
  return (
    <div className="preferences-dialog">
      <h2>Preferences</h2>
      
      <section>
        <h3>Project</h3>
        <label>
          Auto-save interval (minutes):
          <input 
            type="number" 
            min="1" 
            max="10"
            value={settings.autoSaveInterval}
            onChange={(e) => setSettings({...settings, autoSaveInterval: parseInt(e.target.value)})}
          />
        </label>
      </section>
      
      <section>
        <h3>Export</h3>
        <label>
          Default resolution:
          <select 
            value={settings.defaultResolution}
            onChange={(e) => setSettings({...settings, defaultResolution: e.target.value})}
          >
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="4k">4K</option>
          </select>
        </label>
        
        <label>
          Quality (CRF): {settings.defaultQuality}
          <input 
            type="range"
            min="18"
            max="28"
            value={settings.defaultQuality}
            onChange={(e) => setSettings({...settings, defaultQuality: parseInt(e.target.value)})}
          />
          <small>Lower = better quality, larger file</small>
        </label>
      </section>
      
      <section>
        <h3>Timeline</h3>
        <label>
          <input 
            type="checkbox"
            checked={settings.snapEnabled}
            onChange={(e) => setSettings({...settings, snapEnabled: e.target.checked})}
          />
          Enable snap-to-edges
        </label>
      </section>
      
      <section>
        <h3>Appearance</h3>
        <label>
          Theme:
          <select 
            value={settings.theme}
            onChange={(e) => setSettings({...settings, theme: e.target.value})}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
      </section>
      
      <div className="dialog-actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={saveSettings}>Save</button>
      </div>
    </div>
  );
}
```

---

## Technical Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClipForge Application                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Frontend (Renderer)                   │   │
│  │                                                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │   │
│  │  │ Video    │  │ Timeline │  │ Effects  │  │ Export  │ │   │
│  │  │ Player   │  │ Editor   │  │ Panel    │  │ Manager │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │   │
│  │                                                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │Recording │  │ Project  │  │ Cloud    │              │   │
│  │  │ Manager  │  │ Manager  │  │ Upload   │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  │                                                           │   │
│  │         State: Undo/Redo History, Timeline Data          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           │ Tauri IPC (invoke/listen)            │
│                           ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Tauri Backend (Rust)                        │   │
│  │                                                           │   │
│  │  Commands:                                               │   │
│  │  • Screen/Webcam Recording (AVFoundation)               │   │
│  │  • Video Processing (FFmpeg CLI)                        │   │
│  │  • File I/O (Save/Load Projects)                        │   │
│  │  • OAuth (Google Drive)                                 │   │
│  │  • Metadata Extraction (FFprobe)                        │   │
│  │                                                           │   │
│  │  File System:                                            │   │
│  │  • ~/Library/Application Support/ClipForge/             │   │
│  │    - autosave.clipforge                                 │   │
│  │    - recordings/                                         │   │
│  │    - temp/                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           │ Process::Command                     │
│                           ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         External Tools (Bundled Binaries)                │   │
│  │                                                           │   │
│  │  • FFmpeg (video encoding, filters, compositing)        │   │
│  │  • FFprobe (metadata extraction)                        │   │
│  │                                                           │   │
│  │  Recording Sources (macOS):                              │   │
│  │  • AVFoundation (screen capture)                        │   │
│  │  • MediaDevices API (webcam via web)                    │   │
│  │  • CoreAudio (microphone)                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

**Recording Flow:**
```
User clicks "Record Screen"
  ↓
React: Show recording settings panel
  ↓
User configures: Source (full screen/window), Audio (system/mic)
  ↓
React → invoke('start_screen_recording')
  ↓
Rust: Launch FFmpeg with avfoundation
  ↓
FFmpeg captures screen + audio → Saves to temp file
  ↓
Rust: Emit progress events → React updates timer
  ↓
User clicks "Stop"
  ↓
Rust: Stop FFmpeg process
  ↓
Rust: Move temp file to recordings/
  ↓
React: Add clip to timeline
```

**Export Flow:**
```
User clicks "Export"
  ↓
React: Show export settings (resolution, preset)
  ↓
React → invoke('export_timeline')
  ↓
Rust: Build FFmpeg command based on:
  - Main track clips (concat)
  - Overlay track clips (overlay filter)
  - Transitions (xfade filter)
  - Text overlays (drawtext filter)
  - Filters per clip (eq, hue, unsharp)
  ↓
Rust: Execute FFmpeg with complex filter chain
  ↓
Rust: Parse stderr, emit progress events
  ↓
React: Update progress bar
  ↓
FFmpeg completes
  ↓
React: Show "Export complete" + option to upload
```

**Complex Filter Chain Example:**
```bash
ffmpeg \
  -i main_clip1.mp4 -i main_clip2.mp4 -i overlay.mp4 \
  -filter_complex "
    [0:v]eq=brightness=0.1[v0];
    [1:v]eq=contrast=1.2[v1];
    [v0][v1]xfade=transition=fade:duration=1:offset=9[main];
    [2:v]scale=480:270[pip];
    [main][pip]overlay=x=W-w-10:y=H-h-10[video];
    [video]drawtext=text='Hello':fontfile=Arial.ttf:x=100:y=100[final]
  " \
  -map "[final]" -map 0:a \
  output.mp4
```

### File Structure

```
clipforge/
├── src/                          # React frontend
│   ├── App.jsx                   # Main app component
│   ├── components/
│   │   ├── VideoPlayer.jsx       # Video preview + controls
│   │   ├── Timeline.jsx          # Multi-track timeline
│   │   ├── TrimControls.jsx      # In/out point UI
│   │   ├── EffectsPanel.jsx      # Filters, transitions
│   │   ├── TextOverlayEditor.jsx # Text overlay UI
│   │   ├── RecordingPanel.jsx    # Screen/webcam recording UI
│   │   ├── ExportDialog.jsx      # Export settings
│   │   ├── PiPEditor.jsx         # PiP positioning
│   │   └── PreferencesDialog.jsx # Settings
│   ├── hooks/
│   │   ├── useUndoRedo.js        # Undo/redo logic
│   │   ├── useKeyboardShortcuts.js
│   │   └── useAutoSave.js
│   └── utils/
│       ├── ffmpegHelpers.js      # FFmpeg command builders
│       └── timelineHelpers.js
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri app + commands
│   │   ├── recording.rs          # Screen/webcam recording
│   │   ├── export.rs             # Video export logic
│   │   ├── project.rs            # Save/load projects
│   │   └── cloud.rs              # Google Drive upload
│   ├── binaries/
│   │   ├── ffmpeg                # macOS binary
│   │   └── ffprobe               # macOS binary
│   ├── Cargo.toml
│   └── tauri.conf.json
│
└── README.md
```

---

## Testing Strategy

### Unit Tests
- FFmpeg command builders (verify correct arguments)
- Timeline position calculations
- Undo/redo state management
- Filter value conversions

### Integration Tests
- Import → Timeline → Export workflow
- Recording → Save to timeline
- Apply filters → Export with filters
- Multi-track export with PiP

### Manual Testing Checklist
- [ ] Record screen (full screen)
- [ ] Record screen (specific window)
- [ ] Record webcam
- [ ] Record screen + webcam simultaneously
- [ ] Add clip to overlay track → PiP appears
- [ ] Resize PiP (drag corners)
- [ ] Move PiP (drag box)
- [ ] Add text overlay
- [ ] Add transition between clips
- [ ] Apply filters to clip
- [ ] Adjust audio volume
- [ ] Export with custom resolution
- [ ] Export with platform preset
- [ ] Save project
- [ ] Load project
- [ ] Undo/redo actions
- [ ] Auto-save recovery
- [ ] Upload to Google Drive
- [ ] All keyboard shortcuts work

---

## Performance Considerations

### Optimization Strategies

1. **Timeline Rendering**
   - Use React.memo for clip components
   - Virtualize timeline if >100 clips
   - Debounce zoom/pan updates

2. **Video Preview**
   - Hardware-accelerated `<video>` element
   - Don't load multiple videos simultaneously
   - Release video resources when switching clips

3. **FFmpeg Processing**
   - Use `-c copy` when possible (no re-encoding)
   - For filters: Use GPU acceleration if available (`-hwaccel videotoolbox` on macOS)
   - Process clips in parallel when independent

4. **Project Files**
   - Store file paths, not video data
   - Compress JSON with gzip if >1MB
   - Lazy-load clip thumbnails

5. **Memory Management**
   - Clear undo history beyond 50 levels
   - Cleanup temp files after export
   - Don't keep full project in memory during export

---

## Deployment Checklist

### Before Release
- [ ] Bundle FFmpeg binaries for macOS
- [ ] Code signing with Apple Developer certificate
- [ ] Notarization for macOS (required for Catalina+)
- [ ] Test on multiple macOS versions (11, 12, 13, 14)
- [ ] Verify all recording permissions work (camera, microphone, screen recording)
- [ ] Test with various video formats and resolutions
- [ ] Ensure project files are forward-compatible
- [ ] Write comprehensive README with screenshots
- [ ] Create demo video showing all features
- [ ] Upload to GitHub Releases

### Distribution
- [ ] .dmg file for macOS
- [ ] Installer includes FFmpeg binaries
- [ ] App is self-contained (no external dependencies)
- [ ] First launch: Request permissions gracefully
- [ ] Include sample project file
- [ ] Provide troubleshooting guide

---

## Future Enhancements (Beyond Scope)

### Advanced Features
- Windows support (requires different recording APIs)
- Real-time collaborative editing
- Cloud storage for projects
- AI-powered features:
  - Auto-captioning
  - Smart crop (follow subject)
  - Noise reduction
- Advanced color grading
- Green screen (chroma key)
- Motion tracking
- Audio waveform editing
- VST plugin support
- Hardware encoding (Apple Silicon, NVIDIA)

---

## Summary

This Post-MVP plan transforms ClipForge from a basic video editor into a professional-grade application with:

1. **Complete recording suite** (screen, webcam, audio)
2. **Multi-track editing** with PiP
3. **Professional effects** (text, transitions, filters)
4. **Flexible export** (resolutions, presets, progress tracking)
5. **Project management** (save/load, auto-save, undo/redo)
6. **Cloud integration** (Google Drive upload)
7. **Power-user features** (keyboard shortcuts, timeline zoom, snap)

**Estimated Total Development Time:** 50-70 hours

**Priority Order:**
1. Recording (15 hours) - HIGHEST PRIORITY
2. Multi-track/PiP (12 hours)
3. Effects (16 hours)
4. Export enhancements (8 hours)
5. Project management (10 hours)
6. Cloud upload (8 hours)

This creates a complete, shipping-ready desktop video editor that meets all original requirements with depth and polish.**FFmpeg Implementation:**
```bash
ffmpeg -i input.mp4 \
  -af "volume=1.5,afade=t=in:st=0:d=2,afade=t=out:st=8:d=2" \
  output.mp4
```

Where:
- `volume=1.5` increases volume by 50%
- `afade=t=in:st=0:d=2` fades in audio for 2 seconds from start
- `afade=t=out:st=8:d=2` fades out audio for 2 seconds starting at 8s

---

## Phase 4: Export Enhancements

### 4.1 Resolution Options

**Requirements:**
- ✅ Source resolution (maintain original)
- ✅ Common presets:
  - 480p (854x480)
  - 720p (1280x720)
  - 1080p (1920x1080)
  - 1440p (2560x1440)
  - 4K (3840x2160)
- ✅ Support both upscaling and downscaling
- ✅ Maintain aspect ratio (add letterbox/pillarbox if needed)
- ✅ Warning for upscaling: "Quality may be reduced"

**UI Component:**
```jsx
function ExportSettings({ onExport }) {
  const [resolution, setResolution] = useState('source');
  const [sourceResolution, setSourceResolution] = useState({ width: 1920, height: 1080 });
  
  const resolutionPresets = [
    { value: 'source', label: 'Source (1920x1080)', width: sourceResolution.width, height: sourceResolution.height },
    { value: '480p', label: '480p (854x480)', width: 854, height: 480 },
    { value: '720p', label: '720p (1280x720)', width: 1280, height: 720 },
    { value: '1080p', label: '1080p (1920x1080)', width: 1920, height: 1080 },
    { value: '1440p', label: '1440p (2560x1440)', width: 2560, height: 1440 },
    { value: '4k', label: '4K (3840x2160)', width: 3840, height: 2160 }
  ];
  
  const selectedPreset = resolutionPresets.find(p => p.value === resolution);
  const isUpscaling = selectedPreset.width > sourceResolution.width || 
                      selectedPreset.height > sourceResolution.height;
  
  return (
    <div className="export-settings">
      <label>Export Resolution</label>
      <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
        {resolutionPresets.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      
      {isUpscaling && resolution !== 'source' && (
        <div className="warning">
          ⚠️ Upscaling from {sourceResolution.width}x{sourceResolution.height} to {selectedPreset.width}x{selectedPreset.height}. 
          Quality may be reduced.
        </div>
      )}
      
      <button onClick={() => onExport({ resolution: selectedPreset })}>
        Export Video
      </button>
    </div>
  );
}
```

**FFmpeg Implementation:**
```rust
#[tauri::command]
async fn export_with_resolution(
    input_path: String,
    output_path: String,
    target_width: i32,
    target_height: i32
) -> Result<String, String> {
    let ffmpeg_path = // ... resolve FFmpeg
    
    // Use scale filter with aspect ratio preservation
    let filter = format!(
        "scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2",
        target_width, target_height, target_width, target_height
    );
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-i", &input_path,
            "-vf", &filter,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            &output_path
        ])
        .output()
        .map_err(|e| format!("FFmpeg error: {}", e))?;
    
    if output.status.success() {
        Ok("Export complete".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
```

### 4.2 Platform Presets

**Requirements:**
- ✅ YouTube preset: 1080p, H.264, high bitrate (8 Mbps)
- ✅ Instagram preset: 1080x1080 (square), H.264, 5 Mbps
- ✅ TikTok preset: 1080x1920 (vertical 9:16), H.264, 6 Mbps
- ✅ Twitter preset: 1280x720, H.264, 5 Mbps
- ✅ Custom preset: User-defined settings

**Data Structure:**
```javascript
const exportPresets = {
  youtube: {
    name: 'YouTube',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    codec: 'libx264',
    videoBitrate: '8M',
    audioBitrate: '192k',
    frameRate: 30,
    preset: 'medium',
    crf: 21
  },
  instagram: {
    name: 'Instagram Feed',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    codec: 'libx264',
    videoBitrate: '5M',
    audioBitrate: '128k',
    frameRate: 30,
    preset: 'medium',
    crf: 23
  },
  tiktok: {
    name: 'TikTok',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    codec: 'libx264',
    videoBitrate: '6M',
    audioBitrate: '128k',
    frameRate: 30,
    preset: 'medium',
    crf: 23
  },
  twitter: {
    name: 'Twitter',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    codec: 'libx264',
    videoBitrate: '5M',
    audioBitrate: '128k',
    frameRate: 30,
    preset: 'medium',
    crf: 23
  }
};
```

**UI Component:**
```jsx
function PlatformPresetSelector({ onSelect }) {
  const [selectedPreset, setSelectedPreset] = useState('youtube');
  
  return (
    <div className="platform-preset-selector">
      <h3>Export for Platform</h3>
      <div className="preset-grid">
        {Object.entries(exportPresets).map(([key, preset]) => (
          <div 
            key={key}
            className={`preset-card ${selectedPreset === key ? 'selected' : ''}`}
            onClick={() => setSelectedPreset(key)}
          >
            <h4>{preset.name}</h4>
            <p>{preset.width}x{preset.height}</p>
            <p>{preset.aspectRatio}</p>
            <p>{preset.videoBitrate} bitrate</p>
          </div>
        ))}
      </div>
      
      <button onClick={() => onSelect(exportPresets[selectedPreset])}>
        Export for {exportPresets[selectedPreset].name}
      </button>
    </div>
  );
}
```

**FFmpeg Implementation:**
```rust
#[tauri::command]
async fn export_with_preset(
    input_path: String,
    output_path: String,
    preset: ExportPreset
) -> Result<String, String> {
    let filter = format!(
        "scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2:color=black",
        preset.width, preset.height, preset.width, preset.height
    );
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-i", &input_path,
            "-vf", &filter,
            "-c:v", &preset.codec,
            "-b:v", &preset.video_bitrate,
            "-preset", &preset.preset,
            "-crf", &preset.crf.to_string(),
            "-r", &preset.frame_rate.to_string(),
            "-c:a", "aac",
            "-b:a", &preset.audio_bitrate,
            &output_path
        ])
        .output()
        .map_err(|e| format!("FFmpeg error: {}", e))?;
    
    if output.status.success() {
        Ok("Export complete".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
```

### 4.3 Real-Time Export Progress

**Requirements:**
- ✅ Parse FFmpeg stderr output
- ✅ Extract progress information (frame, time, percentage)
- ✅ Update UI in real-time
- ✅ Show estimated time remaining
- ✅ Cancel button (kill FFmpeg process)

**Implementation:**

**Rust (Streaming FFmpeg Output):**
```rust
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::Manager;

#[tauri::command]
async fn export_with_progress(
    app_handle: tauri::AppHandle,
    input_path: String,
    output_path: String,
    duration: f64  // Total video duration for percentage calculation
) -> Result<String, String> {
    let ffmpeg_path = // ... resolve FFmpeg
    
    let mut child = Command::new(ffmpeg_path)
        .args(["-i", &input_path, "-progress", "pipe:1", &output_path])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start FFmpeg: {}", e))?;
    
    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);
    
    for line in reader.lines() {
        let line = line.unwrap();
        
        // Parse FFmpeg progress output
        if line.starts_with("out_time_ms=") {
            let time_ms: f64 = line.split('=').nth(1).unwrap().parse().unwrap_or(0.0);
            let current_seconds = time_ms / 1_000_000.0;
            let percentage = (current_seconds / duration * 100.0).min(100.0);
            
            // Emit progress event to frontend
            app_handle.emit_all("export-progress", ExportProgress {
                percentage,
                current_time: current_seconds,
                total_time: duration
            }).ok();
        }
    }
    
    let status = child.wait().map_err(|e| format!("FFmpeg wait error: {}", e))?;
    
    if status.success() {
        Ok("Export complete".to_string())
    } else {
        Err("Export failed".to_string())
    }
}

#[derive(Clone, serde::Serialize)]
struct ExportProgress {
    percentage: f64,
    current_time: f64,
    total_time: f64
}
```

**React (Progress UI):**
```jsx
import { listen } from '@tauri-apps/api/event';

function ExportProgressDialog({ onCancel }) {
  const [progress, setProgress] = useState({ percentage: 0, current_time: 0, total_time: 0 });
  const [startTime] = useState(Date.now());
  
  useEffect(() => {
    const unlisten = listen('export-progress', (event) => {
      setProgress(event.payload);
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);
  
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const estimatedTotal = progress.percentage > 0 
    ? (elapsedSeconds / progress.percentage) * 100 
    : 0;
  const remainingSeconds = estimatedTotal - elapsedSeconds;
  
  return (
    <div className="export-progress-dialog">
      <h3>Exporting Video...</h3>
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      
      <p>{progress.percentage.toFixed(1)}% complete</p>
      <p>Time: {progress.current_time.toFixed(1)}s / {progress.total_time.toFixed(1)}s</p>
      
      {remainingSeconds > 0 && (
        <p>Estimated time remaining: {Math.ceil(remainingSeconds)}s</p>
      )}
      
      <button onClick={onCancel}>Cancel Export</button>
    </div>
  );
}
```

---

## Phase 5: Project Management

### 5.1 Save/Load Project

**Requirements:**
- ✅ Save project as `.clipforge` file (JSON format)
- ✅ Store all project data:
  - Clips on all tracks (paths, trim points, positions)
  - PiP settings
  - Filters and effects
  - Transitions
  - Text overlays
  - Timeline state
- ✅ Load project restores complete state
- ✅ File dialog for Save As / Open

**Project File Structure:**
```json
{
  "version": "1.0.0",
  "projectName": "My Video Project",
  "createdAt": "2025-10-28T12:00:00Z",
  "lastModified": "2025-10-28T14:30:00Z",
  "timeline": {
    "mainTrack": [
      {
        "id": "clip-1",
        "path": "/Users/name/video1.mp4",
        "filename": "video1.mp4",
        "duration": 10.5,
        "inPoint": 0,
        "outPoint": 10.5,
        "position": 0,
        "filters": {
          "brightness": 10,
          "contrast": 0,
          "saturation": 20
        },
        "volume": 1.5,
        "fadeIn": 1.0,
        "fadeOut": 1.0
      }
    ],
    "overlayTrack": [
      {
        "id": "clip-2",
        "path": "/Users/name/webcam.mp4",
        "position": 5.0,
        "duration": 8.0,
        "pipSettings": {
          "x": 0.7,
          "y": 0.7,
          "width": 0.25,
          "height": 0.25,
          "opacity": 1.0
        }
      }
    ]
  },
  "transitions": [
    {
      "type": "fade",
      "duration": 1.0,
      "between": ["clip-1", "clip-3"],
      "position": 10.5
    }
  ],
  "textOverlays": [
    {
      "id": "text-1",
      "content": "Hello World",
      "font": "Arial",
      "fontSize": 36,
      "color": "#FFFFFF",
      "position": { "x": 0.5, "y": 0.1 },
      "startTime": 2.0,
      "duration": 3.0
    }
  ]
}
```

**Implementation:**

**Rust (Save/Load):**
```rust
use std::fs::File;
use std::io::{Write, Read};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct ClipForgeProject {
    version: String,
    project_name: String,
    created_at: String,
    last_modified: String,
    timeline: Timeline,
    transitions: Vec<Transition>,
    text_overlays: Vec<TextOverlay>
}

#[tauri::command]
async fn save_project(
    project_data: ClipForgeProject,
    file_path: String
) -> Result<String, String> {
    let json = serde_json::to_string_pretty(&project_data)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;
    
    let mut file = File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    file.write_all(json.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(format!("Project saved to {}", file_path))
}

#[tauri::command]
async fn load_project(file_path: String) -> Result<ClipForgeProject, String> {
    let mut file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let project: ClipForgeProject = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse project: {}", e))?;
    
    Ok(project)
}

#[tauri::command]
async fn select_project_save_path(default_name: String) -> Result<String, String> {
    let result = FileDialogBuilder::new()
        .set_file_name(&default_name)
        .add_filter("ClipForge Project", &["clipforge"])
        .save_file();
    
    match result {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("No file selected".to_string())
    }
}

#[tauri::command]
async fn select_project_open_path() -> Result<String, String> {
    let result = FileDialogBuilder::new()
        .add_filter("ClipForge Project", &["clipforge"])
        .pick_file();
    
    match result {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("No file selected".to_string())
    }
}
```

**React (Save/Load UI):**
```jsx
function ProjectMenu({ projectState, onLoad }) {
  const [currentProjectPath, setCurrentProjectPath] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const handleSave = async () => {
    if (currentProjectPath) {
      // Save to existing path
      await invoke('save_project', {
        projectData: projectState,
        filePath: currentProjectPath
      });
      setHasUnsavedChanges(false);
    } else {
      // Save As
      await handleSaveAs();
    }
  };
  
  const handleSaveAs = async () => {
    try {
      const filePath = await invoke('select_project_save_path', {
        defaultName: 'My-Project.clipforge'
      });
      
      await invoke('save_project', {
        projectData: {
          ...projectState,
          lastModified: new Date().toISOString()
        },
        filePath
      });
      
      setCurrentProjectPath(filePath);
      setHasUnsavedChanges(false);
      alert('Project saved successfully!');
    } catch (error) {
      alert(`Failed to save: ${error}`);
    }
  };
  
  const handleOpen = async () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Continue?');
      if (!confirm) return;
    }
    
    try {
      const filePath = await invoke('select_project_open_path');
      const projectData = await invoke('load_project', { filePath });
      
      onLoad(projectData);
      setCurrentProjectPath(filePath);
      setHasUnsavedChanges(false);
    } catch (error) {
      alert(`Failed to open: ${error}`);
    }
  };
  
  const handleNew = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Continue?');
      if (!confirm) return;
    }
    
    onLoad(createNewProject());
    setCurrentProjectPath(null);
    setHasUnsavedChanges(false);
  };
  
  return (
    <div className="project-menu">
      <button onClick={handleNew}>New Project</button>
      <button onClick={handleOpen}>Open Project</button>
      <button onClick={handleSave} disabled={!hasUnsavedChanges}>
        Save {hasUnsavedChanges && '*'}
      </button>
      <button onClick={handleSaveAs}>Save As...</button>
    </div>
  );
}
```

### 5.2 Auto-Save

**Requirements:**
- ✅ Auto-save every 2 minutes (configurable)
- ✅ Save to temp location: `~/Library/Application Support/ClipForge/autosave.clipforge`
- ✅ On app launch, check for autosave file
- ✅ Prompt user: "Restore previous session?"
- ✅ Delete autosave after successful manual save

**Implementation:**

```jsx
function AutoSave({ projectState }) {
  const AUTOSAVE_INTERVAL = 120000; // 2 minutes
  const AUTOSAVE_PATH = '~/Library/Application Support/ClipForge/autosave.clipforge';
  
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await invoke('save_project', {
          projectData: projectState,
          filePath: AUTOSAVE_PATH
        });
        console.log('Auto-saved at', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, AUTOSAVE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [projectState]);
  
  return null; // No UI, runs in background
}

function App() {
  const [projectState, setProjectState] = useState(null);
  
  useEffect(() => {
    // Check for autosave on app launch
    const checkAutosave = async () => {
      try {
        const autosaveExists = await invoke('check_file_exists', {
          path: AUTOSAVE_PATH
        });
        
        if (autosaveExists) {
          const restore = window.confirm(
            'Found an autosaved project. Would you like to restore it?'
          );
          
          if (restore) {
            const project = await invoke('load_project', { 
              filePath: AUTOSAVE_PATH 
            });
            setProjectState(project);
          } else {
            // Delete autosave
            await invoke('delete_file', { path: AUTOSAVE_PATH });
          }
        }
      } catch (error) {
        console.error('Error checking autosave:', error);
      }
    };
    
    checkAutosave();
  }, []);
  
  return (
    <>
      <AutoSave projectState={projectState} />
      {/* Rest of app */}
    </>
  );
}
```

### 5.3 Undo/Redo

**Requirements:**
- ✅ Track all undoable actions:
  - Add/remove clip
  - Move clip
  - Trim clip
  - Add/remove transition
  - Add/remove text
  - Change filters
  - Change PiP settings
- ✅ 50 levels of undo/redo
- ✅ Keyboard shortcuts: Cmd+Z (undo), Cmd+Shift+Z (redo)
- ✅ Undo/Redo buttons in UI
- ✅ Show action name in undo menu (optional)

**Implementation:**

```jsx
// Undo/Redo Hook
function useUndoRedo(initialState) {
  const [past, setPast] = useState([]);
  const [present, setPresent] = useState(initialState);
  const [future, setFuture] = useState([]);
  
  const MAX_HISTORY = 50;
  
  const setState = (newState, actionName = 'Action') => {
    setPast(prev => [...prev.slice(-MAX_HISTORY + 1), { state: present, action: actionName }]);
    setPresent(newState);
    setFuture([]);  // Clear future when new action is performed
  };
  
  const undo = () => {
    if (past.length === 0) return;
    
    const previous = past[past.length - 1];
    setPast(prev => prev.slice(0, -1));
    setFuture(prev => [{ state: present, action: previous.action }, ...prev]);
    setPresent(previous.state);
  };
  
  const redo = () => {
    if (future.length === 0) return;
    
    const next = future[0];
    setFuture(prev => prev.slice(1));
    setPast(prev => [...prev, { state: present, action: next.action }]);
    setPresent(next.state);
  };
  
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  
  return { state: present, setState, undo, redo, canUndo, canRedo };
}

// Usage in App
function App() {
  const {
    state: timeline,
    setState: setTimeline,
    undo,
    redo,
    canUndo,
    canRedo
  } = useUndoRedo(initialTimeline);
  
  const addClip = (clip) => {
    setTimeline({
      ...timeline,
      mainTrack: [...timeline.mainTrack, clip]
    }, 'Add Clip');
  };
  
  const deleteClip = (clipId) => {
    setTimeline({
      ...timeline,
      mainTrack: timeline.mainTrack.filter(c => c.id !== clipId)
    }, 'Delete Clip');
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        Undo (Cmd+Z)
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo (Cmd+Shift+Z)
      </button>
      {/* Rest of app */}
    </div>
  );
}
```

---

## Phase 6: Cloud Upload (Nice-to-Have)

### 6.1 Google Drive Integration

**Requirements:**
- ✅ OAuth 2.0 authentication
- ✅ Upload exported video to Google Drive
- ✅ Progress indicator during upload
- ✅ Generate shareable link
- ✅ Copy link to clipboard

**Implementation:**

**Setup Google OAuth:**
1. Create project in Google Cloud Console
2. Enable Google Drive API
3. Create OAuth 2.0 credentials (Desktop app)
4. Add redirect URI: `http://localhost:8000/oauth/callback`

**Rust (OAuth Flow):**
```rust
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl};
use oauth2::basic::BasicClient;

#[tauri::command]
async fn initiate_google_oauth() -> Result<String, String> {
    let client = BasicClient::new(
        ClientId::new("YOUR_CLIENT_ID".to_string()),
        Some(ClientSecret::new("YOUR_CLIENT_SECRET".to_string())),
        AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).unwrap(),
        Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).unwrap())
    )
    .set_redirect_uri(RedirectUrl::new("http://localhost:8000/oauth/callback".to_string()).unwrap());
    
    let (auth_url, _csrf_token) = client
        .authorize_url(|| oauth2::CsrfToken::new_random())
        .add_scope(oauth2::Scope::new("https://www.googleapis.com/auth/drive.file".to_string()))
        .url();
    
    // Open browser to auth_url
    open::that(auth_url.to_string()).ok();
    
    Ok(auth_url.to_string())
}

#[tauri::command]
async fn upload_to_google_drive(
    file_path: String,
    access_token: String
) -> Result<String, String> {
    // Use reqwest to upload file
    let client = reqwest::Client::new();
    
    let file = tokio::fs::read(&file_path).await
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let response = client
        .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=media")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("Content-Type", "video/mp4")
        .body(file)
        .send()
        .await
        .map_err(|e| format!("Upload failed: {}", e))?;
    
    let json: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let file_id = json["id"].as_str().unwrap();
    
    // Generate shareable link
    let share_response = client
        .post(format!("https://www.googleapis.com/drive/v3/files/{}/permissions", file_id))
        .header("Authorization", format!("Bearer {}", access_token))
        .json(&serde_json::json!({
            "role": "reader",
            "type": "anyone"
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to share: {}", e))?;
    
    let shareable_link = format!("https://drive.google.com/file/d/{}/view", file_id);
    
    Ok(shareable_link)
}
```

**React (Upload UI):**
```# ClipForge Post-MVP - Product Requirements Document

**Status:** Post-MVP (Full Feature Set)  
**Target Platform:** macOS (primary)  
**Prerequisites:** MVP completed and tested

---

## Executive Summary

This document covers all features **beyond the MVP** to create a production-ready, professional desktop video editor. The MVP established core functionality (import, timeline, trim, export). Post-MVP adds:

1. **Recording capabilities** (screen, webcam, audio)
2. **Multi-track editing** (main + overlay/PiP)
3. **Effects and transitions** (text, filters, crossfades)
4. **Enhanced export** (resolution options, platform presets)
5. **Project management** (save/load, undo/redo, auto-save)
6. **Cloud integration** (Google Drive upload)

**Development Phases:**
- Phase 1: Recording (10-15 hours)
- Phase 2: Multi-Track Timeline (8-12 hours)
- Phase 3: Effects & Transitions (12-16 hours)
- Phase 4: Export Enhancements (6-8 hours)
- Phase 5: Project Management (8-10 hours)
- Phase 6: Cloud Upload (6-8 hours)

**Total Estimated Time:** 50-70 hours

---

## Phase 1: Recording Features (HIGHEST PRIORITY)

### Overview
Enable users to capture screen, webcam, and audio directly within the app, saving recordings to timeline for immediate editing.

### 1.1 Screen Recording

**Requirements:**
- ✅ Record full screen (all displays if multiple monitors)
- ✅ Record specific window (user selects from list)
- ✅ Audio options: System audio OR Microphone (user toggle)
- ✅ Recording controls: Start, Stop, Pause/Resume
- ✅ Visual indicator: Red dot in menu bar or overlay
- ✅ Countdown timer: 3-2-1 before recording starts
- ✅ Save directly to timeline as new clip

**Technical Implementation:**

**macOS Screen Capture:**
```rust
// Use Tauri + macOS ScreenCaptureKit (macOS 12.3+)
// Alternative: AVFoundation for older macOS

use tauri::api::process::Command;

#[tauri::command]
async fn list_available_screens() -> Result<Vec<ScreenInfo>, String> {
    // Use screencapturekit-rs or FFmpeg avfoundation
    // Return list of displays and windows
}

#[tauri::command]
async fn start_screen_recording(
    app_handle: tauri::AppHandle,
    source_type: String,  // "fullscreen" or "window"
    source_id: String,    // Display ID or Window ID
    audio_source: String, // "system" or "microphone" or "none"
    output_path: String
) -> Result<String, String> {
    // Use FFmpeg with avfoundation input device
    // ffmpeg -f avfoundation -i "1:0" output.mp4
    // Where 1 = screen device, 0 = audio device
}
```

**FFmpeg Screen Capture on macOS:**
```bash
# Full screen with system audio
ffmpeg -f avfoundation -i "1:0" -r 30 output.mp4

# Specific window (requires window ID)
ffmpeg -f avfoundation -capture_cursor 1 -i "1:0" output.mp4

# With microphone instead
ffmpeg -f avfoundation -i "1:1" output.mp4
```

**UI Components:**
- Recording settings panel (before recording)
- Screen/Window selector dropdown
- Audio source toggle (System / Microphone / None)
- Preview window (shows what will be recorded)
- Recording controls (Start, Stop, Pause buttons)
- Timer display (recording duration)
- Status indicator (Recording... / Paused)

**User Flow:**
1. Click "Record Screen" button
2. Settings panel appears:
   - Select source: Full Screen / Window
   - If Window: Show list of open windows
   - Select audio: System / Microphone / None
3. Click "Start Recording"
4. 3-2-1 countdown
5. Recording starts (red indicator shows)
6. User performs actions
7. Click "Stop Recording"
8. Processing dialog shows
9. Clip appears on timeline

### 1.2 Webcam Recording

**Requirements:**
- ✅ Access system camera (permission prompt)
- ✅ Live preview window before recording
- ✅ Resolution selection (720p, 1080p, 4K if supported)
- ✅ Recording controls: Start, Stop, Pause/Resume
- ✅ Audio: Microphone on/off toggle
- ✅ Save directly to timeline as new clip

**Technical Implementation:**

**Webcam Access (Web APIs in Tauri):**
```javascript
// Frontend (React) - Web APIs work in Tauri
async function startWebcamPreview() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 }
    },
    audio: true
  });
  
  videoRef.current.srcObject = stream;
}

async function startWebcamRecording() {
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });
  
  const chunks = [];
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Save to file via Tauri
    await invoke('save_webcam_recording', {
      data: Array.from(uint8Array),
      filename: `webcam-${Date.now()}.webm`
    });
  };
  
  mediaRecorder.start();
}
```

**Tauri Backend (Save Recording):**
```rust
use std::fs::File;
use std::io::Write;

#[tauri::command]
async fn save_webcam_recording(
    data: Vec<u8>,
    filename: String
) -> Result<String, String> {
    let app_dir = // Get app recordings directory
    let file_path = app_dir.join(&filename);
    
    let mut file = File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    file.write_all(&data)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    // Convert WebM to MP4 if needed
    convert_to_mp4(&file_path)?;
    
    Ok(file_path.to_string_lossy().to_string())
}
```

**UI Components:**
- Webcam preview window (live feed)
- Camera selector dropdown (if multiple cameras)
- Resolution dropdown (720p, 1080p, 4K)
- Audio toggle (Microphone on/off)
- Recording controls (Start, Stop, Pause)
- Timer display

**User Flow:**
1. Click "Record Webcam" button
2. Browser prompts for camera/mic permission
3. Live preview appears
4. Select resolution and audio settings
5. Click "Start Recording"
6. Recording starts
7. Click "Stop Recording"
8. Clip appears on timeline

### 1.3 Simultaneous Screen + Webcam

**Requirements:**
- ✅ Record screen and webcam **simultaneously**
- ✅ Save as **separate tracks** (not pre-composed)
- ✅ Screen goes to Main Track, Webcam goes to Overlay Track
- ✅ Synchronized timestamps (start at same time)
- ✅ Audio from either source or both

**Technical Implementation:**

**Strategy:** Run two separate recordings in parallel, sync via timestamps

```rust
#[tauri::command]
async fn start_simultaneous_recording(
    app_handle: tauri::AppHandle,
    screen_source: String,
    audio_source: String
) -> Result<RecordingSession, String> {
    let timestamp = std::time::SystemTime::now();
    
    // Start screen recording
    let screen_path = format!("screen-{}.mp4", timestamp);
    let screen_handle = start_screen_recording(
        app_handle.clone(),
        screen_source,
        audio_source.clone(),
        screen_path.clone()
    );
    
    // Start webcam recording (frontend handles this)
    // Emit event to frontend to start webcam
    app_handle.emit_all("start-webcam-recording", timestamp)?;
    
    Ok(RecordingSession {
        screen_path,
        webcam_path: format!("webcam-{}.webm", timestamp),
        start_time: timestamp
    })
}

#[tauri::command]
async fn stop_simultaneous_recording(
    session: RecordingSession
) -> Result<(String, String), String> {
    // Stop both recordings
    // Return paths to both files
    Ok((session.screen_path, session.webcam_path))
}
```

**UI Components:**
- Combined recording panel
- Screen source selector
- Webcam preview (smaller window)
- Audio routing options:
  - Screen audio + Webcam mic
  - Screen audio only
  - Webcam mic only
- Synchronized controls (one Start/Stop for both)

**User Flow:**
1. Click "Record Screen + Webcam"
2. Configure screen source and audio
3. Webcam preview appears
4. Click "Start Recording"
5. Both start simultaneously
6. Click "Stop Recording"
7. Two clips appear: Screen on Main Track, Webcam on Overlay Track

### 1.4 Audio Recording (Standalone)

**Requirements:**
- ✅ Record microphone audio only (no video)
- ✅ Save as audio clip on timeline
- ✅ Waveform visualization (optional but nice)
- ✅ Audio levels meter during recording

**Technical Implementation:**

```javascript
// Frontend: Audio-only recording
async function startAudioRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 48000
    }
  });
  
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm'
  });
  
  // Same pattern as webcam, but audio-only
}
```

**Use Case:** Voice-over narration for existing video clips

---

## Phase 2: Multi-Track Timeline (HIGH PRIORITY)

### Overview
Implement a two-track system: Main Video Track + Overlay Track for Picture-in-Picture effects.

### 2.1 Timeline Architecture

**Track System:**
```
┌─────────────────────────────────────────────────────┐
│ Overlay Track (PiP)  │   Clip 2    │               │
├─────────────────────────────────────────────────────┤
│ Main Track           │ Clip 1 │ Clip 3 │ Clip 4   │
├─────────────────────────────────────────────────────┤
│ Audio Track (future) │                              │
└─────────────────────────────────────────────────────┘
```

**Data Structure:**
```javascript
{
  mainTrack: [
    { id, path, duration, inPoint, outPoint, position, filters, volume }
  ],
  overlayTrack: [
    { id, path, duration, position, pipSettings: { x, y, width, height, opacity } }
  ],
  transitions: [
    { type: 'fade', duration, between: [clipId1, clipId2] }
  ]
}
```

### 2.2 Drag & Drop to Tracks

**Requirements:**
- ✅ Clips default to Main Track when imported
- ✅ Drag clip from Main Track → Overlay Track converts to PiP
- ✅ Drag clip within same track to reorder
- ✅ Visual feedback during drag (ghost outline)
- ✅ Snap-to-edges when positioning

**Implementation:**

```jsx
function Timeline({ mainTrack, overlayTrack, onTrackChange }) {
  const handleDragStart = (e, clip, track) => {
    e.dataTransfer.setData('clipId', clip.id);
    e.dataTransfer.setData('sourceTrack', track);
  };
  
  const handleDrop = (e, targetTrack) => {
    const clipId = e.dataTransfer.getData('clipId');
    const sourceTrack = e.dataTransfer.getData('sourceTrack');
    
    if (sourceTrack !== targetTrack) {
      // Move clip between tracks
      if (targetTrack === 'overlay') {
        // Convert to PiP with default settings
        convertToPiP(clipId, {
          x: 0.7,  // 70% from left
          y: 0.7,  // 70% from top
          width: 0.25,  // 25% of main video width
          height: 0.25,
          opacity: 1.0
        });
      }
    } else {
      // Reorder within track
      repositionClip(clipId, calculatePosition(e));
    }
  };
  
  return (
    <>
      <div className="track overlay-track" onDrop={(e) => handleDrop(e, 'overlay')}>
        {/* Overlay clips */}
      </div>
      <div className="track main-track" onDrop={(e) => handleDrop(e, 'main')}>
        {/* Main clips */}
      </div>
    </>
  );
}
```

### 2.3 Picture-in-Picture Controls

**Requirements:**
- ✅ PiP appears as overlay on video preview
- ✅ Resize: Drag corner handles (8 handles: corners + edges)
- ✅ Move: Drag PiP box to reposition
- ✅ Aspect ratio: Lock/unlock toggle
- ✅ Opacity: Slider (0-100%)
- ✅ Border: Optional border with color picker
- ✅ Reset: Button to restore default PiP settings

**UI Components:**

```jsx
function PiPEditor({ clip, onUpdate }) {
  const [pipSettings, setPipSettings] = useState(clip.pipSettings);
  
  return (
    <div className="pip-editor">
      <div className="pip-preview">
        <div 
          className="pip-box"
          style={{
            left: `${pipSettings.x * 100}%`,
            top: `${pipSettings.y * 100}%`,
            width: `${pipSettings.width * 100}%`,
            height: `${pipSettings.height * 100}%`,
            opacity: pipSettings.opacity
          }}
        >
          {/* Resize handles on corners */}
          <div className="resize-handle nw" onMouseDown={(e) => handleResize(e, 'nw')} />
          <div className="resize-handle ne" onMouseDown={(e) => handleResize(e, 'ne')} />
          {/* ... 8 handles total */}
        </div>
      </div>
      
      <div className="pip-controls">
        <label>Position</label>
        <input type="number" value={pipSettings.x} onChange={/* ... */} />
        <input type="number" value={pipSettings.y} onChange={/* ... */} />
        
        <label>Size</label>
        <input type="number" value={pipSettings.width} onChange={/* ... */} />
        <input type="number" value={pipSettings.height} onChange={/* ... */} />
        
        <label>Opacity</label>
        <input type="range" min="0" max="100" value={pipSettings.opacity * 100} />
        
        <button onClick={resetPiP}>Reset to Default</button>
      </div>
    </div>
  );
}
```

**Export Implementation:**

PiP requires FFmpeg overlay filter:
```bash
ffmpeg -i main.mp4 -i overlay.mp4 \
  -filter_complex "[1:v]scale=480:270[pip];[0:v][pip]overlay=x=W-w-10:y=H-h-10" \
  output.mp4
```

Where:
- `scale=480:270` resizes PiP to 25% of 1920x1080
- `overlay=x=W-w-10:y=H-h-10` positions at bottom-right with 10px padding

### 2.4 Audio Mixing

**Requirements:**
- ✅ Each track has independent volume control
- ✅ Volume slider: 0-200% (boost or reduce)
- ✅ Mute toggle per track
- ✅ Visual waveform (optional, post-Phase 2)

**Implementation:**

```rust
#[tauri::command]
async fn export_with_audio_mix(
    main_clips: Vec<Clip>,
    overlay_clips: Vec<Clip>,
    main_volume: f32,  // 0.0 to 2.0
    overlay_volume: f32
) -> Result<String, String> {
    // FFmpeg audio filter
    // [0:a]volume=1.5[a1];[1:a]volume=0.5[a2];[a1][a2]amix=inputs=2
}
```

---

## Phase 3: Effects & Transitions

### 3.1 Text Overlays

**Requirements:**
- ✅ Add text to timeline as separate "text clip"
- ✅ Text properties:
  - Content (multi-line support)
  - Font (5-10 presets: Arial, Helvetica, Times, Courier, Comic Sans, etc.)
  - Size (12-72pt)
  - Color (color picker)
  - Position (x, y coordinates or presets: top-left, center, etc.)
  - Background (optional, with color and opacity)
  - Duration (how long text appears)
  - Start time (when text appears on timeline)
- ✅ Static only (no animations for MVP, add later if time)

**Data Structure:**
```javascript
{
  type: 'text',
  id: string,
  content: string,
  font: 'Arial',
  fontSize: 36,
  color: '#FFFFFF',
  position: { x: 0.5, y: 0.1 },  // Relative to video (0-1)
  background: { enabled: true, color: '#000000', opacity: 0.7 },
  startTime: 5.0,  // 5 seconds into timeline
  duration: 3.0    // Show for 3 seconds
}
```

**UI Component:**
```jsx
function TextOverlayEditor({ onAdd }) {
  const [text, setText] = useState('');
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(36);
  const [color, setColor] = useState('#FFFFFF');
  const [position, setPosition] = useState({ x: 0.5, y: 0.1 });
  
  const presetFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 
    'Georgia', 'Verdana', 'Impact', 'Comic Sans MS'
  ];
  
  const presetPositions = [
    { label: 'Top Left', value: { x: 0.1, y: 0.1 } },
    { label: 'Top Center', value: { x: 0.5, y: 0.1 } },
    { label: 'Top Right', value: { x: 0.9, y: 0.1 } },
    { label: 'Center', value: { x: 0.5, y: 0.5 } },
    { label: 'Bottom Left', value: { x: 0.1, y: 0.9 } },
    { label: 'Bottom Center', value: { x: 0.5, y: 0.9 } },
    { label: 'Bottom Right', value: { x: 0.9, y: 0.9 } }
  ];
  
  return (
    <div className="text-overlay-editor">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      
      <select value={font} onChange={(e) => setFont(e.target.value)}>
        {presetFonts.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      
      <input type="number" value={fontSize} onChange={(e) => setFontSize(e.target.value)} />
      
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      
      <div className="position-presets">
        {presetPositions.map(p => (
          <button key={p.label} onClick={() => setPosition(p.value)}>
            {p.label}
          </button>
        ))}
      </div>
      
      <button onClick={() => onAdd({ text, font, fontSize, color, position })}>
        Add Text to Timeline
      </button>
    </div>
  );
}
```

**FFmpeg Implementation:**
```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='Hello World':fontfile=/path/to/Arial.ttf:fontsize=36:fontcolor=white:x=(w-text_w)/2:y=100:box=1:boxcolor=black@0.7" \
  output.mp4
```

### 3.2 Transitions

**Requirements:**
- ✅ Transition types:
  - Fade (crossfade between clips)
  - Dissolve (similar to fade)
  - Wipe (left, right, up, down)
  - Slide (next clip slides in)
- ✅ Adjustable duration (0.5s - 3.0s)
- ✅ Apply between any two adjacent clips
- ✅ Visual indicator on timeline (overlap region)

**Data Structure:**
```javascript
{
  type: 'fade',  // or 'dissolve', 'wipe-left', 'slide-right'
  duration: 1.0,  // seconds
  between: ['clip-id-1', 'clip-id-2'],
  position: 10.5  // Timeline position where transition occurs
}
```

**UI Component:**
```jsx
function TransitionEditor({ clip1, clip2, onAdd }) {
  const [type, setType] = useState('fade');
  const [duration, setDuration] = useState(1.0);
  
  const transitionTypes = [
    { value: 'fade', label: 'Fade' },
    { value: 'dissolve', label: 'Dissolve' },
    { value: 'wipe-left', label: 'Wipe Left' },
    { value: 'wipe-right', label: 'Wipe Right' },
    { value: 'slide-up', label: 'Slide Up' },
    { value: 'slide-down', label: 'Slide Down' }
  ];
  
  return (
    <div className="transition-editor">
      <p>Add transition between {clip1.filename} and {clip2.filename}</p>
      
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {transitionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      
      <label>Duration: {duration}s</label>
      <input 
        type="range" 
        min="0.5" 
        max="3.0" 
        step="0.1" 
        value={duration}
        onChange={(e) => setDuration(parseFloat(e.target.value))}
      />
      
      <button onClick={() => onAdd({ type, duration, between: [clip1.id, clip2.id] })}>
        Add Transition
      </button>
    </div>
  );
}
```

**FFmpeg Implementation (Fade):**
```bash
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=9" \
  output.mp4
```

Where `offset=9` means transition starts at 9 seconds (clip1 is 10s long, so last 1s fades into clip2)

### 3.3 Filters

**Requirements:**
- ✅ Apply to entire clip (not keyframeable)
- ✅ Filter types:
  - Brightness (-100 to +100)
  - Contrast (-100 to +100)
  - Saturation (-100 to +100)
  - Hue Shift (0-360 degrees)
  - Blur (0-10)
  - Sharpen (0-10)
- ✅ Real-time preview (apply to video player)
- ✅ Reset button (restore defaults)

**Data Structure:**
```javascript
{
  clipId: string,
  filters: {
    brightness: 0,    // -100 to +100
    contrast: 0,      // -100 to +100
    saturation: 0,    // -100 to +100
    hue: 0,           // 0 to 360
    blur: 0,          // 0 to 10
    sharpen: 0        // 0 to 10
  }
}
```

**UI Component:**
```jsx
function FilterEditor({ clip, onUpdate }) {
  const [filters, setFilters] = useState(clip.filters || {
    brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, sharpen: 0
  });
  
  const updateFilter = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    onUpdate(clip.id, updated);
  };
  
  return (
    <div className="filter-editor">
      <h3>Filters: {clip.filename}</h3>
      
      {Object.entries(filters).map(([name, value]) => (
        <div key={name} className="filter-control">
          <label>{name.charAt(0).toUpperCase() + name.slice(1)}: {value}</label>
          <input 
            type="range"
            min={name === 'hue' ? 0 : -100}
            max={name === 'hue' ? 360 : 100}
            value={value}
            onChange={(e) => updateFilter(name, parseFloat(e.target.value))}
          />
        </div>
      ))}
      
      <button onClick={() => {
        const defaults = { brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, sharpen: 0 };
        setFilters(defaults);
        onUpdate(clip.id, defaults);
      }}>
        Reset All Filters
      </button>
    </div>
  );
}
```

**FFmpeg Implementation:**
```bash
ffmpeg -i input.mp4 \
  -vf "eq=brightness=0.1:contrast=1.2:saturation=1.5,hue=h=30,unsharp=5:5:1.0" \
  output.mp4
```

Where:
- `eq=brightness=0.1` increases brightness by 10%
- `contrast=1.2` increases contrast by 20%
- `saturation=1.5` increases saturation by 50%
- `hue=h=30` shifts hue by 30 degrees
- `unsharp=5:5:1.0` sharpens image

### 3.4 Audio Effects

**Requirements:**
- ✅ Volume per clip (0-200%)
- ✅ Fade in (duration: 0-3s)
- ✅ Fade out (duration: 0-3s)
- ✅ Normalize audio (optional)

**UI Component:**
```jsx
function AudioEditor({ clip, onUpdate }) {
  const [volume, setVolume] = useState(clip.volume || 100);
  const [fadeIn, setFadeIn] = useState(clip.fadeIn || 0);
  const [fadeOut, setFadeOut] = useState(clip.fadeOut || 0);
  
  return (
    <div className="audio-editor">
      <label>Volume: {volume}%</label>
      <input 
        type="range" 
        min="0" 
        max="200" 
        value={volume}
        onChange={(e) => {
          setVolume(parseInt(e.target.value));
          onUpdate(clip.id, { volume: parseInt(e.target.value) / 100 });
        }}
      />
      
      <label>Fade In: {fadeIn}s</label>
      <input 
        type="range" 
        min="0" 
        max="3" 
        step="0.1"
        value={fadeIn}
        onChange={(e) => {
          setFadeIn(parseFloat(e.target.value));
          onUpdate(clip.id, { fadeIn: parseFloat(e.target.value) });
        }}
      />
      
      <label>Fade Out: {fadeOut}s</label>
      <input 
        type="range" 
        min="0" 
        max="3" 
        step="0.1"
        value={fadeOut}
        onChange={(e) => {
          setFadeOut(parseFloat(e.target.value));
          onUpdate(clip.id, { fadeOut: parseFloat(e.target.value) });
        }}
      />
    </div>
  );
}
```

**FFmpeg Implementation:**
```bash
ffmpeg -i input.mp4 \