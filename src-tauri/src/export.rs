// ClipForge - Export Module
// Handles video export using FFmpeg

use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::get_ffmpeg_path;

#[derive(Deserialize, Serialize)]
pub struct ClipData {
    pub path: String,
    pub duration: f64,
    #[serde(rename = "inPoint")]
    pub in_point: f64,
    #[serde(rename = "outPoint")]
    pub out_point: f64,
    pub volume: f64,
    pub muted: bool,
}

#[tauri::command]
pub async fn export_video(
    _app: AppHandle,
    clips: Vec<serde_json::Value>,
    output_path: String,
) -> Result<String, String> {
    if clips.is_empty() {
        return Err("No clips to export".to_string());
    }
    
    let ffmpeg_path = get_ffmpeg_path()?;
    
    // Parse clips from JSON
    let mut parsed_clips = Vec::new();
    for clip_json in clips {
        let clip: ClipData = serde_json::from_value(clip_json)
            .map_err(|e| format!("Failed to parse clip data: {}", e))?;
        parsed_clips.push(clip);
    }
    
    // Build FFmpeg command for multi-clip concatenation
    let mut cmd_args = Vec::new();
    
    // Add all input files
    for clip in &parsed_clips {
        cmd_args.push("-i".to_string());
        cmd_args.push(clip.path.clone());
    }
    
    // Build filter complex for trimming and concatenation (video only for now)
    let mut filter_parts = Vec::new();
    let mut video_inputs = Vec::new();
    
    for (i, clip) in parsed_clips.iter().enumerate() {
        let input_video = format!("[{}:v]", i);
        
        // Video processing: trim and scale
        let trim_start = clip.in_point;
        let trim_duration = if clip.out_point < clip.duration {
            clip.out_point - clip.in_point
        } else {
            clip.duration - clip.in_point
        };
        
        let video_filter = format!("{}trim=start={}:duration={},setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v{}]", 
            input_video, trim_start, trim_duration, i);
        
        filter_parts.push(video_filter);
        video_inputs.push(format!("[v{}]", i));
    }
    
    // Concatenate video streams only (no audio for now)
    let video_concat = format!("{}concat=n={}:v=1:a=0[outv]", video_inputs.join(""), parsed_clips.len());
    filter_parts.push(video_concat);
    
    let filter_complex = filter_parts.join(";");
    
    cmd_args.push("-filter_complex".to_string());
    cmd_args.push(filter_complex);
    cmd_args.push("-map".to_string());
    cmd_args.push("[outv]".to_string());
    cmd_args.push("-c:v".to_string());
    cmd_args.push("libx264".to_string());
    cmd_args.push("-preset".to_string());
    cmd_args.push("fast".to_string());
    cmd_args.push("-crf".to_string());
    cmd_args.push("23".to_string());
    cmd_args.push("-pix_fmt".to_string());
    cmd_args.push("yuv420p".to_string());
    cmd_args.push("-y".to_string());
    cmd_args.push(output_path.clone());
    
    // Execute FFmpeg
    let output = Command::new(&ffmpeg_path)
        .args(&cmd_args)
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(parse_ffmpeg_error(&stderr));
    }
    
    Ok("Export completed successfully".to_string())
}

pub fn parse_ffmpeg_error(stderr: &str) -> String {
    if stderr.contains("No space left") {
        "Not enough disk space to export video.".to_string()
    } else if stderr.contains("codec") && stderr.contains("not found") {
        "Video codec incompatibility. Try re-encoding (slower).".to_string()
    } else {
        format!("Export failed. FFmpeg error:\n\n{}", stderr)
    }
}
