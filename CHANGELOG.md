# Changelog

All notable changes to ClipForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-19

### Added
- **Core Video Editing**
  - Multi-format video import (MP4, MOV, AVI, etc.) via drag & drop or file picker
  - Visual timeline with professional clip arrangement
  - HTML5 video player with frame-accurate scrubbing
  - Precise trimming with in/out points (30fps frame accuracy)
  - Multi-clip export as single concatenated MP4 file
  - Professional H.264 export with audio support

- **Professional Features**
  - Complete undo/redo system with history tracking for all editing actions
  - Project save/load functionality with JSON format and full state preservation
  - Per-clip audio controls with volume adjustment (0-200%) and mute toggle
  - Dynamic timeline zoom (25%-2000%) with frame-accurate view at maximum zoom
  - Automatic thumbnail extraction showing filmstrip preview for each clip
  - Comprehensive keyboard shortcuts following professional video editor conventions
  - Professional error handling with detailed diagnostics and user feedback

- **User Experience**
  - Toast notification system with success/error feedback and expandable error details
  - Built-in keyboard shortcuts help modal accessible via `?` key
  - Responsive professional UI layout that scales with window size
  - Smart file management with validation and graceful error recovery
  - Professional color scheme and typography

- **Technical Implementation**
  - Tauri 2.0 backend with Rust for performance and security
  - React 18 frontend with TypeScript for type safety
  - FFmpeg integration for professional video processing
  - Custom React hooks for state management and history tracking
  - CSS Grid and Flexbox for professional layout system
  - Platform-specific FFmpeg binary bundling

### Technical Details
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Rust + Tauri 2.0
- **Video Processing**: FFmpeg/FFprobe (bundled)
- **State Management**: Custom React hooks with history tracking
- **Styling**: CSS Grid + Flexbox for professional layout
- **Platform Support**: macOS (ARM64) with Windows support planned

### Keyboard Shortcuts
- **Global**: Cmd+N (New Project), Cmd+S (Save), Cmd+O (Open), Cmd+E (Export), Cmd+Z (Undo), Cmd+Shift+Z (Redo), ? (Help)
- **Playback**: Spacebar/K (Play/Pause), Arrow Left/J (Seek Back), Arrow Right/L (Seek Forward), Home (Start), End (End)
- **Editing**: I (In Point), O (Out Point), Delete/Backspace (Delete Clip)
- **Zoom**: Cmd+= (Zoom In), Cmd+- (Zoom Out), Cmd+0 (Zoom to Fit)

### File Formats Supported
- **Input**: MP4, MOV, AVI, MKV, WebM, and other FFmpeg-supported formats
- **Output**: MP4 with H.264 video and AAC audio codecs
- **Projects**: JSON format with `.clipforge` extension

### System Requirements
- **macOS**: 10.13 or later (Apple Silicon recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100MB for app + space for video files
- **FFmpeg**: Bundled with the application

### Known Issues
- Unsigned app may show security warning on first macOS launch
- Some video formats may require additional FFmpeg codecs
- Very large video files (>2GB) may cause performance issues

### Future Enhancements (Planned)
- Clip reordering via drag & drop
- Auto-save and crash recovery
- Timeline markers and labels
- Clip splitting at playhead
- Video transitions (fade, dissolve, wipe)
- Video effects (brightness, contrast, filters)
- Text overlays and titles
- Audio waveform visualization
- Multi-track timeline
- Export presets
- Windows support

---

## Development History

### Pre-Release Development

#### Phase 1: Foundation (PRs 1-5)
- Project setup with Tauri 2.0 and React
- Basic UI layout and component structure
- Video import functionality with drag & drop
- HTML5 video player integration
- Timeline component with basic clip display

#### Phase 2: Core Editing (PRs 6-8)
- Trim functionality with in/out points
- Frame-accurate editing (30fps precision)
- Multi-clip export with FFmpeg integration
- Professional export system with audio support

#### Phase 3: Professional Features (PRs 9-12)
- New Project functionality with keyboard shortcuts
- Comprehensive keyboard shortcuts system
- Professional error handling with toast notifications
- Complete undo/redo system with history tracking

#### Phase 4: Advanced Features (PRs 13-16)
- Project save/load with JSON format
- Audio controls with volume and mute
- Timeline zoom with frame-accurate view
- Clip thumbnails with automatic extraction
- Mac packaging and distribution
- Comprehensive documentation

### Architecture Decisions
- **Tauri 2.0**: Chosen for security, performance, and modern desktop app capabilities
- **React 18**: Selected for component-based architecture and TypeScript support
- **FFmpeg**: Integrated for professional video processing capabilities
- **Custom State Management**: Implemented for precise control over undo/redo functionality
- **CSS Grid/Flexbox**: Used for professional, responsive layout system

### Performance Optimizations
- Efficient video thumbnail extraction with caching
- Optimized timeline rendering with zoom levels
- Smart state management to minimize re-renders
- FFmpeg integration for hardware-accelerated video processing
- Lazy loading of video thumbnails

### Security Considerations
- Tauri's security model with capability-based permissions
- File system access restricted to user-selected files
- No network access or data collection
- Local processing only (no cloud dependencies)

---

**Note**: This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format and uses [Semantic Versioning](https://semver.org/) for version numbers.
