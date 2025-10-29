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
    duration: Option<f64>, // Optional duration (for WebM files without metadata)
) -> Result<Vec<String>, String> {
    // Validate file exists
    if !Path::new(&file_path).exists() {
        return Err("File not found".to_string());
    }
    
    // Try to get duration from parameter, metadata, or estimate
    let duration = match duration {
        Some(d) if d > 0.0 => d,
        _ => {
            // Try to get from metadata
            match get_video_metadata_internal(app.clone(), file_path.clone()).await {
                Ok(metadata) if metadata.duration > 0.0 => metadata.duration,
                _ => {
                    // For WebM files without duration, extract from fixed points
                    // We'll extract at the beginning, middle, and end (with some reasonable assumptions)
                    eprintln!("No duration available for {}, using fixed extraction points", file_path);
                    return extract_thumbnails_fixed_points(&file_path, count).await;
                }
            }
        }
    };
    
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

// Extract thumbnails at fixed time points when duration is unknown
async fn extract_thumbnails_fixed_points(
    file_path: &str,
    count: usize,
) -> Result<Vec<String>, String> {
    // Create thumbnails directory in temp
    let temp_dir = std::env::temp_dir().join("clipforge_thumbnails");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;
    
    // Generate unique filename for this video
    let video_hash = format!("{:x}", md5::compute(file_path.as_bytes()));
    let thumbnail_prefix = format!("thumb_{}", video_hash);
    
    let mut thumbnail_paths = Vec::new();
    let ffmpeg_path = crate::get_ffmpeg_path()?;
    
    // Extract thumbnails at fixed intervals: 1s, 5s, 10s, 20s, etc.
    // Or try to probe the video length by attempting to seek
    let time_points = vec![1.0, 5.0, 10.0, 20.0, 30.0];
    let actual_count = count.min(time_points.len());
    
    for i in 0..actual_count {
        let time_offset = time_points[i];
        let thumbnail_path = temp_dir.join(format!("{}_{}.jpg", thumbnail_prefix, i));
        
        let output = std::process::Command::new(&ffmpeg_path)
            .args(&[
                "-i", file_path,
                "-ss", &time_offset.to_string(),
                "-vframes", "1",
                "-q:v", "2",
                "-y",
                thumbnail_path.to_str().unwrap(),
            ])
            .output();
        
        match output {
            Ok(result) => {
                if result.status.success() {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    
                    if !thumbnail_path.exists() {
                        continue;
                    }
                    
                    if let Ok(metadata) = std::fs::metadata(&thumbnail_path) {
                        if metadata.len() == 0 {
                            continue;
                        }
                    }
                    
                    match std::fs::read(&thumbnail_path) {
                        Ok(thumbnail_data) => {
                            if thumbnail_data.is_empty() {
                                continue;
                            }
                            
                            let base64 = base64::engine::general_purpose::STANDARD.encode(&thumbnail_data);
                            let data_url = format!("data:image/jpeg;base64,{}", base64);
                            thumbnail_paths.push(data_url);
                            
                            let _ = std::fs::remove_file(&thumbnail_path);
                        }
                        Err(_) => continue,
                    }
                } else {
                    // If this time point doesn't work (video is shorter), try earlier points
                    continue;
                }
            }
            Err(_) => continue,
        }
    }
    
    Ok(thumbnail_paths)
}
