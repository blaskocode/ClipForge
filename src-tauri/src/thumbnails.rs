// ClipForge - Thumbnail Extraction Module
// Handles thumbnail generation using FFmpeg

use std::path::Path;
use std::fs;
use std::process::Command;
use tauri::AppHandle;
use base64::Engine;

use crate::{get_video_metadata_internal, get_ffmpeg_path};

#[tauri::command]
pub async fn extract_thumbnails(
    app: AppHandle,
    file_path: String,
    count: usize,
) -> Result<Vec<String>, String> {
    // Validate file exists
    if !Path::new(&file_path).exists() {
        return Err("File not found".to_string());
    }
    
    // Get video duration for thumbnail distribution
    let metadata = get_video_metadata_internal(app, file_path.clone()).await?;
    let duration = metadata.duration;
    
    if duration <= 0.0 {
        return Err("Invalid video duration".to_string());
    }
    
    // Create thumbnails directory in temp
    let temp_dir = std::env::temp_dir().join("clipforge_thumbnails");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;
    
    // Generate unique filename for this video
    let video_hash = format!("{:x}", md5::compute(file_path.as_bytes()));
    let thumbnail_prefix = format!("thumb_{}", video_hash);
    
    let mut thumbnail_paths = Vec::new();
    
    // Get FFmpeg binary path
    let ffmpeg_path = get_ffmpeg_path()?;
    
    // Adjust count for very short videos
    let actual_count = if duration < 1.0 { 1 } else { count };
    
    // Extract thumbnails at evenly distributed times
    for i in 0..actual_count {
        let time_offset = (duration / (count + 1) as f64) * (i + 1) as f64;
        let thumbnail_path = temp_dir.join(format!("{}_{}.jpg", thumbnail_prefix, i));
        
        // Use ffmpeg to extract thumbnail
        let output = Command::new(&ffmpeg_path)
            .args(&[
                "-i", &file_path,
                "-ss", &time_offset.to_string(),
                "-vframes", "1",
                "-q:v", "2", // High quality
                "-y", // Overwrite output file
                thumbnail_path.to_str().unwrap(),
            ])
            .output();
        
        match output {
            Ok(result) => {
                if result.status.success() {
                    // Longer delay to ensure file is fully written
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    
                    // Check if file exists before trying to read it
                    if !thumbnail_path.exists() {
                        continue;
                    }
                    
                    // Check file size to ensure it's not empty
                    if let Ok(metadata) = fs::metadata(&thumbnail_path) {
                        if metadata.len() == 0 {
                            continue;
                        }
                    }
                    
                    // Convert to data URL for frontend
                    match fs::read(&thumbnail_path) {
                        Ok(thumbnail_data) => {
                            if thumbnail_data.is_empty() {
                                continue;
                            }
                            
                            let base64 = base64::engine::general_purpose::STANDARD.encode(&thumbnail_data);
                            let data_url = format!("data:image/jpeg;base64,{}", base64);
                            thumbnail_paths.push(data_url);
                            
                            // Clean up temp file
                            let _ = fs::remove_file(&thumbnail_path);
                        }
                        Err(_) => {
                            // Continue with other thumbnails instead of failing completely
                            continue;
                        }
                    }
                } else {
                    // Log full error for debugging
                    eprintln!("FFmpeg thumbnail extraction failed for {}", file_path);
                    eprintln!("Command: {} -i {} -ss {} -vframes 1 -q:v 2 -y {}", 
                             ffmpeg_path.display(), file_path, time_offset, thumbnail_path.display());
                    eprintln!("Error: {}", String::from_utf8_lossy(&result.stderr));
                    
                    // Continue with other thumbnails instead of failing completely
                    continue;
                }
            }
            Err(e) => {
                eprintln!("Failed to execute FFmpeg for thumbnail extraction: {}", e);
                eprintln!("FFmpeg path: {}", ffmpeg_path.display());
                // Continue with other thumbnails instead of failing completely
                continue;
            }
        }
    }
    
    Ok(thumbnail_paths)
}
