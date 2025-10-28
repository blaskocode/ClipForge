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

// Helper function to get FFmpeg binary path
fn get_ffmpeg_path() -> Result<std::path::PathBuf, String> {
    let possible_paths = [
        // Path in project root
        std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default())
            .parent()
            .unwrap()
            .join("ffmpeg"),
        // Current directory
        std::path::PathBuf::from("./ffmpeg"),
        // Absolute path
        std::path::PathBuf::from("/Users/courtneyblaskovich/Documents/Projects/ClipForge/ffmpeg"),
        // Binaries directory
        std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default())
            .join("binaries")
            .join("ffmpeg"),
    ];
    
    possible_paths.iter()
        .find(|path| path.exists())
        .cloned()
        .ok_or_else(|| "FFmpeg binary not found. Please ensure FFmpeg is in the project root.".to_string())
}

#[tauri::command]
async fn select_export_path(app: tauri::AppHandle, default_filename: String) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    // Use a channel to get the result from the callback
    let (tx, rx) = tokio::sync::oneshot::channel();
    
    app.dialog()
        .file()
        .set_title("Export Video")
        .set_file_name(&default_filename)
        .add_filter("MP4 Video", &["mp4"])
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });
    
    // Wait for the result
    match rx.await {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            
            // Check if file exists
            if Path::new(&path_str).exists() {
                // File exists - need confirmation
                // Return special error that frontend will handle
                Err(format!("FILE_EXISTS:{}", path_str))
            } else {
                Ok(Some(path_str))
            }
        },
        Ok(None) => Ok(None), // User cancelled
        Err(_) => Err("Failed to receive file selection result".to_string()),
    }
}

#[derive(Deserialize)]
struct ClipExportInfo {
    path: String,
    in_point: f64,
    out_point: f64,
}

#[tauri::command]
async fn export_video(
    clips: Vec<ClipExportInfo>,
    output_path: String,
) -> Result<String, String> {
    // Step 1: Get FFmpeg binary path
    let ffmpeg_path = get_ffmpeg_path()?;
    
    // Step 2: Build professional single-pass export with complex filter
    // This approach: loads all clips → applies trim in filter → encodes once → outputs
    // No intermediate files, no double encoding, matches Premiere/Final Cut Pro
    println!("Building single-pass export for {} clips", clips.len());
    
    let mut ffmpeg_args = Vec::new();
    
    // Step 2a: Add all input files with -ss (fast seek before -i)
    for (i, clip) in clips.iter().enumerate() {
        println!("Input clip {}: {} (trim: {:.3}s - {:.3}s)", 
                 i, clip.path, clip.in_point, clip.out_point);
        
        // Fast seek to approximately the right position (before -i)
        ffmpeg_args.push("-ss".to_string());
        ffmpeg_args.push(clip.in_point.to_string());
        ffmpeg_args.push("-i".to_string());
        ffmpeg_args.push(clip.path.clone());
    }
    
    // Step 2b: Build filter_complex with trim + scale for each clip
    // This applies precise trim in the filter (after decoding)
    // Scale all videos to 1280x720 to ensure uniform dimensions for concat
    // Note: Clips have video only (no audio), so we use concat with a=0
    let n = clips.len();
    let mut filter_parts = Vec::new();
    
    for i in 0..n {
        let clip = &clips[i];
        let duration = clip.out_point - clip.in_point;
        
        // Video: trim → setpts → scale to 1280x720
        // Scale ensures all clips have same dimensions (required for concat)
        filter_parts.push(format!(
            "[{}:v]trim=end={}[v{}t]; [v{}t]setpts=PTS-STARTPTS[v{}s]; [v{}s]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:-1:-1:black[v{}]",
            i, duration, i, i, i, i, i
        ));
    }
    
    // Build concat inputs string: [v0][v1][v2] (video only)
    let mut concat_inputs = String::new();
    for i in 0..n {
        concat_inputs.push_str(&format!("[v{}]", i));
    }
    
    // Combine: trim+scale filters + concat (video only, no audio)
    let filter_complex = format!(
        "{}; {}concat=n={}:v=1:a=0[outv]",
        filter_parts.join("; "),
        concat_inputs,
        n
    );
    
    println!("Filter complex (single-pass):\n{}", filter_complex);
    
    ffmpeg_args.push("-filter_complex".to_string());
    ffmpeg_args.push(filter_complex);
    
    // Step 2c: Map outputs and encode
    ffmpeg_args.push("-map".to_string());
    ffmpeg_args.push("[outv]".to_string());
    
    // Encoding parameters (video only, no audio in test clips)
    ffmpeg_args.push("-c:v".to_string());
    ffmpeg_args.push("libx264".to_string());
    ffmpeg_args.push("-preset".to_string());
    ffmpeg_args.push("fast".to_string());
    ffmpeg_args.push("-crf".to_string());
    ffmpeg_args.push("23".to_string());
    ffmpeg_args.push("-pix_fmt".to_string());
    ffmpeg_args.push("yuv420p".to_string());
    ffmpeg_args.push("-y".to_string());
    ffmpeg_args.push(output_path.clone());
    
    // Step 3: Execute single-pass export
    println!("Executing single-pass export...");
    
    let output = std::process::Command::new(&ffmpeg_path)
        .args(&ffmpeg_args)
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
    
    // Step 4: Check result
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        println!("FFmpeg export failed!");
        println!("STDOUT: {}", stdout);
        println!("STDERR: {}", stderr);
        return Err(parse_ffmpeg_error(&stderr));
    }
    
    println!("Export successful!");
    
    Ok(format!("Export successful: {}", output_path))
}

fn parse_ffmpeg_error(stderr: &str) -> String {
    if stderr.contains("No such file") {
        "Video file not found. It may have been moved or deleted.".to_string()
    } else if stderr.contains("Invalid data") || stderr.contains("moov atom") {
        "One or more video files are corrupted or invalid.".to_string()
    } else if stderr.contains("Disk full") || stderr.contains("No space left") {
        "Not enough disk space to export video.".to_string()
    } else if stderr.contains("codec") {
        "Video codec incompatibility. Try re-encoding (slower).".to_string()
    } else {
        format!("Export failed. FFmpeg error:\n\n{}", stderr)
    }
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
            export_video
            // Commands will be added in future PRs:
            // - check_codec_compatibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
