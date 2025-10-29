// ClipForge - Filler Word Detection Module
// Handles audio extraction and OpenAI Whisper API integration for filler word detection

use std::path::Path;
use std::fs;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::get_ffmpeg_path;

#[derive(Debug, Serialize, Deserialize)]
pub struct FillerWord {
    pub word: String,
    #[serde(rename = "startTime")]
    pub start_time: f64,
    #[serde(rename = "endTime")]
    pub end_time: f64,
    pub confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct WhisperWord {
    word: String,
    start: f64,
    end: f64,
}

#[derive(Debug, Deserialize)]
struct WhisperSegment {
    id: Option<i32>,
    seek: Option<i32>,
    start: f64,
    end: f64,
    text: String,
    words: Option<Vec<WhisperWord>>,
}

#[derive(Debug, Deserialize)]
struct WhisperResponse {
    text: String,
    words: Option<Vec<WhisperWord>>,  // Direct words array (if available)
    segments: Option<Vec<WhisperSegment>>,  // Segments with nested words
}

const FILLER_WORDS: &[&str] = &[
    "um", "umm", "uh", "uhh", "uhm", "eh", "ah",
    "like", "you know", "so", "well", 
    "actually", "basically", "literally", "right",
];

/// Normalize word for comparison - removes punctuation, converts to lowercase
fn normalize_word(word: &str) -> String {
    word.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect()
}

/// Check if a normalized word matches a filler word
/// Handles variations like "umm", "uhh", etc.
fn is_filler_word(normalized_word: &str, filler: &str) -> bool {
    // Exact match
    if normalized_word == filler {
        return true;
    }
    
    // For short filler words (um, uh, etc.), check if word starts with the filler
    // This catches "umm", "uhh", "uhm" variations
    if filler.len() <= 3 && normalized_word.len() >= filler.len() {
        if normalized_word.starts_with(filler) {
            return true;
        }
    }
    
    // Contains match for longer filler phrases like "you know"
    if filler.len() > 3 && normalized_word.contains(filler) {
        return true;
    }
    
    false
}

/// Extract audio from video file to temporary WAV file
async fn extract_audio_to_temp(
    video_path: &str,
    in_point: Option<f64>,
    out_point: Option<f64>,
) -> Result<String, String> {
    // Validate file exists
    if !Path::new(video_path).exists() {
        return Err("Video file not found".to_string());
    }

    // Create temp directory
    let temp_dir = std::env::temp_dir().join("clipforge_audio");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // Generate unique filename
    let video_hash = format!("{:x}", md5::compute(video_path.as_bytes()));
    let audio_filename = format!("audio_{}.wav", video_hash);
    let audio_path = temp_dir.join(&audio_filename);

    let ffmpeg_path = get_ffmpeg_path()?;

    // Build FFmpeg command
    let mut cmd = Command::new(&ffmpeg_path);
    
    // Add trim options if specified
    if let Some(in_point) = in_point {
        cmd.arg("-ss").arg(in_point.to_string());
    }
    
    cmd.arg("-i").arg(video_path);
    
    // Duration limit if out_point is specified
    if let (Some(in_pt), Some(out_pt)) = (in_point, out_point) {
        let duration = out_pt - in_pt;
        cmd.arg("-t").arg(duration.to_string());
    }
    
    // Audio extraction options (16kHz mono for Whisper)
    cmd.args(&[
        "-vn",                    // No video
        "-acodec", "pcm_s16le",   // PCM 16-bit little-endian
        "-ar", "16000",           // 16kHz sample rate
        "-ac", "1",               // Mono channel
        "-y",                     // Overwrite output
        audio_path.to_str().unwrap(),
    ]);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg audio extraction failed: {}", stderr));
    }

    Ok(audio_path.to_str().unwrap().to_string())
}

/// Transcribe audio using OpenAI Whisper API
async fn transcribe_audio(
    audio_path: &str,
    api_key: &str,
) -> Result<WhisperResponse, String> {
    // Read audio file
    let audio_data = fs::read(audio_path)
        .map_err(|e| format!("Failed to read audio file: {}", e))?;

    // Get filename for multipart form
    let filename = Path::new(audio_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio.wav");

    // Create multipart form data
    // For word-level timestamps, OpenAI API expects timestamp_granularities as a JSON array
    // Try sending as JSON-encoded string first
    let form = reqwest::multipart::Form::new()
        .part(
            "file",
            reqwest::multipart::Part::bytes(audio_data)
                .file_name(filename.to_string())
                .mime_str("audio/wav")
                .map_err(|e| format!("Failed to set mime type: {}", e))?,
        )
        .text("model", "whisper-1")
        .text("response_format", "verbose_json");
    
    // Add timestamp_granularities as multiple form fields (array parameter format)
    // Some APIs expect array parameters as multiple fields with same name
    let form = form.text("timestamp_granularities[]", "word");

    // Make API request
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Request to OpenAI API timed out".to_string()
            } else if e.is_connect() {
                "Failed to connect to OpenAI API. Check your internet connection.".to_string()
            } else {
                format!("Network error: {}", e)
            }
        })?;

    let status = response.status();
    
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        
        if status == 401 {
            return Err("Invalid OpenAI API key. Please check your API key.".to_string());
        } else if status == 429 {
            return Err("OpenAI API rate limit exceeded. Please try again later.".to_string());
        } else {
            return Err(format!("OpenAI API error ({}): {}", status, error_text));
        }
    }

    // Get response text first for debugging
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read API response: {}", e))?;
    
    // Log full response structure for debugging
    eprintln!("=== Whisper API Response (full) ===");
    eprintln!("{}", response_text);
    eprintln!("=== End Response ===");
    
    // Parse JSON response
    let whisper_response: WhisperResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse API response: {}. Response: {}", e, 
            if response_text.len() > 200 { 
                &response_text[..200] 
            } else { 
                &response_text 
            }))?;

    Ok(whisper_response)
}

/// Detect filler words from Whisper transcript
fn parse_filler_words_from_transcript(transcript: &WhisperResponse) -> Vec<FillerWord> {
    let mut filler_words = Vec::new();

    // Try direct words array first
    if let Some(words) = &transcript.words {
        for word_obj in words {
            let normalized = normalize_word(&word_obj.word);
            
            // Debug: log first few words to see what Whisper is returning
            if filler_words.len() == 0 && words.len() > 0 {
                eprintln!("Sample words from transcript (first 5):");
                for (i, w) in words.iter().take(5).enumerate() {
                    eprintln!("  [{}] '{}' (normalized: '{}')", i, w.word, normalize_word(&w.word));
                }
            }
            
            // Check if word matches any filler word
            for filler in FILLER_WORDS {
                if is_filler_word(&normalized, filler) {
                    filler_words.push(FillerWord {
                        word: word_obj.word.clone(),
                        start_time: word_obj.start,
                        end_time: word_obj.end,
                        confidence: None,
                    });
                    break;
                }
            }
        }
    }
    // Fallback: check segments with nested words
    else if let Some(segments) = &transcript.segments {
        for segment in segments {
            if let Some(words) = &segment.words {
                for word_obj in words {
                    let normalized = normalize_word(&word_obj.word);
                    
                    // Check if word matches any filler word
                    for filler in FILLER_WORDS {
                        if is_filler_word(&normalized, filler) {
                            filler_words.push(FillerWord {
                                word: word_obj.word.clone(),
                                start_time: word_obj.start,
                                end_time: word_obj.end,
                                confidence: None,
                            });
                            break;
                        }
                    }
                }
            }
        }
    }

    filler_words
}

/// Main Tauri command for detecting filler words
#[tauri::command]
pub async fn detect_filler_words(
    _app: AppHandle,
    file_path: String,
    api_key: String,
    in_point: Option<f64>,
    out_point: Option<f64>,
) -> Result<Vec<FillerWord>, String> {
    // Validate API key format
    if api_key.trim().is_empty() {
        return Err("API key is required".to_string());
    }
    
    if !api_key.starts_with("sk-") {
        return Err("Invalid API key format. OpenAI API keys start with 'sk-'".to_string());
    }

    // Extract audio to temp file
    let audio_path = extract_audio_to_temp(&file_path, in_point, out_point).await?;

    // Clean up temp file on function exit (Drop trait will handle cleanup)
    let _cleanup = TempFileCleanup::new(audio_path.clone());

    // Transcribe audio
    let transcript = transcribe_audio(&audio_path, &api_key).await?;

    // Check if we got word-level timestamps (either direct words array or in segments)
    let has_words = transcript.words.is_some() || 
        transcript.segments.as_ref().map_or(false, |segments| {
            segments.iter().any(|s| s.words.is_some())
        });
    
    if !has_words {
        // Log full response for debugging
        eprintln!("No word-level timestamps found. Transcript structure:");
        eprintln!("  - Direct words: {:?}", transcript.words.as_ref().map(|w| w.len()));
        if let Some(segments) = &transcript.segments {
            eprintln!("  - Segments: {}", segments.len());
            for (i, segment) in segments.iter().enumerate().take(2) {
                eprintln!("  - Segment {}: words={:?}, text={}", 
                    i, 
                    segment.words.as_ref().map(|w| w.len()),
                    if segment.text.len() > 50 { &segment.text[..50] } else { &segment.text }
                );
            }
        }
        
        return Err(format!(
            "Whisper API did not return word-level timestamps. Response structure: has_words={}, has_segments={}, segments_count={}. Please check terminal output for detailed response structure.", 
            transcript.words.is_some(),
            transcript.segments.is_some(),
            transcript.segments.as_ref().map_or(0, |s| s.len())
        ));
    }

    // Detect filler words
    let filler_words = parse_filler_words_from_transcript(&transcript);

    // Note: cleanup will auto-drop at end of function scope, cleaning up temp file

    Ok(filler_words)
}

/// Helper struct to clean up temp file
struct TempFileCleanup {
    path: String,
}

impl TempFileCleanup {
    fn new(path: String) -> Self {
        Self { path }
    }
}

impl Drop for TempFileCleanup {
    fn drop(&mut self) {
        if let Err(e) = fs::remove_file(&self.path) {
            eprintln!("Warning: Failed to cleanup temp audio file {}: {}", self.path, e);
        }
    }
}

