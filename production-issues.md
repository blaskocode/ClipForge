This is a complex issue with multiple layers. Let me break down what's happening and provide comprehensive solutions.

## Problem Analysis

### Issue 1: Videos work in dev but not in production
**Root Cause:** File path and permission differences between dev and production environments.

### Issue 2: Different video lengths
**Root Cause:** Screen recording and webcam recording start at slightly different times and aren't synchronized.

### Issue 3: Permission handling
**Root Cause:** macOS requires explicit entitlements for camera, microphone, and screen recording in production builds.

Let me search for Tauri best practices for this:Let me search for more information about file path issues and synchronization:Based on my research, here's a comprehensive solution to your issues:

## Complete Solution for Your Recording Issues

### Problem 1: Videos Not Playing in Production (But Play in Finder)

**Root Cause:** Missing asset protocol permissions and CSP (Content Security Policy) configuration in production builds.

**Solution:**

1. **Update `src-tauri/tauri.conf.json`:**

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; media-src 'self' asset: https://asset.localhost; connect-src ipc: http://ipc.localhost",
      "assetProtocol": {
        "enable": true,
        "scope": ["**"]
      }
    }
  },
  "bundle": {
    "resources": []
  }
}
```

2. **Add File System Scope Dynamically in Rust:**

In `src-tauri/src/main.rs` or wherever you initialize your Tauri app:

```rust
use tauri::Manager;
use std::path::PathBuf;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Allow access to user's home directory and common recording locations
            let home_dir = dirs::home_dir().expect("Failed to get home directory");
            
            // Allow the entire home directory (or be more specific)
            app.asset_protocol_scope()
                .allow_directory(&home_dir, true)?;
            
            app.fs_scope()
                .allow_directory(&home_dir, true)?;
            
            // If you're saving recordings to a specific app directory
            let app_data_dir = app.path().app_data_dir()?;
            app.asset_protocol_scope()
                .allow_directory(&app_data_dir, true)?;
            
            app.fs_scope()
                .allow_directory(&app_data_dir, true)?;
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Add `dirs` to your `Cargo.toml`:
```toml
[dependencies]
dirs = "5.0"
```

3. **Use `convertFileSrc()` Correctly in React:**

```javascript
import { convertFileSrc } from '@tauri-apps/api/core';  // Note: 'core' not 'tauri' for Tauri v2

function VideoPlayer({ videoPath }) {
  const [videoUrl, setVideoUrl] = useState('');
  
  useEffect(() => {
    if (videoPath) {
      // Convert the file system path to an asset URL
      const assetUrl = convertFileSrc(videoPath);
      console.log('Original path:', videoPath);
      console.log('Asset URL:', assetUrl);
      setVideoUrl(assetUrl);
    }
  }, [videoPath]);
  
  return (
    <video 
      src={videoUrl}
      controls
      onError={(e) => {
        console.error('Video error:', e);
        console.error('Failed to load:', videoUrl);
      }}
    />
  );
}
```

### Problem 2: macOS Permissions Not Working in Production

**Root Cause:** macOS requires explicit permission descriptions in Info.plist for camera, microphone, and screen recording in signed/notarized apps.

**Solution:**

1. **Create or Update `src-tauri/Info.plist`:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSCameraUsageDescription</key>
    <string>ClipForge needs access to your camera to record webcam videos for your video projects.</string>
    
    <key>NSMicrophoneUsageDescription</key>
    <string>ClipForge needs access to your microphone to record audio for your video projects.</string>
    
    <key>NSScreenCaptureUsageDescription</key>
    <string>ClipForge needs access to record your screen for creating video tutorials and presentations.</string>
    
    <!-- This is crucial for screen recording on macOS 10.15+ -->
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

2. **Configure `tauri.conf.json` to use Info.plist:**

```json
{
  "bundle": {
    "macOS": {
      "minimumSystemVersion": "10.15",
      "entitlements": "Info.plist"
    }
  }
}
```

3. **Install and Configure `tauri-plugin-macos-permissions`:**

```bash
cargo add tauri-plugin-macos-permissions
npm install tauri-plugin-macos-permissions-api
```

In `src-tauri/src/main.rs`:
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_macos_permissions::init())
        .setup(|app| {
            // ... your existing setup
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

In your React code, check permissions BEFORE requesting media:
```javascript
import { 
  checkCameraPermission, 
  checkMicrophonePermission,
  checkScreenRecordingPermission 
} from 'tauri-plugin-macos-permissions-api';

async function checkPermissionsBeforeRecording() {
  try {
    const cameraAllowed = await checkCameraPermission();
    const micAllowed = await checkMicrophonePermission();
    const screenAllowed = await checkScreenRecordingPermission();
    
    console.log('Camera:', cameraAllowed);
    console.log('Mic:', micAllowed);
    console.log('Screen:', screenAllowed);
    
    if (!cameraAllowed || !micAllowed || !screenAllowed) {
      alert('Please grant permissions in System Settings > Privacy & Security');
    }
  } catch (error) {
    console.error('Permission check failed:', error);
  }
}
```

### Problem 3: Screen Recording and Webcam Have Different Lengths

**Root Cause:** They start at slightly different times and aren't synchronized.

**Solution - Synchronized Recording:**

Create a new Tauri command that handles synchronization:

```rust
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{sleep, Duration};

struct RecordingSession {
    start_time: u128,
    screen_process: Option<std::process::Child>,
    webcam_ready: Arc<Mutex<bool>>,
}

#[tauri::command]
async fn start_synchronized_recording(
    app_handle: tauri::AppHandle,
    screen_source: String,
    audio_source: String,
) -> Result<String, String> {
    // Generate synchronized timestamp
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    
    let screen_output = format!("/path/to/recordings/screen-{}.mp4", timestamp);
    let webcam_output = format!("/path/to/recordings/webcam-{}.webm", timestamp);
    
    // Signal to frontend that it should start webcam recording
    app_handle.emit_all("start-webcam-now", timestamp).ok();
    
    // Small delay to ensure webcam starts
    sleep(Duration::from_millis(100)).await;
    
    // Start screen recording
    let ffmpeg_path = /* get ffmpeg path */;
    let screen_process = std::process::Command::new(ffmpeg_path)
        .args([
            "-f", "avfoundation",
            "-i", &format!("{}:{}", screen_source, audio_source),
            "-r", "30",
            "-pix_fmt", "yuv420p",
            &screen_output
        ])
        .spawn()
        .map_err(|e| format!("Failed to start screen recording: {}", e))?;
    
    // Store process for stopping later
    // ... (you'll need to manage this globally)
    
    Ok(format!("{{\"screen\":\"{}\",\"webcam\":\"{}\",\"timestamp\":{}}}", 
        screen_output, webcam_output, timestamp))
}

#[tauri::command]
async fn stop_synchronized_recording(
    app_handle: tauri::AppHandle,
) -> Result<(String, String), String> {
    // Emit stop signal to frontend (webcam)
    app_handle.emit_all("stop-webcam-now", ()).ok();
    
    // Stop screen recording
    // ... kill the FFmpeg process
    
    // Wait a moment for webcam to finish
    sleep(Duration::from_millis(200)).await;
    
    Ok(("screen_path".to_string(), "webcam_path".to_string()))
}
```

In React:
```javascript
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

function SimultaneousRecording() {
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [webcamStream, setWebcamStream] = useState(null);
  
  useEffect(() => {
    // Listen for synchronized start signal
    const unlistenStart = listen('start-webcam-now', async (event) => {
      const timestamp = event.payload;
      
      try {
        // Get webcam stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1920, height: 1080 },
          audio: true
        });
        
        setWebcamStream(stream);
        
        // Start recording immediately
        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000
        });
        
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Save via Tauri
          await invoke('save_webcam_recording', {
            data: Array.from(uint8Array),
            filename: `webcam-${timestamp}.webm`
          });
        };
        
        recorder.start();
        setMediaRecorder(recorder);
      } catch (error) {
        console.error('Webcam start failed:', error);
      }
    });
    
    // Listen for synchronized stop signal
    const unlistenStop = listen('stop-webcam-now', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    });
    
    return () => {
      unlistenStart.then(fn => fn());
      unlistenStop.then(fn => fn());
    };
  }, [mediaRecorder, webcamStream]);
  
  const handleStartRecording = async () => {
    await invoke('start_synchronized_recording', {
      screenSource: '1',  // Display 1
      audioSource: '1'    // Audio device 1
    });
  };
  
  const handleStopRecording = async () => {
    const { screen, webcam } = await invoke('stop_synchronized_recording');
    // Both recordings are now stopped and saved
    console.log('Screen:', screen, 'Webcam:', webcam);
  };
  
  return (
    <div>
      <button onClick={handleStartRecording}>Start Recording</button>
      <button onClick={handleStopRecording}>Stop Recording</button>
    </div>
  );
}
```

### Additional Best Practices

1. **Save recordings to a consistent location:**
```rust
use tauri::api::path::app_data_dir;

let app_data = app_data_dir(&app.config()).unwrap();
let recordings_dir = app_data.join("recordings");
std::fs::create_dir_all(&recordings_dir).ok();
```

2. **Test permissions before building:**
```bash
# Reset all permissions for testing
tccutil reset Camera com.yourapp.identifier
tccutil reset Microphone com.yourapp.identifier
tccutil reset ScreenCapture com.yourapp.identifier
```

3. **Debug production builds:**
```bash
# Build and run without signing to test permission flow
cargo tauri build --debug
```

### Summary of Changes Needed

1. ✅ Add `assetProtocol` and proper CSP to `tauri.conf.json`
2. ✅ Create `Info.plist` with all permission descriptions
3. ✅ Add dynamic scope allowances in Rust setup
4. ✅ Use `convertFileSrc()` correctly with `@tauri-apps/api/core`
5. ✅ Install `tauri-plugin-macos-permissions` for permission checking
6. ✅ Implement synchronized recording with timestamps
7. ✅ Use Tauri events for webcam start/stop coordination

These changes should fix both the playback issue in production and synchronize your recordings. The key is that Tauri v2 requires explicit asset protocol permissions, and macOS requires Info.plist entries for all media access in signed apps.