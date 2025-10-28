### Clear Timeline / New Project

**App Component with Clear Timeline:**
```jsx
function App() {
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  
  const handleClearTimeline = () => {
    if (clips.length === 0) return;
    
    const confirmed = confirm(
      `Clear all ${clips.length} clips from timeline? This cannot be undone.`
    );
    
    if (confirmed) {
      setClips([]);
      setSelectedClipId(null);
      setPlayheadPosition(0);
    }
  };
  
  const handleDeleteClip = (clipId) => {
    setClips(prev => prev.filter(c => c.id !== clipId));
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  };
  
  return (
    <div className="app">
      <header>
        <h1>ClipForge</h1>
        <div className="header-controls">
          <button onClick={handleImportClick}>Import Video</button>
          <button 
            onClick={handleClearTimeline}
            disabled={clips.length === 0}
            style={{ 
              background: clips.length === 0 ? '#666' : '#d9534f',
              cursor: clips.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Clear Timeline
          </button>
          <ExportButton clips={clips} onExportComplete={() => {}} />
        </div>
      </header>
      
      <VideoPlayer 
        currentClip={clips.find(c => c.id === selectedClipId)}
        onTimeUpdate={setPlayheadPosition}
        onDeleteClip={handleDeleteClip}
      />
      
      <Timeline
        clips={clips}
        playheadPosition={playheadPosition}
        selectedClipId={selectedClipId}
        onClipSelect={setSelectedClipId}
        onSeek={(time) => {
          setPlayheadPosition(time);
          // Also seek video player if needed
        }}
        onDeleteClip={handleDeleteClip}
      />
      
      <TrimControls 
        clip={clips.find(c => c.id === selectedClipId)}
        onTrimChange={(clipId, inPoint, outPoint) => {
          setClips(prev => prev.map(c => 
            c.id === clipId ? { ...c, inPoint, outPoint } : c
          ));
        }}
      />
    </div>
  );
}
```

---

## Risk Mitigation Strategies

### Risk 1: Codec Incompatibility During Concatenation
**Problem:** User imports MP4 (H.264) + MOV (HEVC) → FFmpeg concat fails

**Mitigation:**
1. **Detection:** Use FFprobe to extract codec from each clip
2. **Warning:** Show alert if codecs don't match
3. **Options:**
   - Let user proceed anyway (might work with `-c copy`)
   - Offer re-encode option (slower but guaranteed to work)
   - For MVP: Just warn and let user decide

**Implementation:** Added `check_codec_compatibility()` command in PRD

### Risk 2: Timeline Performance with 50+ Clips
**Problem:** DOM gets slow with many clip elements

**Mitigation:**
1. **Limit:** Show warning at 20 clips, hard limit at 50
2. **Optimization:** Use React.memo on clip components
3. **Alternative:** Canvas-based timeline (post-MVP)

**For MVP:** Add clip limit check:
```javascript
if (clips.length >= 20) {
  alert('Warning: Timeline may slow down with many clips. Consider exporting and re-importing.');
}
```

### Risk 3: Windows Build from Mac
**Problem:** Can't natively test Windows build

**Mitigation:**
1. **GitHub Actions:** Automated Windows build
2. **Early testing:** Set up workflow by Day 2
3. **Community testing:** Ask others to test Windows build
4. **Video proof:** Record screen of Windows build working

**For MVP:** GitHub Actions workflow included in PRD

### Risk 4: Large File Memory Issues
**Problem:** 4K video file (2GB+) causes crashes

**Mitigation:**
1. **File size check:** Warn at 2GB, error at 5GB
2. **Streaming:** HTML5 video streams automatically
3. **FFmpeg:** Use `-c copy` (no memory loading)

**Already implemented:** File validation with size check

### Risk 5: FFmpeg Binary Not Found in Production
**Problem:** Packaged app can't find FFmpeg

**Mitigation:**
1. **Test early:** Build package by Day 2
2. **Correct paths:** Use `resolve_resource()` API
3. **Error handling:** Show helpful message if binary missing

**Already implemented:** Detailed FFmpeg bundling instructions in PRD

---

## Simplification Options (If Running Out of Time)

### Priority Cuts (Remove These First):
1. ❌ **Clip reordering** → Clips stay in import order (saves 3-4 hours)
2. ❌ **Timeline scrubbing** → Navigate via play only (saves 1-2 hours)
3. ❌ **Visual trim indicators** → Just show in/out values (saves 2 hours)
4. ❌ **Codec compatibility check** → Assume all clips compatible (saves 2 hours)
5. ❌ **Drag & drop visual feedback** → Works but no visual indication (saves 1 hour)

### Absolute Minimum MVP (20-Hour Version):
- ✅ Import via file picker only (no drag & drop)
- ✅ Display clips on timeline (static, no reordering)
- ✅ Click clip → loads in player
- ✅ Play/pause button
- ✅ Set in/out points via number inputs
- ✅ Export single trimmed clip
- ✅ Export multiple clips (concatenate)
- ✅ Package for Mac only (Windows later)

This strips out all polish but delivers core functionality.

--- timeline
      if (clips.length === 1) {
        await invoke('export_single_clip', {
          inputPath: clips[0].path,
          outputPath: outputPath,
          inPoint: clips[0].inPoint,
          outPoint: clips[0].outPoint
        });
      } else {
        await invoke('export_timeline', {
          clips: clips,
          outputPath: outputPath
        });
      }
      
      alert('Export complete! Video saved to: ' + outputPath);
      onExportComplete();
    } catch (error) {
      alert(`Export failed: ${error}`);
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <button 
      onClick={handleExport} 
      disabled={exporting || clips.length === 0}
      style={{
        padding: '10px 20px',
        background: exporting ? '#888' : '#4a90e2',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: exporting ? 'not-allowed' : 'pointer',
        fontSize: '16px'
      }}
    >
      {exporting ? 'Exporting...' : 'Export Video'}
    </button>
  );
}
```

**Save Dialog with Default Filename (Rust):**
```rust
use tauri::api::dialog::FileDialogBuilder;

#[tauri::command]
async fn select_export_path(default_filename: String) -> Result<String, String> {
    let result = FileDialogBuilder::new()
        .set_file_name(&default_filename)
        .add_filter("MP4 Video", &["mp4"])
        .save_file();
    
    match result {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("No file selected".to_string())
    }
}
```

### Clear Timeline / New Project

**App Component with Clear Timeline:**
```jsx
function App() {
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  
  const handleClearTimeline = () => {
    if (clips.length === 0) return;
    
    const confirmed = confirm(
      `Clear all ${clips.length} clips from timeline? This cannot be undone.`
    );
    
    if (confirmed) {
      setClips([]);
      setSelectedClipId(null);
      setPlayheadPosition(0);
    }
  };
  
  const handleDeleteClip = (clipId) => {
    setClips(prev => prev.filter(c => c.id !== clipId));
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  };
  
  return (
    <div className="app">
      <header>
        <h1>ClipForge</h1>
        <div className="header-controls">
          <button onClick={handleImportClick}>Import Video</button>
          <button 
            onClick={handleClearTimeline}
            disabled={clips.length === 0}
            style={{ background: '#d9534f' }}
          >
            Clear Timeline
          </button>
          <ExportButton clips={clips} onExportComplete={() => {}} />
        </div>
      </header>
      
      <VideoPlayer 
        currentClip={clips.find(c => c.id === selectedClipId)}
        onTimeUpdate={setPlayheadPosition}
        onDeleteClip={handleDeleteClip}
      />
      
      <Timeline
        clips={clips}
        playheadPosition={playheadPosition}
        selectedClipId={selectedClipId}
        onClipSelect={setSelectedClipId}
        onSeek={(time) => {
          setPlayheadPosition(time);
          // Also seek video player
        }}
        onDeleteClip={handleDeleteClip}
      />
      
      <TrimControls 
        clip### Export UI

**Export Button with Smart Filename:**
```jsx
function ExportButton({ clips, onExportComplete }) {
  const [exporting, setExporting] = useState(false);
  
  const generateDefaultFilename = () => {
    if (clips.length === 0) return 'export.mp4';
    
    // Use first clip's name
    const firstName = clips[0].filename.replace(/\.[^.]+$/, ''); // Remove extension
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    return `${firstName}-edited-${timestamp}.mp4`;
  };
  
  const handleExport = async () => {
    if (clips.length === 0) {
      alert('No clips to export. Please import videos first.');
      return;
    }
    
    try {
      // Check codec compatibility
      const clipPaths = clips.map(c => c.path);
      try {
        await invoke('check_codec_compatibility', { clips: clipPaths });
      } catch (warning) {
        const proceed = confirm(`${warning}\n\nContinue anyway?`);
        if (!proceed) return;
      }
      
      setExporting(true);
      
      // Open save dialog with smart filename
      const outputPath = await invoke('select_export_path', {
        defaultFilename: generateDefaultFilename()
      });
      
      if (!outputPath) {
        setExporting(false);
        return; // User cancelled
      }
      
      // Export# ClipForge MVP - Product Requirements Document

**Project Timeline:** 72 hours (Oct 27 - Oct 29, 2025)  
**MVP Deadline:** Tuesday, October 28th at 10:59 PM CT  
**Final Submission:** Wednesday, October 29th at 10:59 PM CT

### Video Import Tasks

#### Task 4: File Picker Implementation
- [ ] Create Tauri command `select_video_file` in Rust
- [ ] Add file filter for `.mp4`, `.mov`, `.webm`
- [ ] Create "Import Video" button in React
- [ ] Connect button to `invoke('select_video_file')`
- [ ] Display selected file path in UI
- [ ] Test: Click button → file dialog opens → select video → path shown

#### Task 5: Drag & Drop Implementation
- [ ] Enable `fileDropEnabled: true` in `tauri.conf.json`
- [ ] Add event listener for `tauri://file-drop` in React
- [ ] Filter dropped files to only accept video formats
- [ ] Show visual feedback when file is being dragged over window
- [ ] Test: Drag MP4 file → file is detected → path captured

#### Task 6: Video Metadata Extraction
- [ ] Create Tauri command `get_video_metadata` using FFprobe
- [ ] Parse JSON output from FFprobe to extract:
  - Duration (in seconds)
  - Width and height
  - Filename
- [ ] Call metadata extraction when file is imported
- [ ] Store metadata in React state alongside file path
- [ ] Test: Import video → metadata logged to console

#### Task 7: Clip Data Structure
- [ ] Define clip object structure in React:
  ```javascript
  {
    id: string,           // Unique identifier
    path: string,         // Absolute file path
    filename: string,     // Display name
    duration: number,     // Duration in seconds
    width: number,
    height: number,
    inPoint: number,      // Trim start (default: 0)
    outPoint: number      // Trim end (default: duration)
  }
  ```
- [ ] Create state to store array of clips
- [ ] Add helper function to add clip to timeline
- [ ] Test: Import 3 videos → all stored in state

### Timeline Implementation Tasks

#### Task 8: Timeline Component Structure
- [ ] Create `Timeline.jsx` component
- [ ] Display horizontal container (fixed height: 100px)
- [ ] Add timeline ruler showing time markers (0s, 5s, 10s, etc.)
- [ ] Style with background color and border
- [ ] Test: Component renders empty timeline

#### Task 9: Clip Visualization on Timeline
- [ ] Map over clips array and render clip rectangles
- [ ] Calculate clip width: `duration * pixelsPerSecond` (use 50px/second)
- [ ] Position clips sequentially (each starts where previous ends)
- [ ] Add clip styling: background color, border, clip name
- [ ] Test: Import 3 clips → all visible on timeline in sequence

#### Task 10: Timeline Playhead
- [ ] Create playhead div (vertical line, red color)
- [ ] Position playhead using `left: ${position}px`
- [ ] Add state for playhead position (in seconds)
- [ ] Create function to update playhead position
- [ ] Test: Manually update playhead state → line moves

#### Task 11: Clip Selection
- [ ] Add click handler to clip rectangles
- [ ] Highlight selected clip (different border/background)
- [ ] Store selected clip ID in state
- [ ] Update video player to show selected clip
- [ ] Test: Click clip → highlights → player loads that video

### Video Player Tasks

#### Task 12: Basic Video Player
- [ ] Create `VideoPlayer.jsx` component
- [ ] Add HTML5 `<video>` element
- [ ] Use `convertFileSrc()` to convert file path to URL
- [ ] Add play/pause button
- [ ] Style player (width: 100%, max height: 500px)
- [ ] Test: Load video → player shows video frame

#### Task 13: Playback Controls
- [ ] Add play/pause toggle functionality
- [ ] Display current time below player
- [ ] Add video `onTimeUpdate` event handler
- [ ] Test: Click play → video plays with audio

#### Task 14: Playhead Synchronization
- [ ] In video `onTimeUpdate`, get `currentTime`
- [ ] Calculate absolute position on timeline (account for clip start position)
- [ ] Update timeline playhead position state
- [ ] Test: Video plays → playhead moves along timeline in sync

#### Task 15: Video Player Error Handling
- [ ] Add `onError` handler to `<video>` element
- [ ] Display error message if video fails to load
- [ ] Log error details to console
- [ ] Test: Load corrupted file → error message shown

### Trim Functionality Tasks

#### Task 16: Trim Controls UI
- [ ] Create `TrimControls.jsx` component
- [ ] Add two number inputs: "In Point" and "Out Point"
- [ ] Display values in seconds (e.g., "5.50s")
- [ ] Add "Set In Point" and "Set Out Point" buttons
- [ ] Style controls clearly (group related inputs)
- [ ] Test: UI renders with default values (0 and duration)

#### Task 17: Trim Point Setting Logic
- [ ] When "Set In Point" clicked → set to current video time
- [ ] When "Set Out Point" clicked → set to current video time
- [ ] Update clip object in state with new in/out points
- [ ] Validate: inPoint < outPoint
- [ ] Clamp values to [0, duration]
- [ ] Test: Play video → click "Set In Point" → value updates

#### Task 18: Trim Preview
- [ ] When trim points change, update video player
- [ ] Seek video to in-point when trim is set
- [ ] Optionally: Restrict playback to in-point → out-point range
- [ ] Test: Set in-point at 5s → video jumps to 5s in preview

#### Task 19: Visual Trim Indicators on Timeline
- [ ] Add semi-transparent overlays on timeline for trimmed portions
- [ ] Grey out portions before in-point and after out-point
- [ ] Show trim handles (small draggable markers)
- [ ] Test: Set trim → timeline shows trimmed region visually

### Export Functionality Tasks

#### Task 20: Export Button & File Dialog
- [ ] Create "Export Video" button
- [ ] Add Tauri command for save file dialog
- [ ] Default filename: `clipforge-export-{timestamp}.mp4`
- [ ] Filter to `.mp4` only
- [ ] Return selected output path to React
- [ ] Test: Click export → save dialog opens → path returned

#### Task 21: Single Clip Export (Trim)
- [ ] Create Tauri command `export_single_clip`
- [ ] Parameters: input path, output path, in-point, out-point
- [ ] Use FFmpeg `-ss` and `-t` flags with `-c copy`
- [ ] Return success/error message
- [ ] Test: Export trimmed clip → MP4 file created

#### Task 22: Multiple Clip Concatenation
- [ ] Create Tauri command `export_timeline`
- [ ] Generate FFmpeg concat file (filelist.txt format)
- [ ] Handle case where clips need trimming before concat
- [ ] Use FFmpeg concat demuxer
- [ ] Test: Export 3 clips → single MP4 created

#### Task 23: Export Progress UI
- [ ] Add loading state (boolean: `isExporting`)
- [ ] Show spinner and "Exporting..." message
- [ ] Disable export button during export
- [ ] Show success message when complete
- [ ] Test: Click export → spinner shows → button disabled

#### Task 24: Export Error Handling
- [ ] Wrap FFmpeg command in try-catch (Rust)
- [ ] Parse stderr for common errors
- [ ] Return user-friendly error messages
- [ ] Display error alert in React
- [ ] Test: Trigger error (e.g., no disk space) → clear error shown

### Packaging & Distribution Tasks

#### Task 25: Mac Build Configuration
- [ ] Verify `tauri.conf.json` has correct bundle settings
- [ ] Set app name, version, description
- [ ] Configure app icons (optional for MVP)
- [ ] Run `cargo tauri build`
- [ ] Test: Open packaged .dmg → install → launch app

#### Task 26: Windows Build Setup (GitHub Actions)
- [ ] Create `.github/workflows/build.yml`
- [ ] Configure matrix build for Windows
- [ ] Add FFmpeg binaries to repository (or download in workflow)
- [ ] Test: Push to GitHub → workflow runs → .exe artifact created

#### Task 27: Cross-Platform Testing
- [ ] Test Mac app on macOS 11+ (if available)
- [ ] Test Windows app on Windows 10+ (via GitHub Actions artifact)
- [ ] Verify FFmpeg binaries are included in both builds
- [ ] Test video import/export on both platforms
- [ ] Document any platform-specific issues

#### Task 28: Build Documentation
- [ ] Write README with setup instructions
- [ ] Document how to install Rust/Node/Tauri CLI
- [ ] Add instructions for downloading FFmpeg binaries
- [ ] Explain build process: `cargo tauri build`
- [ ] Include troubleshooting section

### Polish & Final Tasks

#### Task 29: Error Boundary & User Feedback
- [ ] Add error boundaries in React
- [ ] Show loading states for all async operations
- [ ] Add toast notifications for success/error
- [ ] Implement graceful degradation for missing features
- [ ] Test: Trigger various errors → all handled gracefully

#### Task 30: Edge Case Testing
- [ ] Test with 10+ clips on timeline
- [ ] Test with very large files (>1GB)
- [ ] Test with very short clips (<1 second)
- [ ] Test with unusual aspect ratios (vertical videos)
- [ ] Test with mixed formats (MP4 + MOV)

#### Task 31: Performance Optimization
- [ ] Profile app with 10+ clips
- [ ] Optimize timeline rendering (use React.memo if needed)
- [ ] Ensure video player releases resources when switching clips
- [ ] Test: Leave app open for 15+ minutes → no memory leaks

#### Task 32: Demo Video Recording
- [ ] Record 3-5 minute demo showing:
  1. Importing multiple videos
  2. Arranging on timeline
  3. Trimming clips
  4. Playing preview
  5. Exporting final video
- [ ] Show exported video playing in VLC/QuickTime
- [ ] Upload to YouTube/Vimeo

#### Task 33: Submission Package
- [ ] Push all code to GitHub repository
- [ ] Upload packaged apps to GitHub Releases
- [ ] Write comprehensive README
- [ ] Include architecture diagram (optional: Mermaid)
- [ ] Submit demo video link

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    ClipForge Desktop App                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         React Frontend (Renderer Process)         │  │
│  │                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │ VideoPlayer  │  │   Timeline   │              │  │
│  │  │  Component   │  │  Component   │              │  │
│  │  └──────────────┘  └──────────────┘              │  │
│  │                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │TrimControls  │  │ExportButton  │              │  │
│  │  │  Component   │  │  Component   │              │  │
│  │  └──────────────┘  └──────────────┘              │  │
│  │                                                     │  │
│  │           State: clips[], selectedClip,            │  │
│  │                  playheadPosition                  │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                              │
│                           │ invoke() / listen()          │
│                           │                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Tauri Backend (Main Process)             │  │
│  │                                                     │  │
│  │  Rust Commands:                                    │  │
│  │  • select_video_file()                            │  │
│  │  • get_video_metadata()                           │  │
│  │  • export_single_clip()                           │  │
│  │  • export_timeline()                              │  │
│  │                                                     │  │
│  │  File System Access:                              │  │
│  │  • Read video files                               │  │
│  │  • Write exported MP4s                            │  │
│  │                                                     │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                              │
│                           │ Process::Command             │
│                           │                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │         FFmpeg / FFprobe (Bundled Binaries)       │  │
│  │                                                     │  │
│  │  • Get video metadata (duration, resolution)      │  │
│  │  • Trim clips (-ss, -t flags)                     │  │
│  │  • Concatenate multiple clips                     │  │
│  │  • Export to MP4 format                           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Executive Summary

ClipForge is a lightweight desktop video editor focused on the essentials: import video files, arrange them on a timeline, perform basic edits (trim), and export to MP4. The MVP validates core media handling capabilities in a native desktop environment before expanding to advanced features like recording and effects.

**Core Philosophy:** A working, simple video editor beats a feature-rich app that doesn't ship.

---

## User Stories

### Primary User: Content Creator (Solo)
- **As a content creator**, I want to import multiple video clips so that I can combine them into a single video
- **As a content creator**, I want to see a visual timeline of my clips so that I can understand my video structure at a glance
- **As a content creator**, I want to preview my video before exporting so that I can verify the final output
- **As a content creator**, I want to trim unwanted portions from my clips so that I can remove mistakes or dead air
- **As a content creator**, I want to export my edited video to MP4 so that I can share it on social platforms

### Secondary User: Educator/Professional
- **As an educator**, I want to drag and drop video files quickly so that I can focus on teaching, not software
- **As a professional**, I want reliable export functionality so that I don't lose work or waste time on corrupted files

### Developer User (Testing Persona)
- **As a tester**, I want clear visual feedback when importing files so that I know the app is working
- **As a tester**, I want the app to launch quickly and not crash so that I can evaluate core functionality

---

## MVP Requirements (Hard Gate - Tuesday 10:59 PM CT)

### 1. Desktop Application Launch
**Acceptance Criteria:**
- App launches on macOS and Windows
- Packaged as native executable (not just dev mode)
- Launch time under 5 seconds
- Window opens with clear UI (no blank screens)

### 2. Video Import
**Acceptance Criteria:**
- Drag & drop support for video files (MP4, MOV minimum)
- File picker dialog as alternative import method
- Supports at least MP4 and MOV formats
- Visual confirmation when file is imported (thumbnail or filename display)
- Basic error handling for unsupported formats

### 3. Timeline View
**Acceptance Criteria:**
- Horizontal timeline displaying imported clips
- Visual representation of clip duration (length correlates to time)
- Clear distinction between empty timeline and populated timeline
- Clips appear in the order they were added

### 4. Video Preview Player
**Acceptance Criteria:**
- Video player displays selected or first clip
- Play/pause controls functional
- Playhead position visible on timeline
- Video displays at reasonable quality (doesn't need to be perfect)

### 5. Basic Trim Functionality
**Acceptance Criteria:**
- User can set in-point (start) and out-point (end) on a single clip
- Visual indicators show where trim points are set
- Trimmed portion is reflected in preview
- Trim doesn't corrupt the clip or cause crashes

### 6. Export to MP4
**Acceptance Criteria:**
- Export button/menu option available
- Exports timeline content (even if just one clip) to MP4 file
- User can choose save location
- Progress indicator during export (even simple percentage)
- Exported file plays in standard video players (VLC, QuickTime, etc.)

### 7. Native Packaging
**Acceptance Criteria:**
- Built using Tauri
- Distributable file available (.dmg/.app for Mac, .exe for Windows)
- App runs without requiring dev environment
- Include build instructions in README

---

## Technical Stack

### **Framework: Tauri 2.0**

**Why Tauri:**
- ✅ **Small bundle size:** 3-10MB vs 80-120MB for Electron
- ✅ **Lower memory footprint:** Critical when handling video files
- ✅ **Faster startup:** Native performance by default
- ✅ **Simpler FFmpeg integration:** Direct CLI command invocation from Rust
- ✅ **Cross-platform:** Single codebase for Mac and Windows
- ✅ **Proven:** Your instructor successfully built this exact project in Tauri

**Architecture:**
- **Frontend:** React (renderer process) - handles all UI
- **Backend:** Rust (Tauri core) - handles file system, FFmpeg commands
- **Communication:** Tauri IPC commands (invoke from React → execute in Rust)

### **Complete Tech Stack:**

**Frontend (React):**
- **Framework:** React 18+ with Vite (comes with Tauri template)
- **Video Player:** HTML5 `<video>` element (simplest, hardware-accelerated)
- **Timeline UI:** HTML/CSS with DOM manipulation (Canvas if time permits)
- **Styling:** Tailwind CSS or plain CSS (your preference)
- **State Management:** React useState/useContext (no Redux needed for MVP)

**Backend (Rust/Tauri):**
- **Framework:** Tauri 2.0
- **FFmpeg Integration:** Direct CLI command invocation via `std::process::Command`
- **File System:** Tauri's `fs` plugin for file dialogs and path handling
- **IPC:** Tauri commands (functions decorated with `#[tauri::command]`)

**Media Processing:**
- **FFmpeg:** System-installed or bundled binary called via Rust `Command`
- **Video Metadata:** Use `ffprobe` (comes with FFmpeg) for duration, resolution

**Build & Package:**
- **Bundler:** Tauri CLI (`tauri build`)
- **Outputs:** .dmg for macOS, .exe/.msi for Windows

---

## Key Features (MVP Scope)

### Must-Have (P0 - Critical Path)
1. ✅ Import MP4/MOV files via drag-and-drop AND file picker
2. ✅ Display multiple clips on visual timeline
3. ✅ Arrange clips in sequence (drag to reorder)
4. ✅ Delete clips from timeline
5. ✅ Preview video in player window
6. ✅ Trim clips using in/out point buttons
7. ✅ Timeline scrubbing (click to seek)
8. ✅ Playhead moves during video playback
9. ✅ Spacebar for play/pause
10. ✅ Export timeline (multiple clips) to MP4 with spinner progress
11. ✅ Package as distributable desktop app for Mac and Windows
12. ✅ Bundle FFmpeg binary with app (no system dependencies)

### Should-Have (P1 - Include if Time Permits)
- Clear timeline / New project button
- Visual drag & drop feedback (border highlight, overlay)
- File validation before import (size check, format verification)
- Codec compatibility detection before export
- Smart export filename (based on first clip name)
- Error messages for all failure scenarios
- Remember last export location

### Nice-to-Have (P2 - Post-MVP)
- Clip thumbnails on timeline
- WebM format support
- Timeline zoom in/out
- Session restore (recover from crash)
- Keyboard shortcuts for all actions (beyond spacebar)

---

## Explicitly Out of Scope for MVP

### NOT Required for Tuesday Deadline:
- ❌ Screen recording (desktop capture)
- ❌ Webcam recording
- ❌ Audio capture from microphone
- ❌ Simultaneous screen + webcam recording
- ❌ Multiple timeline tracks
- ❌ Clip splitting at playhead
- ❌ Transitions or effects
- ❌ Text overlays
- ❌ Audio volume controls
- ❌ Filters (brightness, saturation, etc.)
- ❌ Cloud upload/sharing
- ❌ Keyboard shortcuts
- ❌ Undo/redo
- ❌ Auto-save
- ❌ Resolution selection (use source resolution)

**Rationale:** These are Final Submission features. MVP focuses on proving you can handle video files in desktop context.

---

## Technical Implementation Guide

### FFmpeg Integration (CRITICAL)

**Approach:** Bundle FFmpeg binary with app (no system dependencies required)

**Setup:**
1. Download FFmpeg static builds:
   - **Mac:** https://evermeet.cx/ffmpeg/ (get both `ffmpeg` and `ffprobe`)
   - **Windows:** https://www.gyan.dev/ffmpeg/builds/ (download static build)
2. Place binaries in `src-tauri/binaries/` folder
3. Configure Tauri to bundle them as "sidecars" (see below)

**Tauri Sidecar Configuration (tauri.conf.json):**
```json
{
  "tauri": {
    "bundle": {
      "externalBin": [
        "binaries/ffmpeg",
        "binaries/ffprobe"
      ]
    }
  }
}
```

**Accessing Bundled FFmpeg in Rust:**
```rust
use tauri::api::process::Command;

let ffmpeg_path = app_handle
    .path_resolver()
    .resolve_resource("binaries/ffmpeg")
    .expect("failed to resolve ffmpeg");

let output = Command::new(ffmpeg_path)
    .args(["-i", "input.mp4", "output.mp4"])
    .output()
    .expect("failed to execute ffmpeg");
```

**Example Tauri Command (Rust) - Trim with In/Out Points:**
```rust
use tauri::api::process::Command;

#[tauri::command]
async fn trim_video(
    app_handle: tauri::AppHandle,
    input_path: String,
    output_path: String,
    in_point: f64,   // Start time in seconds
    out_point: f64   // End time in seconds
) -> Result<String, String> {
    let duration = out_point - in_point;
    
    let ffmpeg_path = app_handle
        .path_resolver()
        .resolve_resource("binaries/ffmpeg")
        .expect("failed to resolve ffmpeg");
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-i", &input_path,
            "-ss", &in_point.to_string(),
            "-t", &duration.to_string(),
            "-c", "copy",  // Fast: copy codec without re-encoding
            &output_path
        ])
        .output()
        .map_err(|e| format!("FFmpeg error: {}", e))?;

    if output.status.success() {
        Ok("Export complete".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg failed: {}", stderr))
    }
}
```

**Calling from React:**
```javascript
import { invoke } from '@tauri-apps/api/core';

async function exportVideo(clip) {
  try {
    setExporting(true); // Show spinner
    const result = await invoke('trim_video', {
      inputPath: clip.path,
      outputPath: '/path/to/output.mp4',
      inPoint: clip.inPoint,  // e.g., 5.0 seconds
      outPoint: clip.outPoint  // e.g., 15.0 seconds
    });
    console.log(result); // "Export complete"
    setExporting(false);
  } catch (error) {
    console.error('Export failed:', error);
    setExporting(false);
    alert(`Export failed: ${error}`);
  }
}
```

**FFmpeg Command Patterns:**

1. **Trim video (fast, no re-encoding):**
   ```
   ffmpeg -i input.mp4 -ss 10 -t 5 -c copy output.mp4
   ```
   - `-ss 10`: Start at 10 seconds (in-point)
   - `-t 5`: Duration of 5 seconds (out-point - in-point)
   - `-c copy`: Copy codec (no re-encoding = fast)

2. **Get video metadata (duration, resolution):**
   ```
   ffprobe -v error -show_entries format=duration:stream=width,height -of json input.mp4
   ```
   Returns JSON with duration, width, height

3. **Concatenate multiple clips:**
   ```
   ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
   ```
   Where `filelist.txt` contains:
   ```
   file '/path/to/clip1.mp4'
   file '/path/to/clip2.mp4'
   file '/path/to/clip3.mp4'
   ```

4. **Export with progress (parse stderr):**
   FFmpeg outputs progress to stderr like:
   ```
   frame=  150 fps= 30 q=-1.0 size=    2048kB time=00:00:05.00 bitrate=3355.4kbits/s speed=1.0x
   ```
   Parse `time=` to calculate percentage

### File System Access

**Tauri File Dialog (Rust):**
```rust
use tauri::api::dialog::FileDialogBuilder;

#[tauri::command]
async fn select_video_file(app_handle: tauri::AppHandle) -> Result<String, String> {
    let result = FileDialogBuilder::new()
        .add_filter("Video", &["mp4", "mov", "webm"])
        .pick_file();
    
    match result {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("No file selected".to_string())
    }
}
```

**Calling from React:**
```javascript
import { invoke } from '@tauri-apps/api/core';

const handleFilePicker = async () => {
  try {
    const path = await invoke('select_video_file');
    addClipToTimeline(path);
  } catch (error) {
    console.error('File selection failed:', error);
  }
};
```

### Drag & Drop Implementation

**React Component with Drag & Drop and Visual Feedback:**
```jsx
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

function Timeline() {
  const [clips, setClips] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Listen for file drop events
    const unlistenFileDrop = listen('tauri://file-drop', async (event) => {
      setIsDragging(false);
      const files = event.payload;
      
      for (const filePath of files) {
        if (filePath.endsWith('.mp4') || filePath.endsWith('.mov') || filePath.endsWith('.webm')) {
          try {
            await invoke('validate_video_file', { filePath });
            const metadata = await invoke('get_video_metadata', { videoPath: filePath });
            setClips(prev => [...prev, { 
              id: crypto.randomUUID(),
              path: filePath, 
              filename: filePath.split('/').pop(),
              ...metadata,
              inPoint: 0,
              outPoint: metadata.duration
            }]);
          } catch (error) {
            alert(`Failed to import ${filePath}: ${error}`);
          }
        } else {
          alert(`Unsupported file format: ${filePath}`);
        }
      }
    });

    // Listen for drag hover
    const unlistenDragEnter = listen('tauri://file-drop-hover', () => {
      setIsDragging(true);
    });

    // Listen for drag leave
    const unlistenDragLeave = listen('tauri://file-drop-cancelled', () => {
      setIsDragging(false);
    });

    return () => {
      unlistenFileDrop.then(fn => fn());
      unlistenDragEnter.then(fn => fn());
      unlistenDragLeave.then(fn => fn());
    };
  }, []);

  return (
    <div 
      className={`timeline-container ${isDragging ? 'drag-over' : ''}`}
      style={{
        border: isDragging ? '3px dashed #4a90e2' : '1px solid #444',
        transition: 'border 0.2s'
      }}
    >
      {isDragging && (
        <div className="drag-overlay">
          Drop videos here to import
        </div>
      )}
      
      <div className="timeline">
        {clips.length === 0 ? (
          <div className="empty-state">
            Drag & drop videos or click Import
          </div>
        ) : (
          clips.map((clip, idx) => (
            <div key={clip.id} className="clip">
              {clip.filename} - {clip.duration}s
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

**CSS for Visual Feedback:**
```css
.timeline-container {
  position: relative;
  min-height: 100px;
  background: #2a2a2a;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(74, 144, 226, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #4a90e2;
  pointer-events: none;
  z-index: 10;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #888;
  font-size: 18px;
}
```

**Enable Drag & Drop in Tauri (tauri.conf.json):**
```json
{
  "tauri": {
    "windows": [{
      "fileDropEnabled": true
    }]
  }
}
```

### Video Metadata Extraction

**Tauri Command using FFprobe:**
```rust
use tauri::api::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct VideoMetadata {
    duration: f64,
    width: i32,
    height: i32,
    codec: String,  // Added: Track codec for compatibility
}

#[tauri::command]
async fn get_video_metadata(
    app_handle: tauri::AppHandle,
    video_path: String
) -> Result<VideoMetadata, String> {
    let ffprobe_path = app_handle
        .path_resolver()
        .resolve_resource("binaries/ffprobe")
        .expect("failed to resolve ffprobe");
    
    let output = Command::new(ffprobe_path)
        .args([
            "-v", "error",
            "-show_entries", "format=duration:stream=width,height,codec_name",
            "-of", "json",
            &video_path
        ])
        .output()
        .map_err(|e| format!("FFprobe error: {}", e))?;

    if output.status.success() {
        let json_str = String::from_utf8_lossy(&output.stdout);
        // Parse JSON and extract duration, width, height, codec
        // (Simplified - you'll need proper JSON parsing with serde_json)
        Ok(VideoMetadata {
            duration: 10.5,  // Parse from JSON
            width: 1920,
            height: 1080,
            codec: "h264".to_string(),
        })
    } else {
        Err("Failed to get metadata".to_string())
    }
}
```

**File Validation Before Metadata Extraction:**
```rust
use std::fs;
use std::path::Path;

#[tauri::command]
async fn validate_video_file(file_path: String) -> Result<String, String> {
    // Check file exists
    if !Path::new(&file_path).exists() {
        return Err("File not found. It may have been moved or deleted.".to_string());
    }
    
    // Check file size
    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Cannot read file: {}", e))?;
    
    let size_mb = metadata.len() / (1024 * 1024);
    
    if size_mb > 2000 {
        return Err(format!(
            "File is very large ({} MB). This may cause performance issues. Continue anyway?",
            size_mb
        ));
    }
    
    // Check extension
    let extension = Path::new(&file_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    
    if !matches!(extension.to_lowercase().as_str(), "mp4" | "mov" | "webm") {
        return Err(format!("Unsupported format: .{}. Please use MP4, MOV, or WebM.", extension));
    }
    
    Ok("Valid".to_string())
}
```

**Call from React:**
```javascript
async function addClipToTimeline(filePath) {
  try {
    // Validate first
    await invoke('validate_video_file', { filePath });
    
    // Then extract metadata
    const metadata = await invoke('get_video_metadata', { videoPath: filePath });
    
    // Add to timeline
    setClips(prev => [...prev, {
      id: crypto.randomUUID(),
      path: filePath,
      filename: filePath.split('/').pop(),
      ...metadata,
      inPoint: 0,
      outPoint: metadata.duration
    }]);
  } catch (error) {
    alert(`Failed to import video: ${error}`);
  }
}
```

### Video Player (React)

**Video Player with Playhead Synchronization and Keyboard Shortcuts:**
```jsx
import { useRef, useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

function VideoPlayer({ currentClip, onTimeUpdate, onDeleteClip }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const togglePlayPause = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const currentTime = videoRef.current.currentTime;
    onTimeUpdate(currentTime); // Update playhead position on timeline
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if not typing in input field
      if (e.target.tagName.match(/INPUT|TEXTAREA/)) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        if (currentClip) {
          onDeleteClip(currentClip.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentClip, isPlaying]);

  // Reset when clip changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = currentClip?.inPoint || 0;
    }
  }, [currentClip]);

  const videoUrl = currentClip ? convertFileSrc(currentClip.path) : null;

  return (
    <div className="video-player">
      {currentClip ? (
        <>
          <video 
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            width="100%"
            style={{ maxHeight: '500px', background: '#000' }}
          />
          <div className="controls">
            <button onClick={togglePlayPause}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="time-display">
              {videoRef.current?.currentTime.toFixed(2) || '0.00'}s / {currentClip.duration.toFixed(2)}s
            </span>
            <span className="keyboard-hint">
              (Spacebar: Play/Pause | Delete: Remove Clip)
            </span>
          </div>
        </>
      ) : (
        <div className="no-clip-selected">
          Select a clip from timeline to preview
        </div>
      )}
    </div>
  );
}
```

**Timeline Component with Scrubbing:**
```jsx
function Timeline({ clips, playheadPosition, selectedClipId, onClipSelect, onSeek, onDeleteClip }) {
  const timelineRef = useRef(null);
  const PIXELS_PER_SECOND = 50;
  
  const handleTimelineClick = (e) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const timePosition = clickX / PIXELS_PER_SECOND;
    onSeek(timePosition);
  };

  const handleDeleteClick = (clipId, e) => {
    e.stopPropagation(); // Prevent clip selection
    if (confirm('Delete this clip from timeline?')) {
      onDeleteClip(clipId);
    }
  };

  return (
    <div className="timeline-container">
      <div 
        ref={timelineRef}
        className="timeline" 
        onClick={handleTimelineClick}
        style={{ position: 'relative', height: '100px', background: '#2a2a2a', cursor: 'pointer' }}
      >
        {clips.map((clip, idx) => {
          const startPosition = clips.slice(0, idx).reduce((sum, c) => sum + c.duration, 0);
          return (
            <div
              key={clip.id}
              className={`clip ${selectedClipId === clip.id ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onClipSelect(clip.id);
              }}
              style={{
                position: 'absolute',
                left: `${startPosition * PIXELS_PER_SECOND}px`,
                width: `${clip.duration * PIXELS_PER_SECOND}px`,
                height: '80px',
                background: selectedClipId === clip.id ? '#4a90e2' : '#3a7bc8',
                border: '2px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
            >
              <span style={{ fontSize: '12px', textAlign: 'center' }}>
                {clip.filename}
              </span>
              <button
                onClick={(e) => handleDeleteClick(clip.id, e)}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: 'red',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        
        {/* Playhead */}
        <div
          className="playhead"
          style={{
            position: 'absolute',
            left: `${playheadPosition * PIXELS_PER_SECOND}px`,
            width: '2px',
            height: '100%',
            background: 'red',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      </div>
    </div>
  );
}
```

**Important:** Use Tauri's `convertFileSrc` to convert file paths to usable URLs:
```javascript
import { convertFileSrc } from '@tauri-apps/api/core';

const videoUrl = convertFileSrc('/absolute/path/to/video.mp4');
// Converts to: http://asset.localhost/absolute/path/to/video.mp4
```

---

## Technical Pitfalls & Solutions

### 1. FFmpeg Binary Management
**Pitfall:** FFmpeg not found in production build  
**Solution:**
- Bundle FFmpeg as Tauri "sidecar" using `externalBin` in `tauri.conf.json`
- Use `app_handle.path_resolver().resolve_resource()` to get correct path in both dev and production
- Test packaged app early to verify binary is included and accessible

**Error Handling Pattern:**
```rust
#[tauri::command]
async fn trim_video(app_handle: tauri::AppHandle, /* ... */) -> Result<String, String> {
    let ffmpeg_path = match app_handle.path_resolver().resolve_resource("binaries/ffmpeg") {
        Some(path) => path,
        None => return Err("FFmpeg binary not found. Please reinstall the app.".to_string()),
    };
    
    // Rest of FFmpeg command...
}
```

### 2. FFmpeg Execution Errors
**Pitfall:** FFmpeg fails silently or with cryptic errors  
**Solution:**
- Always capture stderr output from FFmpeg
- Parse error messages and provide user-friendly explanations
- Common errors: file not found, unsupported codec, disk space

**Error Handling Pattern:**
```rust
let output = Command::new(ffmpeg_path)
    .args([/* ... */])
    .output()
    .map_err(|e| format!("Failed to run FFmpeg: {}", e))?;

if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    // Parse common errors
    if stderr.contains("No such file") {
        return Err("Video file not found. It may have been moved or deleted.".to_string());
    } else if stderr.contains("Invalid data") {
        return Err("Video file is corrupted or in an unsupported format.".to_string());
    } else if stderr.contains("Disk full") {
        return Err("Not enough disk space to export video.".to_string());
    } else {
        return Err(format!("Export failed: {}", stderr.lines().last().unwrap_or("Unknown error")));
    }
}
```

### 3. File Path Handling (Cross-Platform)
**Pitfall:** Windows uses backslashes, Mac/Linux use forward slashes  
**Solution:**
- Tauri handles path normalization automatically in file dialogs
- Always use Rust's `std::path::PathBuf` for path manipulation
- Never manually construct paths with string concatenation

**Correct Pattern:**
```rust
use std::path::PathBuf;

let output_path = PathBuf::from(&base_dir)
    .join("exports")
    .join(format!("{}.mp4", timestamp));
```

### 4. Video File Paths in React
**Pitfall:** Can't load video directly from file system path in `<video>` tag  
**Solution:**
- Always use Tauri's `convertFileSrc()` to convert file paths to valid URLs
- Example: `/Users/name/video.mp4` → `http://asset.localhost/Users/name/video.mp4`

**Error Handling in React:**
```jsx
function VideoPlayer({ clip }) {
  const [error, setError] = useState(null);
  
  const videoUrl = clip ? convertFileSrc(clip.path) : null;
  
  const handleError = (e) => {
    console.error('Video load error:', e);
    setError('Failed to load video. The file may be corrupted or unsupported.');
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <video 
        src={videoUrl}
        onError={handleError}
      />
    </div>
  );
}
```

### 5. Large Video Files
**Pitfall:** App crashes or becomes unresponsive with large files (>1GB)  
**Solution:**
- HTML5 `<video>` element streams from disk automatically (no memory loading)
- Use FFmpeg `-c copy` for trim operations (fast, no re-encoding)
- For concatenation, use FFmpeg's concat demuxer (file-based, not memory)
- Warn users about very large files (>2GB)

**Size Check Before Import:**
```rust
use std::fs;

#[tauri::command]
async fn check_file_size(file_path: String) -> Result<u64, String> {
    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let size_mb = metadata.len() / (1024 * 1024);
    
    if size_mb > 2000 {
        return Err(format!(
            "File is too large ({} MB). Files over 2GB may cause performance issues.",
            size_mb
        ));
    }
    
    Ok(metadata.len())
}
```

### 6. Concatenation with Different Codecs
**Pitfall:** FFmpeg concat fails when clips have different codecs/resolutions  
**Solution:**
- For MVP, use `-c copy` which requires same codec
- Show warning if clips have mismatched properties
- Alternative: Re-encode all clips (slower but always works)

**Metadata Comparison:**
```rust
// Check if all clips have same codec before concatenating
// If not, warn user or re-encode
```

### 7. Trim Points Beyond Video Duration
**Pitfall:** User sets out-point beyond video end, FFmpeg fails  
**Solution:**
- Validate in/out points against video duration before calling FFmpeg
- Clamp values to valid range in UI

**Validation in React:**
```jsx
function TrimControls({ clip, onTrimChange }) {
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(clip.duration);
  
  const handleInPointChange = (value) => {
    const clamped = Math.max(0, Math.min(value, outPoint - 0.1));
    setInPoint(clamped);
  };
  
  const handleOutPointChange = (value) => {
    const clamped = Math.min(clip.duration, Math.max(value, inPoint + 0.1));
    setOutPoint(clamped);
  };
  
  // ...
}
```

### 8. Export Progress Tracking (Spinner for MVP)
**Pitfall:** Long exports with no feedback make app seem frozen  
**Solution:**
- For MVP: Simple spinner with "Exporting..." message
- Post-MVP: Parse FFmpeg stderr for actual progress percentage

**MVP Pattern:**
```jsx
function ExportButton({ clips, onExportComplete }) {
  const [exporting, setExporting] = useState(false);
  
  const handleExport = async () => {
    setExporting(true);
    try {
      await invoke('export_timeline', { clips });
      onExportComplete();
    } catch (error) {
      alert(`Export failed: ${error}`);
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <button onClick={handleExport} disabled={exporting}>
      {exporting ? 'Exporting...' : 'Export Video'}
    </button>
  );
}
```

### 9. Packaging & Distribution
**Pitfall:** Build works on your machine but fails on others  
**Solution:**
- Test packaged app early (build by Day 2)
- For Windows builds from Mac: Use GitHub Actions
- Include clear build instructions in README

**GitHub Actions for Cross-Platform Build:**
```yaml
name: Build
on: [push]
jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, windows-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: dtolnay/rust-toolchain@stable
      - run: npm install
      - run: cargo tauri build
```
- Use Tauri's updater for easy distribution
- For MVP: Provide clear build instructions in README

---

## Testing Checklist

Test these scenarios before submission to ensure MVP requirements are met:

### Import & Display Tests
- [ ] **Drag & drop single MP4 file** → Clip appears on timeline
- [ ] **Drag & drop single MOV file** → Clip appears on timeline
- [ ] **Drag & drop 3 video files at once** → All 3 clips appear on timeline
- [ ] **Use file picker to import video** → Clip appears on timeline
- [ ] **Try to import unsupported format** (.txt, .jpg) → Error message shown
- [ ] **Import very large file** (>1GB) → App doesn't crash, warning if >2GB
- [ ] **Import video with special characters in filename** → Loads correctly

### Timeline Tests
- [ ] **Timeline shows multiple clips in sequence** → Visual representation correct
- [ ] **Clip widths correspond to duration** → 10s clip is longer than 5s clip
- [ ] **Clips maintain order they were added** → Order is predictable
- [ ] **Timeline scale is fixed** → 1 second = 50 pixels (or your chosen scale)

### Video Preview Tests
- [ ] **Click on clip** → Video loads in player
- [ ] **Press play** → Video plays with audio
- [ ] **Press pause** → Video stops
- [ ] **Playhead moves during playback** → Timeline playhead updates in real-time
- [ ] **Video displays at correct aspect ratio** → No stretching/squashing
- [ ] **Switch between clips** → Player updates to show new clip

### Trim Functionality Tests
- [ ] **Set in-point at 5s** → Preview starts at 5s
- [ ] **Set out-point at 10s** → Preview ends at 10s
- [ ] **Set in-point > out-point** → UI prevents invalid range
- [ ] **Set out-point beyond video duration** → UI clamps to max duration
- [ ] **Trim very short segment** (<1 second) → Works without errors
- [ ] **Reset trim points** → Returns to full clip duration

### Export Tests
- [ ] **Export single trimmed clip** → MP4 file created
- [ ] **Export timeline with 3 clips** → All clips concatenated correctly
- [ ] **Exported video plays in VLC** → Video and audio work
- [ ] **Exported video plays in QuickTime** (Mac) → Video and audio work
- [ ] **Exported video plays in Windows Media Player** (Windows) → Video and audio work
- [ ] **Export with special characters in filename** → File saves correctly
- [ ] **Export progress spinner shows** → User knows export is happening
- [ ] **Cancel during export** (if implemented) → Process stops cleanly

### Error Handling Tests
- [ ] **Try to export with no clips** → Error message shown
- [ ] **Delete video file while app is open** → Error handled gracefully
- [ ] **FFmpeg fails** (simulate by renaming binary) → User-friendly error message
- [ ] **No disk space for export** → Clear error message
- [ ] **Import corrupted video file** → Error message, app doesn't crash

### Performance Tests
- [ ] **Timeline with 10+ clips** → UI remains responsive
- [ ] **Scrub through long video** (>10 min) → No lag
- [ ] **Export 2-minute video** → Completes in reasonable time (<5 minutes)
- [ ] **Leave app open for 15+ minutes** → No memory leaks, no slowdown
- [ ] **Import 4K video file** → Preview plays (even if slow)

### Packaging Tests
- [ ] **Build Mac app** → .dmg file created
- [ ] **Install Mac app** → Launches without developer warnings
- [ ] **Mac app works in packaged form** → All features functional
- [ ] **Build Windows app** (via GitHub Actions) → .exe file created
- [ ] **Windows app launches** → No missing DLL errors
- [ ] **Windows app works in packaged form** → All features functional
- [ ] **FFmpeg binary is bundled** → App works without system FFmpeg

### Cross-Platform Tests
- [ ] **Video paths work on Mac** → File paths load correctly
- [ ] **Video paths work on Windows** → File paths load correctly
- [ ] **Exported videos are compatible** → Mac export plays on Windows and vice versa

### Edge Cases
- [ ] **Import video with no audio track** → Loads and exports correctly
- [ ] **Import video with unusual aspect ratio** (vertical, square) → Displays correctly
- [ ] **Timeline with mix of MP4 and MOV** → All clips work together
- [ ] **Very short clip** (<1 second) → Displays and exports correctly
- [ ] **Very long clip** (>1 hour) → Doesn't crash, may be slow

---

## Prerequisites & Initial Setup

Before starting development, ensure you have:

### System Requirements
- **macOS** 10.15+ (for Mac builds)
- **Windows** 10+ (for Windows builds, optional via GitHub Actions)
- **Rust** 1.70+
- **Node.js** 18+
- **npm** or **yarn**

### Install Rust (if not already installed)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Install Tauri CLI
```bash
cargo install tauri-cli
```

### Create ClipForge Project
```bash
npm create tauri-app@latest
# Choose:
# - Project name: clipforge
# - Package manager: npm
# - UI template: React
# - Vite for bundler
```

### Download FFmpeg Binaries
1. **For macOS:**
   ```bash
   # Download from https://evermeet.cx/ffmpeg/
   mkdir -p src-tauri/binaries
   # Place ffmpeg and ffprobe in src-tauri/binaries/
   chmod +x src-tauri/binaries/ffmpeg
   chmod +x src-tauri/binaries/ffprobe
   ```

2. **For Windows:**
   ```bash
   # Download from https://www.gyan.dev/ffmpeg/builds/
   # Extract ffmpeg.exe and ffprobe.exe
   # Place in src-tauri/binaries/
   ```

### Configure Tauri for FFmpeg Bundling
Edit `src-tauri/tauri.conf.json`:
```json
{
  "tauri": {
    "bundle": {
      "externalBin": [
        "binaries/ffmpeg",
        "binaries/ffprobe"
      ]
    },
    "windows": [{
      "fileDropEnabled": true,
      "title": "ClipForge",
      "width": 1280,
      "height": 720,
      "minWidth": 800,
      "minHeight": 600
    }]
  }
}
```

### Verify Setup
```bash
cd clipforge
npm install
cargo tauri dev
```
You should see the Tauri window open with default React template.

---

## Implementation Task List

Complete these tasks in order. Each task should result in working, testable functionality.

### Foundation Tasks

#### Task 1: Project Structure Setup
- [ ] Create project using `npm create tauri-app@latest`
- [ ] Install dependencies: `npm install`
- [ ] Verify `cargo tauri dev` launches successfully
- [ ] Set up Git repository and initial commit
- [ ] Create folder structure:
  - `src/components/` (React components)
  - `src-tauri/binaries/` (FFmpeg binaries)
  - `src/utils/` (Helper functions)

#### Task 2: FFmpeg Binary Integration
- [ ] Download FFmpeg and FFprobe for macOS
- [ ] Download FFmpeg and FFprobe for Windows
- [ ] Place binaries in `src-tauri/binaries/`
- [ ] Make binaries executable on Mac: `chmod +x`
- [ ] Configure `tauri.conf.json` with `externalBin`
- [ ] Test binary resolution in Rust:
  ```rust
  let ffmpeg_path = app_handle.path_resolver().resolve_resource("binaries/ffmpeg");
  println!("FFmpeg path: {:?}", ffmpeg_path);
  ```

#### Task 3: Basic UI Layout
- [ ] Remove default Tauri template content
- [ ] Create main app layout with 3 sections:
  - Top: Video player area
  - Middle: Timeline area
  - Bottom: Controls (import, export buttons)
- [ ] Add basic CSS/Tailwind styling
- [ ] Ensure responsive layout (minimum 800x600)

---

## Success Metrics

### MVP Pass Criteria (Binary - Yes/No)
- [ ] App launches from packaged executable
- [ ] Can import at least one MP4 file
- [ ] Timeline shows the imported clip
- [ ] Video plays in preview window
- [ ] Can trim clip (set start/end)
- [ ] Exports trimmed clip to MP4
- [ ] Exported MP4 plays correctly in external player
- [ ] Works on both Mac and Windows

### Quality Indicators (Not Hard Requirements)
- Timeline UI is intuitive (tester can figure out without docs)
- Export completes in under 2x video duration (thanks to `-c copy`)
- No crashes during 10-minute test session
- App launches in under 3 seconds

---

## Project Structure

```
clipforge/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   └── main.rs     # Tauri commands (FFmpeg, file dialogs)
│   ├── Cargo.toml
│   └── tauri.conf.json # Tauri configuration
├── src/                # React frontend
│   ├── App.jsx         # Main component
│   ├── components/
│   │   ├── VideoPlayer.jsx
│   │   ├── Timeline.jsx
│   │   ├── TrimControls.jsx
│   │   └── ExportButton.jsx
│   └── main.jsx
├── package.json
└── README.md
```

---

## Tauri-Specific Resources

**Official Docs:**
- Tauri Getting Started: https://tauri.app/v1/guides/getting-started/setup
- Tauri Commands: https://tauri.app/v1/guides/features/command
- Tauri File System: https://tauri.app/v1/api/js/fs

**Key Tauri APIs You'll Use:**
- `invoke()` - Call Rust commands from React
- `convertFileSrc()` - Convert file paths to loadable URLs
- File dialogs - Open/save file pickers
- Events - Emit progress updates from Rust → React

**FFmpeg Resources:**
- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- Common FFmpeg Commands: https://gist.github.com/steven2358/ba153c642fe2bb1e47485962df07c730

---

## Open Questions & Decisions Needed

1. **FFmpeg Bundling:** System install for MVP, bundle for final submission?  
   *Recommendation:* System install for MVP (faster iteration), bundle for final

2. **Timeline UI:** Simple HTML/CSS or Canvas-based?  
   *Recommendation:* HTML/CSS for MVP (faster), Canvas if needed for performance

3. **Export Quality:** Source resolution or fixed (720p/1080p)?  
   *Recommendation:* Source resolution with `-c copy` (fastest, best quality)

4. **Platform Build Order:** Mac first, then Windows?  
   *Recommendation:* Build for your development platform first, add second platform on Day 2

---

## Next Steps

1. ✅ Confirm tech stack: Tauri + React + FFmpeg CLI
2. Install prerequisites (Rust, Tauri CLI, FFmpeg)
3. Create project using `cargo create-tauri-app`
4. Set up GitHub repository
5. Begin Phase 1: App skeleton and basic UI

**Remember:** Focus on getting one video to import → display → trim → export. Everything else builds on that foundation.