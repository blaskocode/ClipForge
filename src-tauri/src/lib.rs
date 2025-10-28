// ClipForge - Tauri Commands
// Tauri v2.0 command handlers for video processing

use std::path::Path;
use std::fs;
use serde::{Deserialize, Serialize};
use tauri::Manager;

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
    use std::sync::{Arc, Mutex};
    use tauri_plugin_dialog::DialogExt;
    
    // Use a channel to get the result from the callback
    let (tx, rx) = std::sync::mpsc::channel();
    let tx = Arc::new(Mutex::new(Some(tx)));
    
    app.dialog()
        .file()
        .add_filter("Video Files", &["mp4", "mov", "webm"])
        .pick_file(move |file_path| {
            if let Some(tx) = tx.lock().unwrap().take() {
                let _ = tx.send(file_path);
            }
        });
    
    // Wait for the result
    match rx.recv() {
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

pub async fn get_video_metadata_internal(app: tauri::AppHandle, file_path: String) -> Result<VideoMetadata, String> {
    use std::process::Command;
    
    // First validate the file
    let _validation_result = validate_video_file_internal(file_path.clone()).await?;
    
    // Get FFprobe path - for testing, we'll use the one in the project root
    let ffprobe_path = if cfg!(test) || cfg!(debug_assertions) {
        // Use the one in the project root for testing
        std::path::PathBuf::from("./ffprobe")
    } else {
        // Use the bundled one in production
        app.path()
            .app_local_data_dir()
            .unwrap()
            .join("binaries")
            .join("ffprobe")
    };
    
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
        return Err(format!("FFprobe failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // Parse JSON output
    let output_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&output_str)
        .map_err(|e| format!("Failed to parse FFprobe output: {}", e))?;
    
    // Extract metadata
    let format = json.get("format").ok_or("No format section in FFprobe output")?;
    let streams = json.get("streams").and_then(|s| s.as_array()).ok_or("No streams section in FFprobe output")?;
    
    let video_stream = streams.iter()
        .find(|s| s.get("codec_type").and_then(|t| t.as_str()) == Some("video"))
        .ok_or("No video stream found")?;
    
    let duration = format.get("duration")
        .and_then(|d| d.as_str())
        .and_then(|d| d.parse::<f64>().ok())
        .ok_or("Failed to parse duration")?;
    
    let width = video_stream.get("width")
        .and_then(|w| w.as_i64())
        .map(|w| w as i32)
        .ok_or("Failed to parse width")?;
    
    let height = video_stream.get("height")
        .and_then(|h| h.as_i64())
        .map(|h| h as i32)
        .ok_or("Failed to parse height")?;
    
    let codec = video_stream.get("codec_name")
        .and_then(|c| c.as_str())
        .map(|c| c.to_string())
        .ok_or("Failed to parse codec")?;
    
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
