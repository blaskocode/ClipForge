// ClipForge - Tauri Commands
// Tauri v2.0 command handlers for video processing

use std::path::Path;
use std::fs;
use serde::{Deserialize, Serialize};

mod thumbnails;
mod export;

use thumbnails::extract_thumbnails;
use export::{export_video, export_multi_track_video};

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
            "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
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
    
    let duration = parsed["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .ok_or("Could not parse duration")?;
    
    let streams = parsed["streams"]
        .as_array()
        .ok_or("No streams found")?;
    
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
    
    Ok(VideoMetadata {
        duration,
        width,
        height,
        codec,
    })
}

pub fn get_ffmpeg_path() -> Result<std::path::PathBuf, String> {
    // Try multiple possible locations for FFmpeg
    let possible_paths = [
        // Bundled binaries (for production)
        std::path::PathBuf::from("binaries/ffmpeg-aarch64-apple-darwin"),
        std::path::PathBuf::from("binaries/ffmpeg"),
        // Development paths
        std::path::PathBuf::from("ffmpeg"),
        std::path::PathBuf::from("ffmpeg-aarch64-apple-darwin"),
        // System paths
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
        // Bundled binaries (for production)
        std::path::PathBuf::from("binaries/ffprobe-aarch64-apple-darwin"),
        std::path::PathBuf::from("binaries/ffprobe"),
        // Development paths
        std::path::PathBuf::from("ffprobe"),
        std::path::PathBuf::from("ffprobe-aarch64-apple-darwin"),
        // System paths
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
        .invoke_handler(tauri::generate_handler![
            validate_video_file,
            select_video_file,
            get_video_metadata,
            select_export_path,
            export_video,
            export_multi_track_video,
            extract_thumbnails,
            save_project,
            load_project
            // Commands will be added in future PRs:
            // - check_codec_compatibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}