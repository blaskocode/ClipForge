// ClipForge - Tauri Commands
// Tauri v2.0 command handlers for video processing

use std::path::Path;
use std::fs;
use serde::{Deserialize, Serialize};
// Removed unused import

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
    
    if !matches!(extension.as_str(), "mp4" | "mov" | "webm") {
        return Err(format!(
            "Unsupported format: .{}. Please use MP4, MOV, or WebM.",
            extension
        ));
    }
    
    Ok("Valid".to_string())
}

#[tauri::command]
async fn select_video_file(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    // Use a channel to get the result from the callback
    let (tx, rx) = tokio::sync::oneshot::channel();
    
    app.dialog()
        .file()
        .add_filter("Video Files", &["mp4", "mov", "webm"])
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });
    
    // Wait for the result asynchronously
    match rx.await {
        Ok(Some(path)) => Ok(path.to_string()),
        Ok(None) => Err("File selection cancelled".to_string()),
        Err(_) => Err("Failed to receive file selection result".to_string()),
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
    use std::process::Command;
    
    // First validate the file
    let _validation_result = validate_video_file_internal(file_path.clone()).await?;
    
    // Try multiple possible paths for ffprobe
    let possible_paths = [
        // Path in project root
        std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
            .parent()
            .unwrap()
            .join("ffprobe"),
        // Current directory
        std::path::PathBuf::from("./ffprobe"),
        // Absolute path
        std::path::PathBuf::from("/Users/courtneyblaskovich/Documents/Projects/ClipForge/ffprobe"),
        // Binaries directory
        std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
            .join("binaries")
            .join("ffprobe"),
    ];
    
    // Find the first path that exists
    let ffprobe_path = possible_paths.iter()
        .find(|path| {
            println!("Checking FFprobe at: {:?}", path);
            path.exists()
        })
        .ok_or_else(|| {
            println!("FFprobe not found in any of the expected locations");
            "FFprobe binary not found. Please ensure ffprobe is in the project root.".to_string()
        })?;
    
    println!("Using FFprobe at: {:?}", ffprobe_path);
    
    // Build FFprobe command
    let output = Command::new(&ffprobe_path)
        .args(&[
            "-v", "error",
            "-show_entries", "format=duration:stream=width,height,codec_name",
            "-of", "json",
            &file_path
        ])
        .output()
        .map_err(|e| format!("Failed to execute FFprobe: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        // Parse FFprobe error to provide user-friendly message
        if stderr.contains("moov atom not found") || stderr.contains("Invalid data found") {
            return Err("This file is not a valid video file or is corrupted.".to_string());
        } else if stderr.contains("No such file or directory") {
            return Err("File not found. It may have been moved or deleted.".to_string());
        } else if stderr.contains("Permission denied") {
            return Err("Permission denied. Unable to access this file.".to_string());
        } else if stderr.contains("Unsupported") || stderr.contains("not supported") {
            return Err("This video format is not supported.".to_string());
        } else {
            // Generic fallback for unknown errors
            return Err("Unable to process this video file. It may be corrupted or in an unsupported format.".to_string());
        }
    }
    
    // Parse JSON output
    let output_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&output_str)
        .map_err(|e| format!("Failed to parse FFprobe output: {}", e))?;
    
    // Extract metadata with better error handling
    println!("FFprobe JSON output: {}", output_str);
    
    let format = json.get("format").ok_or("No format section in FFprobe output")?;
    
    // Get duration from format section
    let duration = format.get("duration")
        .and_then(|d| d.as_str())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0); // Default to 0 if missing
    
    // Get streams array, may be empty
    // Create a longer-lived empty Vec to avoid temporary value issue
    let empty_streams = Vec::new();
    let streams = json.get("streams")
        .and_then(|s| s.as_array())
        .unwrap_or(&empty_streams);
    
    // Try to find video stream
    let video_stream = streams.iter()
        .find(|s| s.get("codec_type").and_then(|t| t.as_str()) == Some("video"))
        .or_else(|| streams.first()); // Fallback to first stream if no explicit video stream
    
    // Default values for missing fields
    let width = video_stream
        .and_then(|s| s.get("width"))
        .and_then(|w| w.as_i64())
        .map(|w| w as i32)
        .unwrap_or(640); // Default width
    
    let height = video_stream
        .and_then(|s| s.get("height"))
        .and_then(|h| h.as_i64())
        .map(|h| h as i32)
        .unwrap_or(480); // Default height
    
    let codec = video_stream
        .and_then(|s| s.get("codec_name"))
        .and_then(|c| c.as_str())
        .map(|c| c.to_string())
        .unwrap_or("unknown".to_string()); // Default codec
    
    Ok(VideoMetadata {
        duration,
        width,
        height,
        codec,
    })
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
            get_video_metadata
            // Commands will be added in future PRs:
            // - export_single_clip
            // - export_timeline
            // - check_codec_compatibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
