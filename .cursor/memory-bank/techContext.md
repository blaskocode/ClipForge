# ClipForge - Technical Context

## Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 6.0.3
- **UI Framework**: Plain CSS (no framework dependencies for speed)
- **State Management**: React hooks + custom useHistory hook
- **Tauri API**: @tauri-apps/api v2
- **Toast System**: Custom toast notification system
- **Keyboard Shortcuts**: Global event listeners with professional shortcuts

### Backend
- **Framework**: Tauri 2.0 ⚠️ **IMPORTANT: We are using Tauri v2, NOT v1**
- **Language**: Rust (latest stable)
- **Video Processing**: FFmpeg/FFprobe (bundled binaries)
- **IPC**: Tauri invoke/listen system
- **File Dialogs**: Built-in Tauri dialogs
- **Project Files**: JSON-based project save/load
- **Thumbnail Generation**: FFmpeg-based thumbnail extraction

### Critical Tauri v2 Changes
- **Imports**: Use `@tauri-apps/api/core` NOT `@tauri-apps/api/tauri`
  - `convertFileSrc` is in `@tauri-apps/api/core`
  - `invoke` is in `@tauri-apps/api/core`
- **File Drop**: No `fileDropEnabled` in config (handled via events)
- **Dialog Plugin**: Use `tauri-plugin-dialog` with `DialogExt` trait
- **Path Resolution**: Use `app_handle.path_resolver()` for resources
- **Opener Plugin**: Use `@tauri-apps/plugin-opener` for opening files/folders

### Build & Package
- **Package Manager**: npm
- **Build Tool**: cargo tauri build
- **Output Formats**: .dmg (Mac), .exe/.msi (Windows)
- **CI/CD**: GitHub Actions (for cross-platform builds)
- **Code Quality**: 500-line file limit enforcement

## Development Setup

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Install Node.js (18+)
brew install nodejs  # On Mac
# Or download from nodejs.org
```

### Project Structure
```
ClipForge/                  # Project root (current directory)
├── src/                    # React frontend
│   ├── components/         # React components (all <500 lines)
│   │   ├── VideoPlayer.tsx
│   │   ├── Timeline.tsx
│   │   ├── TrimControls.tsx
│   │   ├── ExportButton.tsx
│   │   ├── ImportButton.tsx
│   │   ├── AudioControls.tsx
│   │   ├── ZoomControls.tsx
│   │   ├── ClipThumbnails.tsx
│   │   ├── UndoRedoButtons.tsx
│   │   ├── ProjectMenu.tsx
│   │   ├── KeyboardShortcutsHelp.tsx
│   │   ├── Toast.tsx
│   │   └── ToastContainer.tsx
│   ├── hooks/              # Custom hooks
│   │   ├── useHistory.ts
│   │   ├── usePlaybackLoop.ts
│   │   └── useExport.ts
│   ├── utils/              # Utility functions
│   │   ├── keyboardHandler.ts
│   │   ├── dragDrop.ts
│   │   ├── videoProcessing.ts
│   │   ├── projectManagement.ts
│   │   ├── zoomControls.ts
│   │   ├── audioControls.ts
│   │   └── toastHelpers.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/             # Modular CSS files
│   │   ├── header-modals.css
│   │   ├── controls.css
│   │   ├── video-player.css
│   │   ├── timeline.css
│   │   ├── trim.css
│   │   └── export.css
│   ├── App.tsx            # Root component (428 lines)
│   ├── App.css            # Main CSS (57 lines)
│   └── main.tsx           # Entry point
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # All Tauri commands (458 lines)
│   │   └── main.rs        # Entry point
│   ├── binaries/          # FFmpeg binaries (ffmpeg, ffprobe)
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── .cursor/               # Cursor rules and memory bank
│   ├── memory-bank/       # Project documentation
│   └── rules/             # Code quality rules
├── clipforge_prd.md        # Product Requirements Document
├── clipforge-arch.md      # Architecture documentation
├── clipforge-tasklist.md   # PR task breakdown
├── package.json            # Node dependencies
└── tsconfig.json           # TypeScript config
```

### Development Commands
```bash
# Start dev server
npm run dev

# Start Tauri dev mode
npm run tauri dev

# Build for production
npm run tauri build

# Package app
cargo tauri build

# Check Rust compilation
cd src-tauri && cargo check

# Run Rust tests
cd src-tauri && cargo test
```

## Dependencies

### NPM Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@tauri-apps/api": "^2",
  "@tauri-apps/plugin-opener": "^2"
}
```

### Cargo Dependencies
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
chrono = "0.4"
md5 = "0.7"
base64 = "0.21"
dirs = "5"

[dev-dependencies]
tokio-test = "0.4"
```

## Technical Constraints

### Performance
- **Launch Time**: Under 5 seconds
- **Bundle Size**: Under 100MB (with FFmpeg)
- **Memory**: Handle 2GB+ video files without crashes
- **Timeline**: Support 50+ clips without lag
- **File Length**: All source files under 500 lines (enforced rule)

### Platform Support
- **macOS**: 10.15+ (Catalina and later) - Primary target
- **Windows**: 10+ (skipped for MVP per user request)
- **Linux**: Not required for MVP

### File Format Support
- **Input**: MP4, MOV, WebM, AVI, MKV
- **Output**: MP4 only with H.264 codec
- **Codecs**: H.264, HEVC (with compatibility warnings)
- **Audio**: AAC audio codec support

## FFmpeg Integration

### Binary Sources
- **macOS**: https://evermeet.cx/ffmpeg/
- **Windows**: https://www.gyan.dev/ffmpeg/builds/

### Platform-Specific Binary Names
Tauri requires platform-specific binary names when bundling:
- **macOS ARM**: `ffmpeg-aarch64-apple-darwin`, `ffprobe-aarch64-apple-darwin`
- **macOS Intel**: `ffmpeg-x86_64-apple-darwin`, `ffprobe-x86_64-apple-darwin`
- **Windows**: `ffmpeg-x86_64-pc-windows-msvc.exe`, `ffprobe-x86_64-pc-windows-msvc.exe`

**Solution**: Create symlinks from platform-specific names to actual binaries:
```bash
cd src-tauri/binaries
ln -sf ffmpeg ffmpeg-aarch64-apple-darwin
ln -sf ffprobe ffprobe-aarch64-apple-darwin
```

### Professional Export Commands

**Single-Pass Multi-Clip Export:**
```bash
ffmpeg -ss 5 -i clip1.mp4 -ss 10 -i clip2.mp4 \
  -filter_complex "[0:v]trim=end=3,setpts=PTS-STARTPTS[v0s];[v0s]scale=1280:720[v0];[1:v]trim=end=5,setpts=PTS-STARTPTS[v1s];[v1s]scale=1280:720[v1];[v0][v1]concat=n=2:v=1:a=0[outv]" \
  -map "[outv]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -y output.mp4
```

**Thumbnail Extraction:**
```bash
ffmpeg -i input.mp4 -ss 1.5 -vframes 1 -q:v 2 -y thumbnail.jpg
```

**Metadata Extraction:**
```bash
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of json input.mp4
```

### Bundling Configuration
**Note**: In Tauri v2.0, FFmpeg bundling doesn't use `externalBin` in the same way. The binaries are resolved at runtime via multiple fallback paths.

### Accessing Bundled Binaries
```rust
let possible_paths = [
    std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
        .parent().unwrap().join("ffmpeg"),
    std::path::PathBuf::from("./ffmpeg"),
    std::path::PathBuf::from("/Users/courtneyblaskovich/Documents/Projects/ClipForge/ffmpeg"),
    std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("binaries").join("ffmpeg"),
];

let ffmpeg_path = possible_paths.iter()
    .find(|path| path.exists())
    .ok_or_else(|| "FFmpeg binary not found".to_string())?;
```

## Development Workflow

### Local Development
1. Make changes to React code → Vite hot reloads
2. Make changes to Rust code → Restart `cargo tauri dev`
3. Test with `npm run tauri dev`
4. Check file lengths with `wc -l src/**/*.tsx src/**/*.ts src-tauri/src/*.rs`

### Building for Distribution
1. Run `cargo tauri build` (production build)
2. Outputs in `src-tauri/target/release/bundle/`
3. For Mac: `.dmg` file
4. For Windows: `.exe` and `.msi` files

### Testing Workflow
1. Test in dev mode first (`npm run tauri dev`)
2. Build production package (`cargo tauri build`)
3. Test packaged app by launching from bundle
4. Test exported videos in VLC/QuickTime
5. Test all keyboard shortcuts
6. Test undo/redo functionality
7. Test project save/load
8. Test audio controls
9. Test timeline zoom
10. Test thumbnail generation

## Known Technical Challenges

### Challenge 1: FFmpeg Binary Management
**Problem**: FFmpeg not found in production build - Tauri expects platform-specific binary names
**Solution**: Create symlinks with platform-specific names (e.g., `ffmpeg-aarch64-apple-darwin` → `ffmpeg`)

### Challenge 2: File Path Handling
**Problem**: Can't load video from file system path
**Solution**: Use `convertFileSrc()` to convert paths to URLs

### Challenge 3: Cross-Platform Paths
**Problem**: Windows uses backslashes, Mac uses forward slashes
**Solution**: Use Rust's `PathBuf` for all path operations

### Challenge 4: Large File Handling
**Problem**: 4K videos (2GB+) cause crashes
**Solution**: Use `-c copy` (no memory loading), warn at 2GB

### Challenge 5: Codec Compatibility
**Problem**: Mixing H.264 and HEVC causes export to fail
**Solution**: Resolution normalization to 1280x720 H.264 for all exports

### Challenge 6: Tauri v2 Configuration Changes
**Problem**: `fileDropEnabled` property in window config causes validation error
**Solution**: Remove from config - file drop works differently in Tauri v2 (via events)

### Challenge 7: Cargo Not in PATH
**Problem**: Running `cargo test` fails with "command not found"
**Solution**: Add `$HOME/.cargo/bin` to PATH: `export PATH="$HOME/.cargo/bin:$PATH"`

### Challenge 8: In/Out Point Timing During Playback
**Problem**: Trim points set at wrong position during playback due to stale state
**Solution**: Use `useRef` for synchronous access to current playhead position

### Challenge 9: File Length Compliance
**Problem**: Source files exceeding 500-line limit
**Solution**: Refactor by extracting utilities, hooks, and components into separate files

### Challenge 10: TypeScript Compilation Errors
**Problem**: Interface mismatches and function signature errors
**Solution**: Update all component interfaces and fix function signatures

## Development Tools
- **IDE**: VS Code with Rust extension
- **Version Control**: Git
- **Package Registry**: npm for frontend, crates.io for Rust
- **Testing**: Rust unit tests with tokio-test, manual UI testing
- **Code Quality**: 500-line file limit enforcement
- **Documentation**: Comprehensive memory bank system

## Build Configuration

### tauri.conf.json
- Window size: 1280x720 (default), minimum 800x600
- Title: "clipforge"
- Identifier: "blasko-clip-forge"
- Icons: Multiple sizes for all platforms
- **Important**: Do NOT include `fileDropEnabled` property (causes validation error in Tauri v2)

### package.json Scripts
- `npm run dev`: Starts Vite dev server
- `npm run build`: Builds production React bundle
- `npm run tauri`: Runs Tauri CLI commands
- `npm run tauri dev`: Starts Tauri in development mode
- `npm run tauri build`: Builds production app

## Security Considerations
- File access restricted to native dialogs (no arbitrary path access)
- FFmpeg runs in separate process (sandboxed)
- All Tauri commands require explicit whitelisting
- No network access required (fully offline)
- No telemetry or data collection (privacy-first)
- Project files stored locally as JSON (no cloud sync)

## Code Quality Standards

### 500-Line Rule Enforcement
- **App.tsx**: Refactored from 881 to 428 lines
- **App.css**: Refactored from 1133 to 57 lines (split into modules)
- **lib.rs**: Maintained at 458 lines
- **All Components**: Under 500 lines each
- **All Utilities**: Under 500 lines each

### Modular Architecture
- **Utilities**: Extracted keyboard handling, drag/drop, video processing, project management
- **Hooks**: Custom useHistory, usePlaybackLoop, useExport
- **Components**: Separated concerns into focused components
- **Styles**: Modular CSS files for different UI sections

### Type Safety
- **Comprehensive Interfaces**: All components have proper TypeScript interfaces
- **Error Handling**: User-friendly error messages throughout
- **Function Signatures**: Proper parameter types and return types

This technical context supports all implemented features while maintaining high code quality standards and professional development practices.