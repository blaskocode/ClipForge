import { useState, useRef, useEffect, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { findActiveClipAtTime, calculateLocalTimeInClip, getTrackClips } from '../utils/timelineCalculations';
import { Clip } from '../types';

interface VideoPlayerProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  totalTimelineDuration: number;
  playheadPosition: number;
  onVideoPlayStateChange?: (isActuallyPlaying: boolean) => void;
  clips: Clip[];
  onPlayheadUpdate: (position: number) => void;
}

export function VideoPlayer({ isPlaying, onPlayPause, totalTimelineDuration, playheadPosition, onVideoPlayStateChange, clips, onPlayheadUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const isPlayingRef = useRef(isPlaying); // Track isPlaying in ref for clip transitions
  const [error, setError] = useState<string | null>(null);
  const [isVideoActuallyPlaying, setIsVideoActuallyPlaying] = useState(false);
  
  // Keep isPlayingRef in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Calculate which Main clip is active at current playhead position - MEMOIZED for performance
  const activeMainClip = useMemo(() => {
    return findActiveClipAtTime('main', playheadPosition, clips);
  }, [playheadPosition, clips]);
  
  const activePipClip = useMemo(() => {
    return findActiveClipAtTime('pip', playheadPosition, clips);
  }, [playheadPosition, clips]);
  
  // Calculate local time within the active Main clip - MEMOIZED for performance
  const mainClipLocalTime = useMemo(() => {
    return activeMainClip ? calculateLocalTimeInClip(activeMainClip, playheadPosition, clips) : 0;
  }, [activeMainClip, playheadPosition, clips]);
  
  // Calculate local time within the active PiP clip - MEMOIZED for performance
  const pipClipLocalTime = useMemo(() => {
    return activePipClip ? calculateLocalTimeInClip(activePipClip, playheadPosition, clips) : 0;
  }, [activePipClip, playheadPosition, clips]);
  
  // Convert file path to URL for video element
  const videoUrl = activeMainClip ? convertFileSrc(activeMainClip.path) : "";
  const pipVideoUrl = activePipClip ? convertFileSrc(activePipClip.path) : "";
  
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
  
  // Reset video play state when active Main clip changes
  useEffect(() => {
    setIsVideoActuallyPlaying(false);
  }, [activeMainClip?.id]);

  // Memoize main clips to prevent unnecessary recalculations
  const mainClips = useMemo(() => getTrackClips('main', clips), [clips]);
  
  // Preload next clip for seamless transitions
  useEffect(() => {
    if (!activeMainClip || !preloadVideoRef.current) return;
    
    // Find the next Main clip in the timeline
    const currentIndex = mainClips.findIndex(c => c.id === activeMainClip.id);
    
    if (currentIndex >= 0 && currentIndex < mainClips.length - 1) {
      const nextClipToPreload = mainClips[currentIndex + 1];
      
      // Preload the next clip's video
      const preloadVideo = preloadVideoRef.current;
      const nextVideoUrl = convertFileSrc(nextClipToPreload.path);
      preloadVideo.src = nextVideoUrl;
      preloadVideo.load();
    }
  }, [activeMainClip?.id, mainClips]);

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
      
      // If video ended naturally, check if this is the last Main clip and pause
      if (activeMainClip) {
        const currentIndex = mainClips.findIndex(c => c.id === activeMainClip.id);
        
        if (currentIndex === mainClips.length - 1) {
          // Last Main clip - pause playback
          onPlayPause();
        } else if (currentIndex >= 0 && currentIndex < mainClips.length - 1) {
          // Transition to next Main clip - move playhead to start of next clip
          // We need to calculate the actual timeline position for the next clip
          let timelinePosition = 0;
          for (let i = 0; i <= currentIndex; i++) {
            timelinePosition += mainClips[i].duration;
          }
          onPlayheadUpdate(timelinePosition + 0.001); // Small offset to ensure we're inside the next clip
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
  }, [activeMainClip, mainClips, clips, onPlayPause, onPlayheadUpdate]);

  // Notify parent when video play state changes
  useEffect(() => {
    if (onVideoPlayStateChange) {
      onVideoPlayStateChange(isVideoActuallyPlaying);
    }
  }, [isVideoActuallyPlaying, onVideoPlayStateChange]);

  // RAF loop: Sync playhead to video during playback (video is master)
  useEffect(() => {
    if (!videoRef.current || !activeMainClip || !isPlaying) return;
    
    let rafId: number;
    const video = videoRef.current;
    
    const syncLoop = () => {
      if (!videoRef.current || !activeMainClip) return;
      
      // Safety check: ensure video is ready
      if (video.readyState < 2) {
        rafId = requestAnimationFrame(syncLoop);
        return;
      }
      
      // During playback: video drives the playhead
      if (isVideoActuallyPlaying) {
        const videoTime = video.currentTime;
        
        // Convert video time to local clip time (subtract source offset for split clips)
        const sourceOffset = activeMainClip.sourceOffset ?? activeMainClip.inPoint;
        const localClipTime = videoTime - sourceOffset;
        
        // Handle trim boundaries - transition to next clip or pause
        const clipEndTime = sourceOffset + activeMainClip.outPoint;
        if (videoTime >= clipEndTime || localClipTime >= activeMainClip.outPoint) {
          // Find next Main clip
          const currentIndex = mainClips.findIndex(c => c.id === activeMainClip.id);
          
          if (currentIndex === mainClips.length - 1) {
            // Last Main clip - pause playback
            onPlayPause();
            return;
          } else if (currentIndex >= 0 && currentIndex < mainClips.length - 1) {
            // Transition to next Main clip
            let timelinePosition = 0;
            for (let i = 0; i <= currentIndex; i++) {
              timelinePosition += mainClips[i].duration;
            }
            onPlayheadUpdate(timelinePosition + 0.001);
            return;
          }
        }
        
        // Calculate timeline position from local clip time
        let timelinePosition = 0;
        for (const clip of mainClips) {
          if (clip.id === activeMainClip.id) {
            timelinePosition += Math.max(0, localClipTime);
            onPlayheadUpdate(timelinePosition);
            break;
          }
          timelinePosition += clip.duration;
        }
      }
      
      rafId = requestAnimationFrame(syncLoop);
    };
    
    rafId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(rafId);
  }, [activeMainClip, isPlaying, isVideoActuallyPlaying, mainClips, onPlayheadUpdate, onPlayPause]);

  // Handle play/pause commands and seeking
  useEffect(() => {
    if (!videoRef.current || !activeMainClip) return;
    
    const video = videoRef.current;
    
    // Only seek if video is ready and we need to correct drift
    if (video.readyState >= 2) {
      // Calculate target time: use sourceOffset if available
      const sourceOffset = activeMainClip.sourceOffset ?? activeMainClip.inPoint;
      const targetTime = Math.min(sourceOffset + mainClipLocalTime, sourceOffset + activeMainClip.outPoint);
      const drift = Math.abs(video.currentTime - targetTime);
      
      // Only seek if drift is significant (manual scrub or clip change)
      // This prevents seeking during normal playback
      if (drift > 0.2) {
        console.log('Seeking main video to', targetTime);
        video.currentTime = Math.max(sourceOffset, targetTime);
      }
    }
    
    // Handle play/pause state (browser will queue play() if video not ready yet)
    if (isPlaying && video.paused) {
      console.log('Starting main video playback (readyState:', video.readyState, ')');
      video.play().catch(err => {
        console.log("Main play promise rejected (this is normal):", err.message);
      });
    } else if (!isPlaying && !video.paused) {
      console.log('Pausing main video');
      video.pause();
    }
  }, [activeMainClip, mainClipLocalTime, isPlaying]);

  // Sync audio volume and muted state to video element
  useEffect(() => {
    if (!videoRef.current || !activeMainClip) return;
    
    const video = videoRef.current;
    video.volume = activeMainClip.muted ? 0 : activeMainClip.volume / 100;
    video.muted = activeMainClip.muted;
  }, [activeMainClip?.id, activeMainClip?.volume, activeMainClip?.muted]);

  // Handle video source changes (for clip transitions)
  useEffect(() => {
    if (!videoRef.current || !activeMainClip) return;
    
    const video = videoRef.current;
    
    console.log('Loading new main clip:', activeMainClip.filename, '(should resume:', isPlayingRef.current, ')');
    
    // Pause first to avoid AbortError when calling load()
    if (!video.paused) {
      video.pause();
    }
    
    // Load the new video source (React changed the <source> src, now reload the video element)
    video.load();
    
    // When video is ready, seek to position and resume playback if needed
    const syncVideoPosition = () => {
      console.log('Main clip loaded, seeking to position');
      // Calculate target time in source file
      // For split clips: use sourceOffset if available; otherwise use inPoint as source offset
      const sourceOffset = activeMainClip.sourceOffset ?? activeMainClip.inPoint;
      const targetTime = Math.min(sourceOffset + mainClipLocalTime, sourceOffset + activeMainClip.outPoint);
      video.currentTime = Math.max(sourceOffset, targetTime);
      
      // Sync audio settings after load
      video.volume = activeMainClip.muted ? 0 : activeMainClip.volume / 100;
      video.muted = activeMainClip.muted;
      
      // Resume playback if we were playing before the clip change (use ref for current state)
      if (isPlayingRef.current) {
        console.log('Resuming main video playback after clip transition');
        video.play().catch(err => {
          console.log("Main play after transition deferred:", err.message);
        });
      }
    };
    
    video.addEventListener('loadedmetadata', syncVideoPosition, { once: true });
    
    return () => {
      video.removeEventListener('loadedmetadata', syncVideoPosition);
    };
  }, [activeMainClip?.id]); // Only when clip ID changes - use ref for play state!

  // Sync PiP audio volume and muted state to video element
  useEffect(() => {
    if (!pipVideoRef.current || !activePipClip) return;
    
    const pipVideo = pipVideoRef.current;
    pipVideo.volume = activePipClip.muted ? 0 : activePipClip.volume / 100;
    pipVideo.muted = activePipClip.muted;
  }, [activePipClip?.id, activePipClip?.volume, activePipClip?.muted]);

  // Handle PiP video source changes (for clip transitions)
  useEffect(() => {
    if (!pipVideoRef.current) return;
    
    const pipVideo = pipVideoRef.current;
    
    // No active PiP clip - pause and hide
    if (!activePipClip) {
      if (!pipVideo.paused) {
        pipVideo.pause();
      }
      return;
    }
    
    console.log('Loading new PiP clip:', activePipClip.filename, '(should resume:', isPlayingRef.current, ')');
    
    // Pause first to avoid AbortError when calling load()
    if (!pipVideo.paused) {
      pipVideo.pause();
    }
    
    // Load the new video source
    pipVideo.load();
    
    // When video is ready, seek to position and resume playback if needed
    const handleLoadedMetadata = () => {
      console.log('PiP clip loaded, seeking to position');
      // For split clips: use sourceOffset if available
      const sourceOffset = activePipClip.sourceOffset ?? activePipClip.inPoint;
      const targetTime = Math.min(sourceOffset + pipClipLocalTime, sourceOffset + activePipClip.outPoint);
      pipVideo.currentTime = Math.max(sourceOffset, targetTime);
      
      // Sync audio settings after load
      pipVideo.volume = activePipClip.muted ? 0 : activePipClip.volume / 100;
      pipVideo.muted = activePipClip.muted;
      
      // Resume playback if we were playing before the clip change (use ref for current state)
      if (isPlayingRef.current) {
        console.log('Resuming PiP video playback after clip transition');
        pipVideo.play().catch(err => {
          console.log("PiP play after transition deferred:", err.message);
        });
      }
    };
    
    pipVideo.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    
    return () => {
      pipVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [activePipClip?.id]); // Only when clip ID changes - use ref for play state!

  // Handle PiP play/pause state separately (less aggressive)
  useEffect(() => {
    if (!pipVideoRef.current || !activePipClip) return;
    
    const pipVideo = pipVideoRef.current;
    
    // Only sync play/pause if video is ready
    if (pipVideo.readyState < 2) return;
    
    if (isPlaying && pipVideo.paused) {
      pipVideo.play().catch(err => {
        console.log("PiP play deferred:", err.message);
      });
    } else if (!isPlaying && !pipVideo.paused) {
      pipVideo.pause();
    }
  }, [isPlaying, activePipClip]);

  // Handle manual seeking - sync PiP to new playhead position
  useEffect(() => {
    if (!pipVideoRef.current || !activePipClip || isPlaying) return;
    
    const pipVideo = pipVideoRef.current;
    if (pipVideo.readyState < 2) return;
    
    // When playhead is manually moved (and not playing), update PiP position
    // For split clips: use sourceOffset if available
    const sourceOffset = activePipClip.sourceOffset ?? activePipClip.inPoint;
    const targetTime = Math.min(sourceOffset + pipClipLocalTime, sourceOffset + activePipClip.outPoint);
    const drift = Math.abs(pipVideo.currentTime - targetTime);
    
    // Only seek if drift is significant
    if (drift > 0.5) {
      pipVideo.currentTime = Math.max(sourceOffset, targetTime);
    }
  }, [pipClipLocalTime, activePipClip, isPlaying]);

  // Gentle drift correction during playback - check every 500ms instead of every frame
  useEffect(() => {
    if (!pipVideoRef.current || !activePipClip || !isPlaying || !isVideoActuallyPlaying) return;
    
    const pipVideo = pipVideoRef.current;
    
    const driftCheckInterval = setInterval(() => {
      if (pipVideo.readyState < 2) return;
      
      // For split clips: use sourceOffset if available
      const sourceOffset = activePipClip.sourceOffset ?? activePipClip.inPoint;
      const targetTime = Math.min(sourceOffset + pipClipLocalTime, sourceOffset + activePipClip.outPoint);
      const drift = Math.abs(pipVideo.currentTime - targetTime);
      
      // Only seek if drift is very significant (>1 second)
      // This prevents constant seeking but keeps videos roughly in sync
      if (drift > 1.0) {
        console.log(`PiP drift correction: ${drift.toFixed(2)}s`);
        pipVideo.currentTime = Math.max(sourceOffset, targetTime);
      }
    }, 500); // Check every 500ms instead of every frame
    
    return () => clearInterval(driftCheckInterval);
  }, [activePipClip, pipClipLocalTime, isPlaying, isVideoActuallyPlaying]);
  
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

  // Reset error when active Main clip changes
  useEffect(() => {
    setError(null);
  }, [activeMainClip?.id]);

  const hasClips = totalTimelineDuration > 0;

  return (
    <div className="video-player">
      {/* Video Preview - always show if there are clips on timeline */}
      {hasClips && (
        <>
          <div className="video-preview-container" style={{ 
            position: 'relative', 
            width: '100%',
            height: '100%',
            maxHeight: 'calc(100vh - 300px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
          }}>
            {/* Main video - visible, hardware accelerated, fills entire preview area */}
            {activeMainClip && (
              <video
                ref={videoRef}
                onError={handleVideoError}
                onLoadedMetadata={() => console.log("Video metadata loaded successfully")}
                preload="metadata"
                playsInline
                muted={activeMainClip.muted}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  background: '#000',
                }}
              >
                <source src={videoUrl} type={getVideoMimeType(activeMainClip.path)} />
                Your browser does not support the video tag.
              </video>
            )}
            
            {/* Black background when no main clip is active */}
            {!activeMainClip && (
              <div style={{
                width: '100%',
                height: '100%',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '18px',
              }}>
                No main video
              </div>
            )}
            
            {/* PiP video overlay - visible, hardware accelerated, positioned in lower right corner */}
            {activePipClip && (
              <video
                ref={pipVideoRef}
                preload="metadata"
                playsInline
                muted={activePipClip.muted}
                className="pip-video"
                style={{
                  position: 'absolute',
                  bottom: '0px',
                  right: '0px',
                  width: '25%',
                  maxWidth: '300px',
                  height: 'auto',
                  aspectRatio: '16/9',
                  border: '2px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                  objectFit: 'contain',
                  background: '#000',
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  zIndex: 10,
                }}
              >
                <source src={pipVideoUrl} type={getVideoMimeType(activePipClip.path)} />
              </video>
            )}
          </div>
          
          {error && (
            <div className="video-error">
              {error}
            </div>
          )}
          
          {/* Hidden preload video for seamless main track transitions */}
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
