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
  onVideoPlayStateChange?: (isActuallyPlaying: boolean) => void;
  clips: Clip[];
  onPlayheadUpdate: (position: number) => void;
}

export function VideoPlayer({ clipAtPlayhead, isPlaying, onPlayPause, totalTimelineDuration, playheadPosition, onVideoPlayStateChange, clips, onPlayheadUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadVideoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoActuallyPlaying, setIsVideoActuallyPlaying] = useState(false);

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
  
  // Reset video play state when clip changes
  useEffect(() => {
    setIsVideoActuallyPlaying(false);
  }, [clipAtPlayhead?.clip.id]);

  // Preload next clip for seamless transitions
  useEffect(() => {
    if (!clipAtPlayhead || !preloadVideoRef.current) return;
    
    // Find the next clip in the timeline
    let nextClipIndex = -1;
    for (let i = 0; i < clips.length; i++) {
      if (clips[i].id === clipAtPlayhead.clip.id) {
        nextClipIndex = i + 1;
        break;
      }
    }
    
    if (nextClipIndex < clips.length) {
      const nextClipToPreload = clips[nextClipIndex];
      
      // Preload the next clip's video (for faster loading, not seamless switching)
      const preloadVideo = preloadVideoRef.current;
      const nextVideoUrl = convertFileSrc(nextClipToPreload.path);
      preloadVideo.src = nextVideoUrl;
      preloadVideo.load();
    }
  }, [clipAtPlayhead?.clip.id, clips]);

  // Track video play/pause events for robust state management
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    const handlePlaying = () => {
      // 'playing' event fires when video actually starts playing (after buffering)
      setIsVideoActuallyPlaying(true);
    };
    
    const handlePause = () => {
      setIsVideoActuallyPlaying(false);
    };
    
    const handleWaiting = () => {
      // Video is buffering - pause playhead updates
      setIsVideoActuallyPlaying(false);
    };
    
    const handleEnded = () => {
      setIsVideoActuallyPlaying(false);
      
      // If video ended naturally, check if this is the last clip and pause
      if (clipAtPlayhead) {
        let isLastClip = false;
        let nextClipIndex = -1;
        
        for (let i = 0; i < clips.length; i++) {
          if (clips[i].id === clipAtPlayhead.clip.id) {
            isLastClip = (i === clips.length - 1);
            nextClipIndex = i + 1;
            break;
          }
        }
        
        if (isLastClip) {
          // Last clip - pause playback
          onPlayPause();
        } else if (nextClipIndex < clips.length) {
          // Transition to next clip - move playhead slightly into next clip
          let accumulatedTime = 0;
          for (let i = 0; i < nextClipIndex; i++) {
            accumulatedTime += clips[i].duration;
          }
          const nextClipStartPosition = accumulatedTime + 0.001; // Small offset to ensure we're inside the next clip
          onPlayheadUpdate(nextClipStartPosition);
        }
      }
    };
    
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('ended', handleEnded);
    };
  }, [clipAtPlayhead]);

  // Notify parent when video play state changes
  useEffect(() => {
    if (onVideoPlayStateChange) {
      onVideoPlayStateChange(isVideoActuallyPlaying);
    }
  }, [isVideoActuallyPlaying, onVideoPlayStateChange]);

  // RAF loop: Sync playhead to video during playback (video is master)
  useEffect(() => {
    if (!videoRef.current || !clipAtPlayhead || !isPlaying) return;
    
    let rafId: number;
    const video = videoRef.current;
    
    const syncLoop = () => {
      if (!videoRef.current || !clipAtPlayhead) return;
      
      const clip = clipAtPlayhead.clip;
      
      // During playback: video drives the playhead
      if (isVideoActuallyPlaying) {
        const videoTime = video.currentTime;
        
        // Handle trim boundaries - transition to next clip or pause
        if (videoTime >= clip.outPoint) {
          // Find timeline position for this out-point
          let accumulatedTime = 0;
          let isLastClip = false;
          let nextClipIndex = -1;
          
          for (let i = 0; i < clips.length; i++) {
            const c = clips[i];
            if (c.id === clip.id) {
              // Check if this is the last clip
              isLastClip = (i === clips.length - 1);
              nextClipIndex = i + 1;
              break;
            }
            accumulatedTime += c.duration;
          }
          
          if (isLastClip) {
            // Last clip - pause playback
            onPlayPause();
            return;
          } else if (nextClipIndex < clips.length) {
            // Transition to next clip - move playhead slightly into next clip
            const nextClipStartPosition = accumulatedTime + clip.duration + 0.001; // Small offset to ensure we're inside the next clip
            onPlayheadUpdate(nextClipStartPosition);
            return;
          }
        }
        
        // Calculate timeline position from video currentTime
        let accumulatedTime = 0;
        for (const c of clips) {
          if (c.id === clip.id) {
            const timelinePosition = accumulatedTime + videoTime;
            onPlayheadUpdate(timelinePosition);
            break;
          }
          accumulatedTime += c.duration;
        }
      }
      
      rafId = requestAnimationFrame(syncLoop);
    };
    
    rafId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(rafId);
  }, [clipAtPlayhead, isPlaying, isVideoActuallyPlaying, clips, onPlayheadUpdate]);

  // Handle play/pause commands and seeking
  useEffect(() => {
    if (!videoRef.current || !clipAtPlayhead) return;
    
    const video = videoRef.current;
    const clip = clipAtPlayhead.clip;
    
    // Clamp target time to active range
    const targetTime = Math.max(clip.inPoint, Math.min(clipAtPlayhead.localTime, clip.outPoint));
    const drift = Math.abs(video.currentTime - targetTime);
    
    // Only seek if drift is significant (manual scrub or clip change)
    // This prevents seeking during normal playback
    if (drift > 0.2) {
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
  }, [clipAtPlayhead, isPlaying]);

  // Handle video source changes during playback (for clip transitions)
  useEffect(() => {
    if (!videoRef.current || !clipAtPlayhead) return;
    
    const video = videoRef.current;
    const clip = clipAtPlayhead.clip;
    
    // When clip changes, we need to ensure the video loads the new source
    if (clipAtPlayhead) {
      // Force reload the video source to ensure it's the correct clip
      video.load();
      
      // After the video loads, seek to the correct position and start playing
      const handleLoadedData = () => {
        // Seek to the correct local time for this clip
        const targetTime = Math.max(clip.inPoint, Math.min(clipAtPlayhead.localTime, clip.outPoint));
        video.currentTime = targetTime;
        
        // If we're playing, start playback immediately
        if (isPlaying) {
          // Use a small timeout to ensure the seek has completed
          setTimeout(() => {
            video.play().catch(err => {
              console.error("Failed to play after clip transition:", err);
              setError(`Failed to play video: ${err.message}`);
            });
          }, 10); // 10ms delay to ensure seek completes
        }
        
        // Remove the event listener after use
        video.removeEventListener('loadeddata', handleLoadedData);
      };
      
      video.addEventListener('loadeddata', handleLoadedData);
    }
  }, [clipAtPlayhead?.clip.id, isPlaying]);
  
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
            preload="metadata"
            playsInline
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
          
          {/* Hidden preload video for seamless transitions */}
          <video
            ref={preloadVideoRef}
            preload="auto"
            playsInline
            style={{
              display: "none",
              width: "1px",
              height: "1px",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
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
