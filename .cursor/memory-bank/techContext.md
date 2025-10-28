# ClipForge - Technical Context

## Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 6.0.3
- **UI Framework**: Plain CSS (no framework dependencies for speed)
- **State Management**: React hooks (useState, useContext)
- **Tauri API**: @tauri-apps/api v2

### Backend
- **Framework**: Tauri 2.0 ⚠️ **IMPORTANT: We are using Tauri v2, NOT v1**
- **Language**: Rust (latest stable)
- **Video Processing**: FFmpeg/FFprobe (bundled binaries)
- **IPC**: Tauri invoke/listen system
- **File Dialogs**: Built-in Tauri dialogs

### Critical Tauri v2 Changes
- **Imports**: Use `@tauri-apps/api/core` NOT `@tauri-apps/api/tauri`
  - `convertFileSrc` is in `@tauri-apps/api/core`
  - `invoke` is in `@tauri-apps/api/core`
- **File Drop**: No `fileDropEnabled` in config (handled via events)
- **Dialog Plugin**: Use `tauri-plugin-dialog` with `DialogExt` trait
- **Path Resolution**: Use `app_handle.path_resolver()` for resources

### Build & Package
- **Package Manager**: npm
- **Build Tool**: cargo tauri build
- **Output Formats**: .dmg (Mac), .exe/.msi (Windows)
- **CI/CD**: GitHub Actions (for cross-platform builds)

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
│   ├── components/         # React components (VideoPlayer, Timeline, etc.)
│   ├── utils/              # Helper functions
│   ├── App.tsx            # Root component
│   ├── App.css            # Styles
│   └── main.tsx           # Entry point
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Tauri commands
│   │   └── main.rs        # Entry point
│   ├── binaries/          # FFmpeg binaries (ffmpeg, ffprobe)
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
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

[dev-dependencies]
tokio-test = "0.4"
```

## Technical Constraints

### Performance
- **Launch Time**: Under 5 seconds
- **Bundle Size**: Under 100MB (with FFmpeg)
- **Memory**: Handle 2GB+ video files without crashes
- **Timeline**: Support 50+ clips without lag

### Platform Support
- **macOS**: 10.15+ (Catalina and later)
- **Windows**: 10+
- **Linux**: Not required for MVP

### File Format Support
- **Input**: MP4, MOV, WebM
- **Output**: MP4 only
- **Codecs**: H.264, HEVC (with compatibility warnings)

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

### Bundling Configuration
**Note**: In Tauri v2.0, FFmpeg bundling doesn't use `externalBin` in the same way. The binaries are resolved at runtime via `app_handle.path_resolver()`.

### Accessing Bundled Binaries
```rust
let ffmpeg_path = app_handle
    .path_resolver()
    .resolve_resource("binaries/ffmpeg")
    .expect("failed to resolve ffmpeg");
```

## Development Workflow

### Local Development
1. Make changes to React code → Vite hot reloads
2. Make changes to Rust code → Restart `cargo tauri dev`
3. Test with `npm run tauri dev`

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
**Solution**: Check codecs before export, warn user to proceed or re-encode

### Challenge 6: Tauri v2 Configuration Changes
**Problem**: `fileDropEnabled` property in window config causes validation error
**Solution**: Remove from config - file drop works differently in Tauri v2 (via events)

### Challenge 7: Cargo Not in PATH
**Problem**: Running `cargo test` fails with "command not found"
**Solution**: Add `$HOME/.cargo/bin` to PATH: `export PATH="$HOME/.cargo/bin:$PATH"`

## Development Tools
- **IDE**: VS Code with Rust extension
- **Version Control**: Git
- **Package Registry**: npm for frontend, crates.io for Rust
- **Testing**: Rust unit tests with tokio-test, manual UI testing

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

