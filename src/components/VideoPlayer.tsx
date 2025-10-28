import { useState, useRef, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/tauri";

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

interface VideoPlayerProps {
  currentClip: Clip | null;
  onTimeUpdate: (time: number) => void;
  onDeleteClip: (clipId: string) => void;
}

export function VideoPlayer({ currentClip, onTimeUpdate, onDeleteClip }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Convert file path to URL for video element
  const videoUrl = currentClip ? convertFileSrc(currentClip.path) : "";
  
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
        togglePlayPause();
      }
      
      // Delete/Backspace - Remove selected clip
      if ((e.code === "Delete" || e.code === "Backspace") && currentClip) {
        e.preventDefault();
        
        // Show confirmation dialog
        const confirmDelete = confirm("Delete this clip from timeline?");
        if (confirmDelete) {
          onDeleteClip(currentClip.id);
        }
      }
    };
    
    // Add event listener
    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentClip, onDeleteClip]);

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (!videoRef.current || !currentClip) return;

    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          setError(`Failed to play video: ${err.message}`);
          setIsPlaying(false);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Handle time update event
  const handleTimeUpdate = () => {
    if (!videoRef.current || !currentClip) return;
    
    const videoCurrentTime = videoRef.current.currentTime;
    setCurrentTime(videoCurrentTime);
    
    // Calculate absolute timeline position
    // For single clip, this is just the current time
    // For multiple clips, this would account for clip start offset in the timeline
    // This will be enhanced in PR #6 with trim functionality
    onTimeUpdate(videoCurrentTime);
  };

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
    setIsPlaying(false);
    
    // Auto-dismiss error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  };

  // Handle video ended event
  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  // Reset video when clip changes
  useEffect(() => {
    if (!videoRef.current) return;
    
    // Reset state
    setIsPlaying(false);
    setError(null);
    setCurrentTime(0);
    
    // If there's a clip, prepare the video
    if (currentClip) {
      // When the video is loaded, seek to inPoint
      const handleCanPlay = () => {
        if (videoRef.current) {
          // Seek to in-point (will be 0 until trim functionality is implemented)
          videoRef.current.currentTime = currentClip.inPoint;
          // Remove the event listener after first load
          videoRef.current.removeEventListener('canplay', handleCanPlay);
        }
      };
      
      // Add event listener for when video can play
      videoRef.current.addEventListener('canplay', handleCanPlay);
      
      // Clean up event listener if component unmounts before video loads
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('canplay', handleCanPlay);
        }
      };
    }
  }, [currentClip]);

  return (
    <div className="video-player">
      {currentClip ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onError={handleVideoError}
            onEnded={handleVideoEnded}
            style={{
              width: "100%",
              maxHeight: "500px",
              background: "#000",
              objectFit: "contain",
            }}
          />
          
          {error && (
            <div className="video-error">
              {error}
            </div>
          )}
          
          <div className="video-controls">
            <button
              onClick={togglePlayPause}
              className="play-button"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="time-display">
              {currentTime.toFixed(2)}s / {currentClip.duration.toFixed(2)}s
            </div>
          </div>
          
          <div className="keyboard-hints">
            <span>Spacebar: Play/Pause</span>
            <span>Delete: Remove Clip</span>
          </div>
        </>
      ) : (
        <div className="video-placeholder">
          <p>No clip selected</p>
          <p>Select a clip from the timeline to preview</p>
        </div>
      )}
    </div>
  );
}
