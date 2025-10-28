# ClipForge

A professional-grade desktop video editor built with Tauri 2.0, React, and FFmpeg. ClipForge provides a lightweight yet powerful solution for video editing with professional features like timeline zoom, audio controls, undo/redo, and project management.

## 🎯 Project Status

**Current Version:** v0.1.0 MVP  
**Status:** Complete MVP with all core features implemented  
**Platform:** macOS (ARM64) - Windows support planned for future releases

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

## 🚀 Installation

### Download & Install

1. **Download the latest release** from the [Releases page](../../releases)
2. **Download `clipforge_0.1.0_aarch64.dmg`** for macOS (Apple Silicon)
3. **Install the app** by dragging to Applications folder
4. **First Launch**: macOS may show a security warning. To bypass:
   - Go to System Preferences → Security & Privacy
   - Click "Open Anyway" for ClipForge
   - Or right-click the app and select "Open"

### System Requirements

- **macOS**: 10.13 or later (Apple Silicon recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100MB for app + space for video files
- **FFmpeg**: Bundled with the application

## 🎮 Usage Guide

### Getting Started

1. **Launch ClipForge** from Applications or Spotlight
2. **Import videos** by dragging files onto the timeline or clicking "Import Video"
3. **Trim clips** by setting in/out points using the timeline handles or keyboard shortcuts
4. **Adjust audio** using the volume slider and mute toggle in the controls panel
5. **Export** your edited video using the Export button or Cmd+E shortcut

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

## 🏗️ Development Setup

### Prerequisites

- **Rust** (install from https://rustup.rs)
- **Node.js** 18+ (install from https://nodejs.org)
- **Tauri CLI**: `cargo install tauri-cli`

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/clipforge.git
   cd clipforge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install FFmpeg (for development):**
   ```bash
   # macOS with Homebrew
   brew install ffmpeg
   
   # Copy binaries to Tauri bin directory
   cp /opt/homebrew/bin/ffmpeg src-tauri/bin/ffmpeg-aarch64-apple-darwin
   cp /opt/homebrew/bin/ffprobe src-tauri/bin/ffprobe-aarch64-apple-darwin
   ```

4. **Run in development mode:**
   ```bash
   npm run tauri dev
   ```

### Building

```bash
# Build for development
npm run build

# Build production package
npm run tauri build
```

Output will be in `src-tauri/target/release/bundle/`

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

## 🔮 Roadmap

### Future Enhancements (Post-MVP)

- **Clip Reordering**: Drag clips to reorder on timeline
- **Auto-save**: Automatic project saving and crash recovery
- **Timeline Markers**: Add markers and labels for organization
- **Clip Splitting**: Split clips at playhead position
- **Transitions**: Fade, dissolve, and wipe transitions
- **Video Effects**: Brightness, contrast, and color filters
- **Text Overlays**: Add titles and captions
- **Audio Waveform**: Visual audio representation
- **Multi-track Timeline**: Separate audio and video tracks
- **Export Presets**: Pre-configured export settings
- **Windows Support**: Cross-platform compatibility

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