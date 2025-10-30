// ClipForge - Tauri Commands
// Tauri v2.0 command handlers for video processing

use std::path::Path;
use std::fs;
use serde::{Deserialize, Serialize};

mod thumbnails;
mod export;
mod filler_detection;

use thumbnails::extract_thumbnails;
use export::{export_video, export_multi_track_video};
use filler_detection::detect_filler_words;

#[tauri::command]
async fn restart_app(_app: tauri::AppHandle) -> Result<(), String> {
    // Note: Tauri v2 doesn't have a built-in restart method
    // The frontend will show a message prompting the user to manually restart
    // or we could use std::process::Command to execute a restart script, but that's complex
    // For now, we'll just return success and let the frontend handle the restart prompt
    Ok(())
}

#[tauri::command]
async fn validate_video_file(file_path: String) -> Result<String, String> {
    validate_video_file_internal(file_path).await
}

pub async fn validate_video_file_internal(file_path: String) -> Result<String, String> {
    // Check file exists
    if !Path::new(&file_path).exists() {
        return Err("File not found. It may have been moved or deleted.".to_string());
    }
    
    // Check file size
    let metadata = match fs::metadata(&file_path) {
        Ok(md) => md,
        Err(e) => return Err(format!("Cannot read file: {}", e)),
    };
    
    let size_mb = metadata.len() / (1024 * 1024);
    
    // Warn at 2GB, error at 5GB
    if size_mb > 5120 {
        return Err(format!(
            "File is too large ({} MB). Maximum file size is 5GB.",
            size_mb
        ));
    }
    
    if size_mb > 2048 {
        // Warning case - return Ok but with warning message
        return Ok(format!(
            "WARNING: File is very large ({} MB). This may cause performance issues. Continue anyway?",
            size_mb
        ));
    }
    
    // Check extension
    let extension = Path::new(&file_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let supported_extensions = ["mp4", "mov", "webm", "avi", "mkv", "m4v", "3gp", "flv", "wmv"];
    
    if !supported_extensions.contains(&extension.as_str()) {
        return Err(format!(
            "Unsupported format: .{}. Supported formats: MP4, MOV, WebM, AVI, MKV, M4V, 3GP, FLV, WMV",
            extension
        ));
    }
    
    Ok("File is valid".to_string())
}

#[tauri::command]
async fn select_video_file(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    
    let (tx, rx) = oneshot::channel();
    
    let dialog = app.dialog();
    let file_dialog = dialog.file()
        .add_filter("Video Files", &["mp4", "mov", "webm", "avi", "mkv", "m4v", "3gp", "flv", "wmv"]);
    
    file_dialog.pick_file(move |file_path| {
        let _ = tx.send(file_path);
    });
    
    // Wait for the result asynchronously
    match rx.await {
        Ok(Some(path)) => Ok(path.to_string()),
        Ok(None) => Err("No file selected".to_string()),
        Err(_) => Err("Dialog error".to_string()),
    }
}

#[tauri::command]
async fn select_export_path(app: tauri::AppHandle, default_filename: String) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    
    let (tx, rx) = oneshot::channel();
    
    let dialog = app.dialog();
    let file_dialog = dialog.file()
        .add_filter("MP4 Video", &["mp4"])
        .set_file_name(&default_filename);
    
    file_dialog.save_file(move |file_path| {
        let _ = tx.send(file_path);
    });
    
    // Wait for the result asynchronously
    match rx.await {
        Ok(Some(path)) => Ok(path.to_string()),
        Ok(None) => Err("No file selected".to_string()),
        Err(_) => Err("Dialog error".to_string()),
    }
}

#[tauri::command]
async fn save_project(app: tauri::AppHandle, clips: Vec<serde_json::Value>, timeline_state: serde_json::Value) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    
    let (tx, rx) = oneshot::channel();
    
    let dialog = app.dialog();
    let file_dialog = dialog.file()
        .add_filter("ClipForge Project", &["clipforge"])
        .set_file_name("project.clipforge");
    
    file_dialog.save_file(move |file_path| {
        let _ = tx.send(file_path);
    });
    
    // Wait for the result asynchronously
    match rx.await {
        Ok(Some(path)) => {
            // Create project data structure
            let project_data = serde_json::json!({
                "clips": clips,
                "timeline_state": timeline_state
            });
            
            // Write project data to file
            match std::fs::write(&path.to_string(), serde_json::to_string_pretty(&project_data).unwrap()) {
                Ok(_) => Ok(path.to_string()),
                Err(e) => Err(format!("Failed to save project: {}", e)),
            }
        },
        Ok(None) => Err("No file selected".to_string()),
        Err(_) => Err("Dialog error".to_string()),
    }
}

#[tauri::command]
async fn save_recording(filename: String, data: Vec<u8>) -> Result<String, String> {
    // Save to user's Videos folder in a "ClipForge Recordings" subfolder
    let videos_dir = dirs::video_dir()
        .ok_or_else(|| "Could not find videos directory".to_string())?;
    
    let recordings_dir = videos_dir.join("ClipForge Recordings");
    std::fs::create_dir_all(&recordings_dir)
        .map_err(|e| format!("Failed to create recordings directory: {}", e))?;
    
    let file_path = recordings_dir.join(&filename);
    
    std::fs::write(&file_path, data)
        .map_err(|e| format!("Failed to write recording: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn load_project(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    
    let (tx, rx) = oneshot::channel();
    
    let dialog = app.dialog();
    let file_dialog = dialog.file()
        .add_filter("ClipForge Project", &["clipforge"]);
    
    file_dialog.pick_file(move |file_path| {
        let _ = tx.send(file_path);
    });
    
    // Wait for the result asynchronously
    match rx.await {
        Ok(Some(path)) => {
            // Read project data from file
            match std::fs::read_to_string(&path.to_string()) {
                Ok(content) => {
                    match serde_json::from_str::<serde_json::Value>(&content) {
                        Ok(project_data) => Ok(project_data),
                        Err(e) => Err(format!("Failed to parse project file: {}", e)),
                    }
                },
                Err(e) => Err(format!("Failed to read project file: {}", e)),
            }
        },
        Ok(None) => Err("No file selected".to_string()),
        Err(_) => Err("Dialog error".to_string()),
    }
}

#[derive(Deserialize, Serialize)]
pub struct VideoMetadata {
    pub duration: f64,
    pub width: i32,
    pub height: i32,
    pub codec: String,
    pub file_size: u64, // File size in bytes
}

#[tauri::command]
async fn get_video_metadata(app: tauri::AppHandle, file_path: String) -> Result<VideoMetadata, String> {
    get_video_metadata_internal(app, file_path).await
}

pub async fn get_video_metadata_internal(_app: tauri::AppHandle, file_path: String) -> Result<VideoMetadata, String> {
    // Validate file first
    validate_video_file_internal(file_path.clone()).await?;
    
    let ffprobe_path = get_ffprobe_path()?;
    
    let output = std::process::Command::new(&ffprobe_path)
        .args(&[
            "-v", "error",
            "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,duration",
            "-of", "json",
            &file_path
        ])
        .output()
        .map_err(|e| format!("Failed to execute FFprobe: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFprobe error: {}", stderr));
    }
    
    let json_output = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to read FFprobe output: {}", e))?;
    
    let parsed: serde_json::Value = serde_json::from_str(&json_output)
        .map_err(|e| format!("Failed to parse FFprobe output: {}", e))?;
    
    let streams = parsed["streams"]
        .as_array()
        .ok_or("No streams found")?;
    
    // Try to get duration - WebM files might have empty format object
    // Try multiple locations: format.duration, stream durations
    let duration = parsed["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .or_else(|| parsed["format"]["duration"].as_f64())
        .or_else(|| {
            // Fallback: try to get duration from video stream
            streams
                .iter()
                .find(|s| s["codec_type"] == "video")
                .and_then(|s| {
                    s["duration"]
                        .as_str()
                        .and_then(|d| d.parse::<f64>().ok())
                        .or_else(|| s["duration"].as_f64())
                })
        })
        .or_else(|| {
            // Fallback: try to get duration from any stream
            streams
                .iter()
                .find_map(|s| {
                    s["duration"]
                        .as_str()
                        .and_then(|d| d.parse::<f64>().ok())
                        .or_else(|| s["duration"].as_f64())
                })
        })
        .or_else(|| {
            // Last resort: try FFprobe with probesize/analyzeduration to force analysis
            // WebM files from MediaRecorder might need explicit probing
            std::process::Command::new(&ffprobe_path)
                .args(&[
                    "-v", "error",
                    "-probesize", "100000000",  // 100MB probe size
                    "-analyzeduration", "100000000",  // 100MB analysis
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    &file_path
                ])
                .output()
                .ok()
                .and_then(|o| {
                    let output = String::from_utf8(o.stdout).ok()?;
                    output.trim().parse::<f64>().ok()
                })
        })
        .or_else(|| {
            // Fallback: use FFmpeg to estimate duration from file analysis
            // This reads more of the file to calculate duration
            eprintln!("Attempting FFmpeg duration extraction for: {}", file_path);
            let ffmpeg_path = match get_ffmpeg_path() {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("Failed to get FFmpeg path: {}", e);
                    return None;
                }
            };
            
            // Use FFmpeg with -i to get file info without processing
            let output = match std::process::Command::new(&ffmpeg_path)
                .args(&[
                    "-i", &file_path,
                    "-f", "null",
                    "-"
                ])
                .stderr(std::process::Stdio::piped())
                .stdout(std::process::Stdio::null())
                .output()
            {
                Ok(o) => o,
                Err(e) => {
                    eprintln!("FFmpeg command failed: {}", e);
                    return None;
                }
            };
            
            let stderr = match String::from_utf8(output.stderr) {
                Ok(s) => {
                    eprintln!("FFmpeg stderr (first 1000 chars): {}", 
                        if s.len() > 1000 { &s[..1000] } else { &s });
                    s
                },
                Err(e) => {
                    eprintln!("Failed to parse FFmpeg stderr: {}", e);
                    return None;
                }
            };
            
            // FFmpeg outputs duration like "Duration: 00:01:23.45, start: ..."
            for line in stderr.lines() {
                eprintln!("Checking line: {}", line);
                if line.contains("Duration:") || line.contains("duration") {
                    eprintln!("Found Duration line: {}", line);
                    // Extract duration: "Duration: 00:01:23.45"
                    let dur_line = if line.contains("Duration:") {
                        line.split("Duration:").nth(1)
                    } else {
                        line.split("duration:").nth(1)
                    };
                    
                    if let Some(dur_part) = dur_line {
                        if let Some(time_part) = dur_part.split(',').next() {
                            let time_part = time_part.trim();
                            eprintln!("Parsing time part: '{}'", time_part);
                            // Parse HH:MM:SS.mmm format
                            let parts: Vec<&str> = time_part.split(':').collect();
                            if parts.len() == 3 {
                                match (parts[0].parse::<f64>(), parts[1].parse::<f64>(), parts[2].parse::<f64>()) {
                                    (Ok(hours), Ok(minutes), Ok(seconds)) => {
                                        let total_seconds = hours * 3600.0 + minutes * 60.0 + seconds;
                                        eprintln!("Successfully extracted duration: {} seconds", total_seconds);
                                        return Some(total_seconds);
                                    },
                                    _ => {
                                        eprintln!("Failed to parse time components");
                                    }
                                }
                            }
                        }
                    }
                }
            }
            eprintln!("No Duration found in FFmpeg header output");
            
            // Since FFmpeg shows "Duration: N/A", we need to decode through the file
            // This is slow but necessary for MediaRecorder WebM files
            eprintln!("Attempting to calculate duration by decoding entire file (this may take a moment)...");
            
            // Use ffprobe to read through all packets and find the last timestamp
            let decode_output = std::process::Command::new(&ffprobe_path)
                .args(&[
                    "-v", "error",
                    "-select_streams", "v:0",
                    "-show_entries", "packet=pts_time",
                    "-of", "csv=p=0",
                    &file_path
                ])
                .output()
                .ok()
                .and_then(|o| String::from_utf8(o.stdout).ok());
            
            if let Some(csv_output) = decode_output {
                // Find the maximum PTS time (last frame timestamp)
                let max_time = csv_output
                    .lines()
                    .filter_map(|line| line.trim().parse::<f64>().ok())
                    .fold(0.0f64, f64::max);
                
                if max_time > 0.0 {
                    eprintln!("Calculated duration from packet timestamps: {} seconds", max_time);
                    return Some(max_time);
                }
            }
            
            None
        })
        .ok_or_else(|| {
            eprintln!("FFprobe JSON output for {}:\n{}", file_path, json_output);
            format!("Could not parse duration from format or streams. JSON structure: {}", json_output)
        })?;
    
    let video_stream = streams
        .iter()
        .find(|s| s["codec_type"] == "video")
        .ok_or("No video stream found")?;
    
    let width = video_stream["width"]
        .as_i64()
        .ok_or("Could not parse width")? as i32;
    
    let height = video_stream["height"]
        .as_i64()
        .ok_or("Could not parse height")? as i32;
    
    let codec = video_stream["codec_name"]
        .as_str()
        .ok_or("Could not parse codec")?
        .to_string();
    
    // Get file size from filesystem metadata
    let file_metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let file_size = file_metadata.len();
    
    Ok(VideoMetadata {
        duration,
        width,
        height,
        codec,
        file_size,
    })
}

pub fn get_ffmpeg_path() -> Result<std::path::PathBuf, String> {
    // Try multiple possible locations for FFmpeg
    let possible_paths = [
        // Bundled binaries (for production) - these will be in the app bundle
        std::path::PathBuf::from("binaries/ffmpeg-aarch64-apple-darwin"),
        std::path::PathBuf::from("binaries/ffmpeg"),
        // Development paths (relative to project root)
        std::path::PathBuf::from("ffmpeg"),
        std::path::PathBuf::from("ffmpeg-aarch64-apple-darwin"),
        // System paths (fallback)
        std::path::PathBuf::from("/opt/homebrew/bin/ffmpeg"),
        std::path::PathBuf::from("/usr/local/bin/ffmpeg"),
        std::path::PathBuf::from("/usr/bin/ffmpeg"),
    ];
    
    for path in &possible_paths {
        if path.exists() {
            return Ok(path.clone());
        }
    }
    
    Err("FFmpeg not found. Please ensure FFmpeg is installed and accessible.".to_string())
}

pub fn get_ffprobe_path() -> Result<std::path::PathBuf, String> {
    // Try multiple possible locations for FFprobe
    let possible_paths = [
        // Bundled binaries (for production) - these will be in the app bundle
        std::path::PathBuf::from("binaries/ffprobe-aarch64-apple-darwin"),
        std::path::PathBuf::from("binaries/ffprobe"),
        // Development paths (relative to project root)
        std::path::PathBuf::from("ffprobe"),
        std::path::PathBuf::from("ffprobe-aarch64-apple-darwin"),
        // System paths (fallback)
        std::path::PathBuf::from("/opt/homebrew/bin/ffprobe"),
        std::path::PathBuf::from("/usr/local/bin/ffprobe"),
        std::path::PathBuf::from("/usr/bin/ffprobe"),
    ];
    
    for path in &possible_paths {
        if path.exists() {
            return Ok(path.clone());
        }
    }
    
    Err("FFprobe not found. Please ensure FFprobe is installed and accessible.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[tokio::test]
    async fn test_validate_nonexistent_file() {
        let result = validate_video_file("/nonexistent/path/video.mp4".to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("File not found"));
    }

    #[tokio::test]
    async fn test_validate_invalid_extension() {
        // Create a temporary text file
        let test_file = "/tmp/clipforge_test.txt";
        fs::write(test_file, "test content").unwrap();
        
        let result = validate_video_file(test_file.to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unsupported format"));
        
        // Clean up
        fs::remove_file(test_file).unwrap();
    }

    #[tokio::test]
    async fn test_validate_valid_mp4_extension() {
        // Create a temporary mp4 file (empty, just for extension test)
        let test_file = "/tmp/clipforge_test.mp4";
        fs::write(test_file, b"test content").unwrap();
        
        // This will fail on actual validation but should pass extension check
        let result = validate_video_file(test_file.to_string()).await;
        // File exists and extension is valid, so should return Ok or valid error
        assert!(result.is_ok() || result.unwrap_err().contains("Cannot read file"));
        
        // Clean up
        fs::remove_file(test_file).unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .setup(|_app| {
            // Note: Asset protocol scope is configured in tauri.conf.json with "scope": ["**"]
            // which allows access to all directories. This should be sufficient for file access
            // in production builds. The dynamic scope API may not be available in Tauri v2, 
            // but the config-based approach with "scope": ["**"] works for all file access.
            
            // Ensure the recordings directory exists
            if let Some(videos_dir) = dirs::video_dir() {
                let recordings_dir = videos_dir.join("ClipForge Recordings");
                std::fs::create_dir_all(&recordings_dir).ok();
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            validate_video_file,
            select_video_file,
            get_video_metadata,
            select_export_path,
            export_video,
            export_multi_track_video,
            extract_thumbnails,
            save_project,
            load_project,
            save_recording,
            detect_filler_words,
            restart_app
            // Commands will be added in future PRs:
            // - check_codec_compatibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}