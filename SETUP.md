# ClipForge Setup Guide

## FFmpeg Binary Setup

### macOS (✅ Complete)
FFmpeg and FFprobe binaries have been downloaded and placed in `src-tauri/binaries/`.

### Windows (To be added)
Download static builds from: https://www.gyan.dev/ffmpeg/builds/
1. Download the latest "static build" release
2. Extract `ffmpeg.exe` and `ffprobe.exe`
3. Copy to `src-tauri/binaries/`

**Note:** Windows binaries should be committed to the repository for GitHub Actions builds.

### Verify Binary Resolution
To test that binaries resolve correctly:
```bash
cd ClipForge
npm run tauri dev
```

Check the console for any FFmpeg path resolution errors.

## Development Environment

### Run Dev Mode
```bash
cd ClipForge
npm run tauri dev
```

This will:
1. Start Vite dev server on http://localhost:1420
2. Build Rust backend
3. Launch Tauri window

### Build for Production
```bash
cd ClipForge
npm run tauri build
```

Output will be in `src-tauri/target/release/bundle/`

## Next Steps (PR #1 Remaining Tasks)

- [x] Remove template content
- [x] Create folder structure  
- [x] Download FFmpeg binaries (Mac done, Windows pending)
- [x] Configure tauri.conf.json
- [x] Create basic UI layout
- [ ] Test dev environment and FFmpeg resolution

## Testing Checklist

1. Start app: `npm run tauri dev` ✓ Should launch window
2. Check UI: Should see "ClipForge" header and placeholder areas
3. Test FFmpeg: Will be tested when commands are added in PR #2

