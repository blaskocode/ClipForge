// ClipForge - Tauri Commands
// Tauri v2.0 command handlers for video processing

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::fs;

#[tauri::command]
async fn validate_video_file(file_path: String) -> Result<String, String> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

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
        .invoke_handler(tauri::generate_handler![
            validate_video_file
            // Commands will be added in future PRs:
            // - select_video_file
            // - get_video_metadata
            // - export_single_clip
            // - export_timeline
            // - check_codec_compatibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
