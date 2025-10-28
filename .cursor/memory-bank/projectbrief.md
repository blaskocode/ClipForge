# ClipForge - Project Brief

## Project Overview
ClipForge is a lightweight desktop video editor built with Tauri 2.0, React, and FFmpeg. The MVP focuses on core functionality: importing video files, arranging them on a timeline, performing basic trims, and exporting to MP4 format.

## Project Goals
- **Primary Goal**: Build a working video editor that proves core media handling capabilities in a native desktop environment
- **MVP Deadline**: October 28, 2025 at 10:59 PM CT
- **Final Deadline**: October 29, 2025 at 10:59 PM CT
- **Core Philosophy**: A working, simple video editor beats a feature-rich app that doesn't ship

## Core Requirements

### MVP Requirements (Hard Gate - Tuesday 10:59 PM CT)
1. **Desktop Application Launch** - App launches on macOS and Windows as native executable
2. **Video Import** - Support MP4/MOV with drag & drop and file picker
3. **Timeline View** - Horizontal timeline displaying imported clips with proportional widths
4. **Video Preview Player** - Play/pause controls with playhead sync
5. **Basic Trim Functionality** - Set in/out points on clips with visual indicators
6. **Export to MP4** - Export single or multiple clips with progress indicator
7. **Native Packaging** - Distributable .dmg/.app for Mac and .exe for Windows

### Technical Stack
- **Frontend**: React 18+ with Vite, TypeScript
- **Backend**: Rust (Tauri 2.0)
- **Video Processing**: FFmpeg/FFprobe (bundled as binaries)
- **Architecture**: Tauri IPC for React ↔ Rust communication

## Key Constraints
- Must work on both Mac and Windows
- FFmpeg must be bundled (no system dependencies)
- Keep app size under 100MB
- App launch time under 5 seconds
- Handle videos up to 2GB without crashes

## Success Metrics
- App launches from packaged executable
- Can import at least one MP4 file
- Timeline shows imported clips
- Video plays in preview window
- Can trim clip (set start/end)
- Exports trimmed clip to MP4
- Exported MP4 plays correctly in external players
- Works on both Mac and Windows

