# ClipForge

A lightweight desktop video editor built with Tauri, React, and FFmpeg.

## 🎯 Project Status

**Current Phase:** PR #1 - Foundation & Setup  
**MVP Deadline:** October 28, 2025 at 10:59 PM CT  
**Final Deadline:** October 29, 2025 at 10:59 PM CT

## 📋 Features (Planned for MVP)

- ✅ Import MP4/MOV files via drag & drop or file picker
- ⬜ Visual timeline with clip arrangement
- ⬜ HTML5 video preview player
- ⬜ Trim clips with in/out points
- ⬜ Export to MP4 (single or multiple clips)
- ⬜ Native packaging for Mac and Windows

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Rust + Tauri 2.0
- **Video Processing:** FFmpeg/FFprobe (bundled)

## 🚀 Getting Started

### Prerequisites

- **Rust** (install from https://rustup.rs)
- **Node.js** 18+ (install from https://nodejs.org)
- **Tauri CLI**: `cargo install tauri-cli`

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd ClipForge
   npm install
   ```

2. **Download FFmpeg binaries:**
   
   For macOS:
   ```bash
   cd src-tauri/binaries
   curl -L -o ffmpeg https://evermeet.cx/ffmpeg/ffmpeg-7.1.zip
   curl -L -o ffprobe https://evermeet.cx/ffmpeg/ffprobe-7.1.zip
   chmod +x ffmpeg ffprobe
   ```
   
   For Windows:
   - Download from https://www.gyan.dev/ffmpeg/builds/
   - Extract `ffmpeg.exe` and `ffprobe.exe` to `src-tauri/binaries/`

3. **Run in development mode:**
   ```bash
   npm run tauri dev
   ```

### Building

```bash
npm run tauri build
```

Output will be in `src-tauri/target/release/bundle/`

## 📁 Project Structure

```
ClipForge/
├── src/                    # React frontend
│   ├── components/        # UI components (VideoPlayer, Timeline, etc.)
│   ├── utils/             # Helper functions
│   └── App.tsx            # Root component
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── lib.rs         # Tauri commands
│   └── binaries/          # FFmpeg binaries
└── README.md
```

## 🎨 Development Status

### Completed ✅
- Project foundation setup
- Basic UI layout skeleton
- Tauri configuration for file drop
- Folder structure created

### In Progress 🟨
- FFmpeg binary setup
- Component development starting

### Upcoming ⬜
- Video import functionality
- Timeline component
- Video player
- Trim functionality
- Export system

## 📚 Resources

- [Tauri Documentation](https://tauri.app)
- [Project Requirements](../clipforge_prd.md)
- [Architecture Documentation](../clipforge-arch.md)
- [Task List](../clipforge-tasklist.md)

## 🐛 Known Issues

None currently. Project just starting.

## 📝 License

This project is being built for Gauntlet AI.
