# ClipForge

A professional-grade desktop video editor built with Tauri 2.0, React, and FFmpeg. ClipForge provides a lightweight yet powerful solution for video editing with professional features like timeline zoom, audio controls, undo/redo, and project management.

## 🎯 Project Status

**Current Version:** v0.1.0 MVP  
**Status:** ✅ Complete MVP with all core features implemented  
**Platform:** macOS (ARM64) - Windows support planned for future releases  
**Last Updated:** January 2025

### Download Latest Release

[![Download ClipForge](https://img.shields.io/badge/Download-ClipForge%20v0.1.0-blue?style=for-the-badge&logo=apple)](../../releases)

**Direct Download Links:**
- **macOS (Apple Silicon)**: [clipforge_0.1.0_aarch64.dmg](../../releases/download/v0.1.0/clipforge_0.1.0_aarch64.dmg) (~150MB)
- **All Releases**: [View all releases](../../releases)

**System Requirements:**
- macOS 10.15+ (Catalina or later)
- Apple Silicon Mac (M1/M2/M3)
- 4GB RAM minimum, 8GB recommended

## ✨ Features

### Core Video Editing
- ✅ **Multi-format Import**: Drag & drop or file picker for MP4, MOV, AVI, and more
- ✅ **Visual Timeline**: Professional timeline with clip arrangement and visual feedback
- ✅ **HTML5 Video Player**: High-quality preview with frame-accurate scrubbing
- ✅ **Precise Trimming**: Set in/out points with frame-accurate precision (30fps)
- ✅ **Multi-clip Export**: Export trimmed clips as single concatenated MP4 file
- ✅ **Professional Export**: H.264 codec with audio support and volume control

### Professional Features
- ✅ **Undo/Redo System**: Complete history tracking for all editing actions
- ✅ **Project Management**: Save/load projects in JSON format with full state preservation
- ✅ **Audio Controls**: Per-clip volume adjustment (0-200%) and mute toggle
- ✅ **Timeline Zoom**: Dynamic zoom levels (25%-2000%) with frame-accurate view
- ✅ **Clip Thumbnails**: Automatic thumbnail extraction showing filmstrip preview
- ✅ **Keyboard Shortcuts**: Professional-grade shortcuts for all major functions
- ✅ **Error Handling**: Comprehensive error reporting with detailed diagnostics

### User Experience
- ✅ **Toast Notifications**: Professional notification system with success/error feedback
- ✅ **Keyboard Help**: Built-in help modal showing all available shortcuts
- ✅ **Responsive UI**: Professional layout that scales with window size
- ✅ **File Management**: Smart file handling with validation and error recovery

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Rust + Tauri 2.0
- **Video Processing**: FFmpeg/FFprobe (bundled)
- **State Management**: Custom React hooks with history tracking
- **Styling**: CSS Grid + Flexbox for professional layout

## 🚀 Download & Installation

### Quick Start (Recommended)

1. **Download the latest release**:
   - Click the download button above, or
   - Go to the [Releases page](../../releases)
   - Download `clipforge_0.1.0_aarch64.dmg` for macOS (Apple Silicon)
   - File size: ~150MB (includes bundled FFmpeg)

2. **Install ClipForge**:
   - Double-click the downloaded `.dmg` file
   - Drag ClipForge to your Applications folder
   - Eject the disk image when done

3. **First Launch**:
   - Open Applications folder and double-click ClipForge
   - macOS will show a security warning (this is normal for unsigned apps)
   - **To bypass the warning**:
     - Go to **System Preferences** → **Security & Privacy** → **General**
     - Click **"Open Anyway"** next to the ClipForge warning
     - Or right-click the app and select **"Open"**

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **macOS Version** | 10.15 (Catalina) | 12.0+ (Monterey) |
| **Architecture** | Apple Silicon (ARM64) | Apple Silicon (M1/M2/M3) |
| **RAM** | 4GB | 8GB+ |
| **Storage** | 200MB free | 1GB+ free |
| **FFmpeg** | Bundled | Bundled |

### Supported Video Formats

- **Input**: MP4, MOV, AVI, MKV, WebM, M4V, 3GP, FLV, WMV
- **Output**: MP4 (H.264 with audio)
- **Resolution**: Up to 4K (source resolution preserved)
- **Audio**: AAC, MP3, Opus, PCM

### Troubleshooting Installation

#### "App is damaged and can't be opened"
```bash
# Run this command in Terminal to remove the quarantine flag
sudo xattr -rd com.apple.quarantine /Applications/ClipForge.app
```

#### "ClipForge cannot be opened because the developer cannot be verified"
1. Go to **System Preferences** → **Security & Privacy**
2. Click the **lock icon** and enter your password
3. Click **"Open Anyway"** under the ClipForge entry
4. Try opening the app again

#### App won't launch after installation
1. Check that you have macOS 10.15 or later
2. Ensure you have at least 4GB of available RAM
3. Try restarting your Mac and launching again
4. Check Console.app for any error messages

## 🎮 How to Use ClipForge

### Getting Started (5 minutes)

1. **Launch the App**:
   - Open ClipForge from Applications folder
   - Or press `Cmd+Space` and type "ClipForge"

2. **Import Your First Video**:
   - **Method 1**: Drag video files directly onto the timeline area
   - **Method 2**: Click the "Import Video" button and select files
   - **Method 3**: Use `Cmd+I` keyboard shortcut

3. **Basic Editing**:
   - **Play/Pause**: Press `Spacebar` or click the play button
   - **Trim Clips**: Drag the yellow handles on the timeline to set in/out points
   - **Seek**: Click anywhere on the timeline to jump to that position

4. **Export Your Video**:
   - Click the **"Export"** button in the top-right corner
   - Choose your export location and filename
   - Click **"Export"** to start the process

### Step-by-Step Tutorial

#### 1. Import Multiple Videos
```
1. Drag 2-3 video files onto the timeline
2. Notice how they appear as separate clips
3. Each clip shows thumbnails automatically
```

#### 2. Arrange Your Timeline
```
1. Drag clips left/right to reorder them
2. Clips will snap together automatically
3. Use the zoom controls to see more detail
```

#### 3. Trim Your Clips
```
1. Click on a clip to select it
2. Drag the yellow handles to trim the start/end
3. Use I/O keys for precise trimming:
   - Press 'I' to set in point at current position
   - Press 'O' to set out point at current position
```

#### 4. Adjust Audio
```
1. Select a clip on the timeline
2. Use the volume slider (0-200%)
3. Toggle mute button to silence audio
4. Changes apply to the selected clip only
```

#### 5. Export Your Project
```
1. Click "Export" button (or press Cmd+E)
2. Choose export location and filename
3. Click "Export" to start processing
4. Wait for completion notification
```

### Advanced Features

#### Timeline Zoom
- **Zoom In**: `Cmd+=` or use zoom controls
- **Zoom Out**: `Cmd+-` or use zoom controls  
- **Zoom to Fit**: `Cmd+0` to see entire timeline
- **Frame-accurate editing** at high zoom levels

#### Project Management
- **Save Project**: `Cmd+S` to save your work
- **Load Project**: `Cmd+O` to open saved project
- **New Project**: `Cmd+N` to start fresh
- **Undo/Redo**: `Cmd+Z` / `Cmd+Shift+Z`

#### Professional Workflow
1. **Rough Cut**: Import all footage and arrange clips
2. **Fine Tuning**: Use zoom and precise trimming
3. **Audio Mix**: Adjust volume levels per clip
4. **Review**: Play through entire timeline
5. **Export**: Final output with professional settings

### Keyboard Shortcuts

#### Global Shortcuts
- `Cmd+N` / `Ctrl+N` - New Project
- `Cmd+S` / `Ctrl+S` - Save Project  
- `Cmd+O` / `Ctrl+O` - Open Project
- `Cmd+E` / `Ctrl+E` - Quick Export
- `Cmd+Z` / `Ctrl+Z` - Undo
- `Cmd+Shift+Z` / `Ctrl+Y` - Redo
- `?` - Show Keyboard Help

#### Playback & Navigation
- `Spacebar` / `K` - Play/Pause
- `Arrow Left` / `J` - Seek Backward 5s
- `Arrow Right` / `L` - Seek Forward 5s
- `Home` - Jump to Start
- `End` - Jump to End

#### Editing
- `I` - Set In Point
- `O` - Set Out Point
- `Delete` / `Backspace` - Delete Selected Clip

#### Timeline Zoom
- `Cmd+=` / `Ctrl+=` - Zoom In
- `Cmd+-` / `Ctrl+-` - Zoom Out
- `Cmd+0` / `Ctrl+0` - Zoom to Fit

### Professional Workflow

1. **Project Setup**: Start with Cmd+N to create a new project
2. **Import Media**: Drag multiple video files to build your timeline
3. **Rough Cut**: Use I/O keys to quickly set trim points
4. **Fine Tuning**: Use timeline zoom for frame-accurate editing
5. **Audio Mix**: Adjust volume levels and mute unwanted audio
6. **Review**: Play through your edit to check timing and flow
7. **Export**: Use Cmd+E for quick export or Export button for options
8. **Save Project**: Use Cmd+S to save your work for later

## 🛠️ Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Installation |
|------|---------|--------------|
| **Rust** | Latest stable | [rustup.rs](https://rustup.rs) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Tauri CLI** | Latest | `cargo install tauri-cli` |
| **Git** | Latest | [git-scm.com](https://git-scm.com) |

### Quick Setup (5 minutes)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/clipforge.git
   cd clipforge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify FFmpeg binaries:**
   ```bash
   # Check that FFmpeg binaries exist
   ls -la src-tauri/binaries/
   # Should show: ffmpeg, ffmpeg-aarch64-apple-darwin, ffprobe, ffprobe-aarch64-apple-darwin
   ```

4. **Start development server:**
   ```bash
   npm run tauri dev
   ```

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Start development server with hot reload |
| `npm run build` | Build frontend only |
| `npm run tauri build` | Build production app bundle |
| `npm run preview` | Preview built frontend |

### Project Structure

```
clipforge/
├── src/                          # React frontend
│   ├── components/              # UI components
│   │   ├── VideoPlayer.tsx      # Video preview player
│   │   ├── Timeline.tsx         # Timeline with zoom support
│   │   ├── ImportButton.tsx     # File import component
│   │   ├── ClipThumbnails.tsx   # Thumbnail extraction
│   │   └── ...                  # Other components
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Helper functions
│   └── App.tsx                  # Root component
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── lib.rs              # Tauri command handlers
│   │   ├── thumbnails.rs       # Thumbnail generation
│   │   └── export.rs           # Video export
│   ├── binaries/               # FFmpeg binaries (bundled)
│   └── tauri.conf.json         # Tauri configuration
└── dist/                        # Built frontend
```

### Building for Production

#### Development Build
```bash
npm run build
# Output: dist/ folder with built frontend
```

#### Production App Bundle
```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/
# Contains: .dmg file for macOS distribution
```

#### Build Output Location
```
src-tauri/target/release/bundle/
├── dmg/
│   └── clipforge_0.1.0_aarch64.dmg    # macOS installer
├── macos/
│   └── clipforge.app                   # macOS app bundle
└── share/
    └── create-dmg/                     # DMG creation tools
```

### Development Tips

#### Hot Reload
- Frontend changes reload automatically
- Backend changes require restart: `npm run tauri dev`
- Check console for any build errors

#### Debugging
- **Frontend**: Use browser dev tools (F12)
- **Backend**: Check terminal output for Rust errors
- **Tauri**: Use `console.log()` in frontend, `println!()` in Rust

#### Testing
- Test with various video formats
- Verify FFmpeg path resolution
- Check thumbnail generation
- Test export functionality

### Troubleshooting Development

#### "FFmpeg not found" error
```bash
# Ensure binaries exist and are executable
ls -la src-tauri/binaries/
chmod +x src-tauri/binaries/ffmpeg*
```

#### Build fails with Rust errors
```bash
# Update Rust toolchain
rustup update
cargo clean
npm run tauri dev
```

#### Frontend build errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run tauri dev
```

## 📁 Project Structure

```
ClipForge/
├── src/                          # React frontend
│   ├── components/              # UI components
│   │   ├── VideoPlayer.tsx      # Video preview player
│   │   ├── Timeline.tsx         # Timeline with zoom support
│   │   ├── ImportButton.tsx     # File import component
│   │   ├── KeyboardShortcutsHelp.tsx  # Help modal
│   │   ├── Toast.tsx            # Notification system
│   │   ├── UndoRedoButtons.tsx  # Undo/redo controls
│   │   ├── ProjectMenu.tsx     # Save/load project
│   │   ├── AudioControls.tsx    # Volume and mute controls
│   │   ├── ZoomControls.tsx     # Timeline zoom controls
│   │   └── ClipThumbnails.tsx   # Thumbnail extraction
│   ├── hooks/                   # Custom React hooks
│   │   ├── useHistory.ts        # Undo/redo system
│   │   ├── usePlaybackLoop.ts   # Timeline playback
│   │   └── useExport.ts         # Export functionality
│   ├── utils/                   # Helper functions
│   │   └── toastHelpers.ts      # Toast notification utilities
│   ├── App.tsx                  # Root component
│   └── App.css                  # Main styles
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   └── lib.rs              # Tauri commands and FFmpeg integration
│   ├── bin/                     # FFmpeg binaries (platform-specific)
│   ├── capabilities/           # Tauri permissions
│   └── tauri.conf.json         # Tauri configuration
├── dist/                        # Built frontend
└── README.md
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Import**: Drag & drop various video formats
- [ ] **Timeline**: Add multiple clips and verify arrangement
- [ ] **Playback**: Play/pause, scrubbing, and timeline navigation
- [ ] **Trimming**: Set in/out points and verify frame accuracy
- [ ] **Audio**: Volume adjustment and mute functionality
- [ ] **Zoom**: Timeline zoom in/out and frame-accurate view
- [ ] **Thumbnails**: Verify thumbnail extraction and display
- [ ] **Export**: Single and multi-clip export with audio
- [ ] **Undo/Redo**: All editing actions are undoable
- [ ] **Projects**: Save/load projects with full state preservation
- [ ] **Keyboard Shortcuts**: All shortcuts work as expected
- [ ] **Error Handling**: Graceful error recovery and user feedback

### Performance Testing

- [ ] **Large Files**: Test with 4K video files
- [ ] **Many Clips**: Timeline with 50+ clips
- [ ] **Long Videos**: Files over 1 hour duration
- [ ] **Export Speed**: Multi-clip export performance
- [ ] **Memory Usage**: Monitor during extended editing sessions

## 🐛 Known Issues

- **Unsigned App**: macOS may show security warning on first launch
- **FFmpeg Dependencies**: Some video formats may require additional codecs
- **Large Files**: Very large video files (>2GB) may cause performance issues

## 🆕 What's New in v0.1.0

### ✨ Major Features
- **Professional Timeline**: Frame-accurate editing with zoom support
- **Multi-format Support**: Import MP4, MOV, AVI, MKV, WebM, and more
- **Automatic Thumbnails**: Filmstrip preview for all video clips
- **Audio Controls**: Per-clip volume adjustment and mute
- **Project Management**: Save/load projects with full state preservation
- **Undo/Redo System**: Complete history tracking for all actions
- **Professional Export**: H.264 with audio support
- **Keyboard Shortcuts**: Professional-grade shortcuts for all functions

### 🔧 Technical Improvements
- **Tauri 2.0**: Latest desktop app framework
- **Bundled FFmpeg**: No external dependencies required
- **Production Ready**: Fixed thumbnail generation in deployed apps
- **macOS Optimized**: Native Apple Silicon support
- **Error Handling**: Comprehensive error reporting and recovery

## 🔮 Roadmap

### v1.1 (Coming Soon)
- **Screen Recording**: Built-in screen capture functionality
- **Webcam Recording**: Simultaneous screen + webcam recording
- **Clip Reordering**: Drag clips to reorder on timeline
- **Auto-save**: Automatic project saving and crash recovery

### v1.2 (Future)
- **Timeline Markers**: Add markers and labels for organization
- **Clip Splitting**: Split clips at playhead position
- **Transitions**: Fade, dissolve, and wipe transitions
- **Video Effects**: Brightness, contrast, and color filters
- **Text Overlays**: Add titles and captions

### v2.0 (Long-term)
- **Audio Waveform**: Visual audio representation
- **Multi-track Timeline**: Separate audio and video tracks
- **Export Presets**: Pre-configured export settings
- **Windows Support**: Cross-platform compatibility
- **Cloud Integration**: Google Drive upload support

## 📚 Documentation

- [API Documentation](API.md) - Complete Tauri command reference
- [Contributing Guide](CONTRIBUTING.md) - Development guidelines
- [Changelog](CHANGELOG.md) - Version history
- [Testing Guide](TESTING.md) - Comprehensive testing procedures
- [Roadmap](ROADMAP.md) - Future development plans

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is proprietary software developed for Gauntlet AI.

## 🙏 Acknowledgments

- **Tauri Team** for the excellent desktop app framework
- **FFmpeg Community** for powerful video processing capabilities
- **React Team** for the robust frontend framework

---

**Built with ❤️ using Tauri 2.0, React, and Rust**