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
    #[serde(rename = "sourceOffset")]
    pub source_offset: Option<f64>,
}

#[derive(Deserialize, Serialize)]
pub struct PipClipData {
    pub path: String,
    pub duration: f64,
    #[serde(rename = "inPoint")]
    pub in_point: f64,
    #[serde(rename = "outPoint")]
    pub out_point: f64,
    pub volume: f64,
    pub muted: bool,
    #[serde(rename = "sourceOffset")]
    pub source_offset: Option<f64>,
    #[serde(rename = "pipSettings")]
    pub pip_settings: Option<PipSettings>,
}

#[derive(Deserialize, Serialize)]
pub struct PipSettings {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub opacity: f64,
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
        // For split clips, use source_offset as the trim start; otherwise use in_point
        let trim_start = clip.source_offset.unwrap_or(clip.in_point);
        let trim_duration = clip.out_point - clip.in_point;
        
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

#[tauri::command]
pub async fn export_multi_track_video(
    _app: AppHandle,
    main_track_clips: Vec<serde_json::Value>,
    pip_track_clips: Vec<serde_json::Value>,
    output_path: String,
    width: Option<i32>,
    height: Option<i32>,
) -> Result<String, String> {
    if main_track_clips.is_empty() && pip_track_clips.is_empty() {
        return Err("No clips to export".to_string());
    }
    
    // Get export resolution (default to 1280x720 if not specified)
    // FFmpeg requires even dimensions, so ensure they're even
    let export_width = width.unwrap_or(1280) & !1; // Round down to even
    let export_height = height.unwrap_or(720) & !1; // Round down to even
    
    // Validate resolution is reasonable
    if export_width < 64 || export_height < 64 {
        return Err("Export resolution too small. Minimum is 64x64.".to_string());
    }
    if export_width > 7680 || export_height > 4320 {
        return Err("Export resolution too large. Maximum is 7680x4320 (8K).".to_string());
    }
    
    let ffmpeg_path = get_ffmpeg_path()?;
    
    // Parse main track clips
    let mut parsed_main_clips = Vec::new();
    for clip_json in main_track_clips {
        let clip: ClipData = serde_json::from_value(clip_json)
            .map_err(|e| format!("Failed to parse main track clip data: {}", e))?;
        parsed_main_clips.push(clip);
    }
    
    // Parse PIP track clips
    let mut parsed_pip_clips = Vec::new();
    for clip_json in pip_track_clips {
        let clip: PipClipData = serde_json::from_value(clip_json)
            .map_err(|e| format!("Failed to parse PIP track clip data: {}", e))?;
        parsed_pip_clips.push(clip);
    }
    
    // Build FFmpeg command
    let mut cmd_args = Vec::new();
    
    // Add all input files (main track first, then PIP track)
    for clip in &parsed_main_clips {
        cmd_args.push("-i".to_string());
        cmd_args.push(clip.path.clone());
    }
    for clip in &parsed_pip_clips {
        cmd_args.push("-i".to_string());
        cmd_args.push(clip.path.clone());
    }
    
    // Build filter complex
    let mut filter_parts = Vec::new();
    
    // Process main track clips
    let mut main_video_inputs = Vec::new();
    for (i, clip) in parsed_main_clips.iter().enumerate() {
        let input_video = format!("[{}:v]", i);
        
        // For split clips, use source_offset as the trim start; otherwise use in_point
        let trim_start = clip.source_offset.unwrap_or(clip.in_point);
        let trim_duration = if clip.out_point < clip.duration {
            clip.out_point - clip.in_point
        } else {
            clip.duration - clip.in_point
        };
        
        let video_filter = format!("{}trim=start={}:duration={},setpts=PTS-STARTPTS,scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2[v{}]", 
            input_video, trim_start, trim_duration, export_width, export_height, export_width, export_height, i);
        
        filter_parts.push(video_filter);
        main_video_inputs.push(format!("[v{}]", i));
    }
    
    // Calculate durations
    let main_duration: f64 = parsed_main_clips.iter().map(|c| c.duration).sum();
    let pip_duration: f64 = parsed_pip_clips.iter().map(|c| c.duration).sum();
    
    // Use the longer duration for the final video
    let final_duration = main_duration.max(pip_duration);
    
    // Concatenate main track videos
    // If main track exists, we need to create [main] output
    // If no main track clips, create black background as [main]
    if !main_video_inputs.is_empty() {
        let concat_inputs_str = main_video_inputs.join("");
        let concat_filter = format!("{}concat=n={}:v=1:a=0[main_concat]", concat_inputs_str, parsed_main_clips.len());
        
        // If main track is shorter than final duration, extend with black
        if main_duration < final_duration {
            filter_parts.push(format!("{};[main_concat]tpad=stop_mode=clone:stop_duration={}[main]", 
                concat_filter, final_duration - main_duration));
        } else {
            // Main track is long enough - just relabel by using scale passthrough
            filter_parts.push(format!("{};[main_concat]scale=iw:ih[main]", concat_filter));
        }
    } else {
        // No main track clips, create a black background for the full duration
        // Note: color filter needs explicit format for proper rendering
        filter_parts.push(format!("color=black:size={}x{}:duration={}:rate=30[main]", 
            export_width, export_height, final_duration));
    }
    
    // Process PIP track clips and overlay them with proper timing
    let mut current_output = "[main]".to_string();
    let mut input_index = parsed_main_clips.len();
    let mut pip_start_time = 0.0;
    
    for (i, clip) in parsed_pip_clips.iter().enumerate() {
        let input_video = format!("[{}:v]", input_index);
        
        // For split clips, use source_offset as the trim start; otherwise use in_point
        let trim_start = clip.source_offset.unwrap_or(clip.in_point);
        let trim_duration = clip.out_point - clip.in_point;
        
        // Get PIP settings or use defaults
        let pip_settings = clip.pip_settings.as_ref().unwrap_or(&PipSettings {
            x: 0.75,
            y: 0.75,
            width: 0.25,
            height: 0.25,
            opacity: 1.0,
        });
        
        // Scale PIP clip to the specified size (relative to export resolution)
        let pip_width = (export_width as f64 * pip_settings.width) as i32;
        let pip_height = (export_height as f64 * pip_settings.height) as i32;
        
        // Process PIP clip with timing
        let pip_filter = format!("{}trim=start={}:duration={},setpts=PTS-STARTPTS,scale={}:{}[pip{}]", 
            input_video, trim_start, trim_duration, pip_width, pip_height, i);
        filter_parts.push(pip_filter);
        
        // Overlay PIP on main video with proper timing (relative to export resolution)
        let overlay_x = (export_width as f64 * pip_settings.x) as i32;
        let overlay_y = (export_height as f64 * pip_settings.y) as i32;
        
        // Use enable filter to control when PIP appears
        let overlay_filter = format!("{}[pip{}]overlay=x={}:y={}:enable='gte(t,{})'[overlay{}]", 
            current_output, i, overlay_x, overlay_y, pip_start_time, i);
        filter_parts.push(overlay_filter);
        
        current_output = format!("[overlay{}]", i);
        pip_start_time += clip.duration; // Move to next PIP clip position
        input_index += 1;
    }
    
    let filter_complex = filter_parts.join(";");
    
    cmd_args.push("-filter_complex".to_string());
    cmd_args.push(filter_complex);
    cmd_args.push("-map".to_string());
    cmd_args.push(format!("{}", current_output));
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
    
    // Debug: Log export parameters for troubleshooting
    eprintln!("FFmpeg export resolution: {}x{}", export_width, export_height);
    eprintln!("Main clips: {}, PiP clips: {}", parsed_main_clips.len(), parsed_pip_clips.len());
    
    // Execute FFmpeg
    let output = Command::new(&ffmpeg_path)
        .args(&cmd_args)
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        
        // Log full error for debugging
        eprintln!("FFmpeg stderr: {}", stderr);
        if !stdout.is_empty() {
            eprintln!("FFmpeg stdout: {}", stdout);
        }
        
        // Return detailed error with actual FFmpeg output
        let parsed_error = parse_ffmpeg_error(&stderr);
        return Err(format!("{}\n\nDebug info:\n- Resolution: {}x{}\n- Main clips: {}\n- PiP clips: {}\n\nFull FFmpeg error:\n{}", 
            parsed_error, export_width, export_height, parsed_main_clips.len(), parsed_pip_clips.len(), stderr));
    }
    
    Ok("Multi-track export completed successfully".to_string())
}

pub fn parse_ffmpeg_error(stderr: &str) -> String {
    // Log the full error for debugging
    eprintln!("FFmpeg error output: {}", stderr);
    
    if stderr.contains("No space left") {
        "Not enough disk space to export video.".to_string()
    } else if stderr.contains("codec") && stderr.contains("not found") {
        "Video codec incompatibility. Try re-encoding (slower).".to_string()
    } else if stderr.contains("Invalid") && stderr.contains("argument") {
        format!("Invalid export parameters. FFmpeg error:\n\n{}", stderr)
    } else {
        format!("Export failed. FFmpeg error:\n\n{}", stderr)
    }
}
