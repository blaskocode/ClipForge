import { useState, useRef, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface Clip {
  id: string;
  path: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  codec: string;
  inPoint: number;
  outPoint: number;
}

interface ClipAtPlayhead {
  clip: Clip;
  localTime: number;
}

interface VideoPlayerProps {
  clipAtPlayhead: ClipAtPlayhead | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  totalTimelineDuration: number;
  playheadPosition: number;
}

export function VideoPlayer({ clipAtPlayhead, isPlaying, onPlayPause, totalTimelineDuration, playheadPosition }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Convert file path to URL for video element
  const videoUrl = clipAtPlayhead ? convertFileSrc(clipAtPlayhead.clip.path) : "";
  
  // Get proper MIME type for the video
  const getVideoMimeType = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'webm': 'video/webm',
      'ogv': 'video/ogg',
      'm4v': 'video/x-m4v',
    };
    return mimeTypes[ext] || `video/${ext}`;
  };
  
  // Sync video playback with playhead position
  useEffect(() => {
    if (!videoRef.current || !clipAtPlayhead) return;
    
    const video = videoRef.current;
    const clip = clipAtPlayhead.clip;
    let targetTime = clipAtPlayhead.localTime;
    
    // Clamp to active range - don't show trimmed content
    // If playhead is before in-point, show in-point frame
    // If playhead is after out-point, show out-point frame
    if (targetTime < clip.inPoint) {
      targetTime = clip.inPoint;
    } else if (targetTime > clip.outPoint) {
      targetTime = clip.outPoint;
    }
    
    // Only seek if the difference is significant (more than 0.1 seconds)
    // This prevents excessive seeking during normal playback
    if (Math.abs(video.currentTime - targetTime) > 0.1) {
      video.currentTime = targetTime;
    }
    
    // Handle play/pause state
    if (isPlaying && video.paused) {
      video.play().catch(err => {
        console.error("Failed to play:", err);
        setError(`Failed to play video: ${err.message}`);
      });
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [clipAtPlayhead, playheadPosition, isPlaying]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Spacebar - Toggle play/pause
      if (e.code === "Space") {
        e.preventDefault(); // Prevent page scrolling
        onPlayPause();
      }
    };
    
    // Add event listener
    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onPlayPause]);


  // Handle video errors
  const handleVideoError = () => {
    if (!videoRef.current) return;
    
    let errorMessage = "Unknown error";
    
    // Get detailed error information from the video element
    if (videoRef.current.error) {
      const videoError = videoRef.current.error;
      
      switch (videoError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Playback aborted by the user";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error while loading the video";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Video decoding error - the file may be corrupted";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Video format not supported by your browser";
          break;
        default:
          errorMessage = videoError.message || "Unknown video error";
      }
    }
    
    console.error("Video error:", errorMessage);
    setError(`Failed to load video: ${errorMessage}`);
    
    // Auto-dismiss error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  };

  // Reset error when clip changes
  useEffect(() => {
    setError(null);
  }, [clipAtPlayhead?.clip.id]);

  const hasClips = totalTimelineDuration > 0;

  return (
    <div className="video-player">
      {/* Video Preview - always show if there are clips on timeline */}
      {clipAtPlayhead && (
        <>
          <video
            ref={videoRef}
            onError={handleVideoError}
            onLoadedMetadata={() => console.log("Video metadata loaded successfully")}
            style={{
              width: "auto",
              height: "auto",
              maxWidth: "100%",
              maxHeight: "calc(100% - 120px)", // Reserve space for controls + hints
              background: "#000",
              objectFit: "contain",
            }}
          >
            <source src={videoUrl} type={getVideoMimeType(clipAtPlayhead.clip.path)} />
            Your browser does not support the video tag.
          </video>
          
          {error && (
            <div className="video-error">
              {error}
            </div>
          )}
        </>
      )}
      
      {/* Show placeholder if no clips */}
      {!hasClips && (
        <div className="video-placeholder">
          <p>No clips on timeline</p>
          <p>Import videos to get started</p>
        </div>
      )}
      
      {/* Universal Controls - always visible when there are clips */}
      {hasClips && (
        <>
          <div className="video-controls">
            <button
              onClick={onPlayPause}
              className="play-button"
              disabled={!hasClips}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="time-display">
              {playheadPosition.toFixed(2)}s / {totalTimelineDuration.toFixed(2)}s
            </div>
          </div>
          
          <div className="keyboard-hints">
            <span>Spacebar: Play/Pause</span>
          </div>
        </>
      )}
    </div>
  );
}
