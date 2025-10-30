import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RecordingType, RecordingState } from '../types/recording';
import './RecordingModal.css';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (startTime: number, duration: number, screenFile?: string, webcamFile?: string) => void;
}

export function RecordingModal({ isOpen, onClose, onRecordingComplete }: RecordingModalProps) {
  const [recordingType, setRecordingType] = useState<RecordingType>('screen');
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [includeSystemAudio, setIncludeSystemAudio] = useState(false);
  
  const recordingStateRef = useRef<RecordingState>({
    isRecording: false,
    recordingType: 'screen',
    duration: 0,
    screenRecorder: null,
    webcamRecorder: null,
    screenStream: null,
    webcamStream: null,
    screenChunks: [],
    webcamChunks: [],
    startTime: null,
  });

  // Load audio devices on mount
  useEffect(() => {
    async function loadAudioDevices() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Failed to load audio devices:', err);
      }
    }
    
    if (isOpen) {
      loadAudioDevices();
    }
  }, [isOpen]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    
    const interval = setInterval(() => {
      setDuration(prev => {
        const newDuration = prev + 1;
        
        // Warning at 50 minutes
        if (newDuration === 3000) {
          console.warn('Recording will stop in 10 minutes');
        }
        
        // Auto-stop at 1 hour
        if (newDuration >= 3600) {
          handleStop();
          console.log('Recording stopped: 1-hour limit reached');
        }
        
        return newDuration;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      const startTime = Date.now();
      recordingStateRef.current.startTime = startTime;
      recordingStateRef.current.recordingType = recordingType;
      recordingStateRef.current.screenChunks = [];
      recordingStateRef.current.webcamChunks = [];

      if (recordingType === 'screen' || recordingType === 'both') {
        // Start screen recording
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 30 }
          } as MediaTrackConstraints,
          audio: includeSystemAudio
        });

        // Log audio track info
        const screenAudioTracks = screenStream.getAudioTracks();
        const screenVideoTracks = screenStream.getVideoTracks();
        console.log('Screen stream tracks:', {
          video: screenVideoTracks.length,
          audio: screenAudioTracks.length,
          audioTracks: screenAudioTracks.map(t => ({
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            readyState: t.readyState,
            settings: t.getSettings()
          })),
          requestedAudio: includeSystemAudio
        });

        screenStream.getVideoTracks()[0].onended = () => {
          // User stopped sharing screen
          if (isRecording) {
            handleStop();
          }
        };

        // Check codec support
        const preferredMimeType = 'video/webm;codecs=vp9,opus';
        const fallbackMimeType = 'video/webm;codecs=vp8,opus';
        const supportedMimeType = MediaRecorder.isTypeSupported(preferredMimeType)
          ? preferredMimeType
          : MediaRecorder.isTypeSupported(fallbackMimeType)
          ? fallbackMimeType
          : 'video/webm'; // Browser default
        
        console.log('Using MediaRecorder mimeType:', supportedMimeType);

        const screenRecorder = new MediaRecorder(screenStream, {
          mimeType: supportedMimeType,
          videoBitsPerSecond: 5000000
        });

        screenRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            console.log('Screen data chunk received:', e.data.size, 'bytes');
            recordingStateRef.current.screenChunks.push(e.data);
          }
        };

        screenRecorder.onerror = (e) => {
          console.error('Screen recorder error:', e);
        };

        // Log when recording starts to verify tracks
        screenRecorder.onstart = () => {
          console.log('Screen recorder started. Active tracks:', {
            video: screenStream.getVideoTracks().filter(t => t.readyState === 'live').length,
            audio: screenStream.getAudioTracks().filter(t => t.readyState === 'live').length
          });
        };

        screenRecorder.start(1000);
        recordingStateRef.current.screenRecorder = screenRecorder;
        recordingStateRef.current.screenStream = screenStream;
      }

      if (recordingType === 'webcam' || recordingType === 'both') {
        // Start webcam recording
        // For audio, prefer selected device but fallback to default if not available
        const audioConstraints = selectedAudioDevice && audioDevices.find(d => d.deviceId === selectedAudioDevice)
          ? { deviceId: selectedAudioDevice }
          : true; // Use browser default if no device selected or device not found
        
        console.log('Requesting webcam stream with audio:', {
          audioConstraints,
          selectedAudioDevice,
          audioDevicesCount: audioDevices.length,
          availableDevices: audioDevices.map(d => ({ id: d.deviceId, label: d.label }))
        });

        const webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: audioConstraints
        });

        // Log audio track info
        const webcamAudioTracks = webcamStream.getAudioTracks();
        const webcamVideoTracks = webcamStream.getVideoTracks();
        console.log('Webcam stream tracks:', {
          video: webcamVideoTracks.length,
          audio: webcamAudioTracks.length,
          audioTracks: webcamAudioTracks.map(t => ({
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            readyState: t.readyState,
            settings: t.getSettings()
          }))
        });

        // Check codec support
        const preferredMimeType = 'video/webm;codecs=vp9,opus';
        const fallbackMimeType = 'video/webm;codecs=vp8,opus';
        const supportedMimeType = MediaRecorder.isTypeSupported(preferredMimeType)
          ? preferredMimeType
          : MediaRecorder.isTypeSupported(fallbackMimeType)
          ? fallbackMimeType
          : 'video/webm'; // Browser default
        
        console.log('Using MediaRecorder mimeType:', supportedMimeType);

        const webcamRecorder = new MediaRecorder(webcamStream, {
          mimeType: supportedMimeType,
          videoBitsPerSecond: 2500000
        });

        webcamRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            console.log('Webcam data chunk received:', e.data.size, 'bytes');
            recordingStateRef.current.webcamChunks.push(e.data);
          }
        };

        webcamRecorder.onerror = (e) => {
          console.error('Webcam recorder error:', e);
        };

        // Log when recording starts to verify tracks
        webcamRecorder.onstart = () => {
          console.log('Webcam recorder started. Active tracks:', {
            video: webcamStream.getVideoTracks().filter(t => t.readyState === 'live').length,
            audio: webcamStream.getAudioTracks().filter(t => t.readyState === 'live').length
          });
        };

        webcamRecorder.start(1000);
        recordingStateRef.current.webcamRecorder = webcamRecorder;
        recordingStateRef.current.webcamStream = webcamStream;
      }

      setIsRecording(true);
      setDuration(0);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStop = async () => {
    const state = recordingStateRef.current;
    
    console.log('Stopping recording...', {
      screenChunks: state.screenChunks.length,
      webcamChunks: state.webcamChunks.length,
      screenState: state.screenRecorder?.state,
      webcamState: state.webcamRecorder?.state
    });
    
    // Stop all recorders simultaneously for perfect synchronization
    const stopPromises: Promise<void>[] = [];
    const stopTime = Date.now();
    
    if (state.screenRecorder && state.screenRecorder.state !== 'inactive') {
      const screenStopPromise = new Promise<void>((resolve) => {
        state.screenRecorder!.onstop = () => {
          console.log('Screen recorder stopped at', stopTime, 'final chunks:', state.screenChunks.length);
          resolve();
        };
      });
      stopPromises.push(screenStopPromise);
      // Don't call stop() here yet - we'll call all stops synchronously below
    }
    
    if (state.webcamRecorder && state.webcamRecorder.state !== 'inactive') {
      const webcamStopPromise = new Promise<void>((resolve) => {
        state.webcamRecorder!.onstop = () => {
          console.log('Webcam recorder stopped at', stopTime, 'final chunks:', state.webcamChunks.length);
          resolve();
        };
      });
      stopPromises.push(webcamStopPromise);
      // Don't call stop() here yet - we'll call all stops synchronously below
    }

    // Now stop all recorders simultaneously (synchronously, no await between calls)
    console.log(`Stopping ${stopPromises.length} recorder(s) simultaneously at ${stopTime}...`);
    if (state.screenRecorder && state.screenRecorder.state !== 'inactive') {
      state.screenRecorder.stop();
    }
    if (state.webcamRecorder && state.webcamRecorder.state !== 'inactive') {
      state.webcamRecorder.stop();
    }

    // Wait for all recorders to finish stopping and collect final chunks
    await Promise.all(stopPromises);

    // Give a small additional delay for any remaining data events
    await new Promise(resolve => setTimeout(resolve, 200));

    // Stop all tracks explicitly to avoid MediaStreamTrack warnings
    // Only stop tracks that aren't already ended
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log('Stopped screen track:', track.kind, track.readyState);
        } else {
          console.log('Screen track already ended:', track.kind);
        }
      });
    }
    
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log('Stopped webcam track:', track.kind, track.readyState);
        } else {
          console.log('Webcam track already ended:', track.kind);
        }
      });
    }

    setIsRecording(false);

    // Save recordings with error handling
    let screenFile: string | undefined;
    let webcamFile: string | undefined;

    try {
      if (state.screenChunks.length > 0 && state.startTime) {
        console.log('Saving screen recording...', state.screenChunks.length, 'chunks');
        screenFile = await saveRecording(state.screenChunks, 'screen', state.startTime);
        console.log('Screen recording saved to:', screenFile);
      } else {
        console.warn('No screen chunks to save');
      }

      if (state.webcamChunks.length > 0 && state.startTime) {
        console.log('Saving webcam recording...', state.webcamChunks.length, 'chunks');
        webcamFile = await saveRecording(state.webcamChunks, 'webcam', state.startTime);
        console.log('Webcam recording saved to:', webcamFile);
      } else {
        console.warn('No webcam chunks to save');
      }
    } catch (error) {
      console.error('Error saving recordings:', error);
      alert(`Failed to save recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Clear state and close modal even on error
      recordingStateRef.current = {
        isRecording: false,
        recordingType: 'screen',
        duration: 0,
        screenRecorder: null,
        webcamRecorder: null,
        screenStream: null,
        webcamStream: null,
        screenChunks: [],
        webcamChunks: [],
        startTime: null,
      };
      setDuration(0);
      onClose();
      return;
    }

    // Clear state
    recordingStateRef.current = {
      isRecording: false,
      recordingType: 'screen',
      duration: 0,
      screenRecorder: null,
      webcamRecorder: null,
      screenStream: null,
      webcamStream: null,
      screenChunks: [],
      webcamChunks: [],
      startTime: null,
    };

    setDuration(0);

    // Notify parent with calculated duration
    if (state.startTime && (screenFile || webcamFile)) {
      const calculatedDuration = duration; // Use the recorded duration in seconds
      console.log('Calling onRecordingComplete with:', { 
        screenFile, 
        webcamFile, 
        startTime: state.startTime,
        duration: calculatedDuration
      });
      onRecordingComplete(state.startTime, calculatedDuration, screenFile, webcamFile);
    } else {
      console.warn('Not calling onRecordingComplete - no files saved or no startTime');
      if (!state.startTime) {
        console.error('No startTime recorded!');
      }
    }
  };

  const handleCancel = async () => {
    if (isRecording) {
      // Stop recording but don't save
      const state = recordingStateRef.current;
      
      if (state.screenRecorder && state.screenRecorder.state !== 'inactive') {
        state.screenRecorder.stop();
      }
      if (state.webcamRecorder && state.webcamRecorder.state !== 'inactive') {
        state.webcamRecorder.stop();
      }

      // Stop all tracks explicitly (only if not already ended)
      if (state.screenStream) {
        state.screenStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        });
      }
      if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        });
      }

      // Clear state
      recordingStateRef.current = {
        isRecording: false,
        recordingType: 'screen',
        duration: 0,
        screenRecorder: null,
        webcamRecorder: null,
        screenStream: null,
        webcamStream: null,
        screenChunks: [],
        webcamChunks: [],
        startTime: null,
      };
    }
    
    setIsRecording(false);
    setDuration(0);
    onClose();
  };

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      const state = recordingStateRef.current;
      if (state.screenStream) {
        state.screenStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        });
      }
      if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        });
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="recording-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget && !isRecording) {
        handleCancel();
      }
    }}>
      <div className="recording-modal" onClick={(e) => e.stopPropagation()}>
        <div className="recording-modal-header">
          <h2>Start Recording</h2>
          {!isRecording && (
            <button className="close-button" onClick={handleCancel}>×</button>
          )}
        </div>

        <div className="recording-modal-content">
          {!isRecording ? (
            <>
              <div className="recording-type-selector">
                <label>Recording Type:</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="screen"
                      checked={recordingType === 'screen'}
                      onChange={(e) => setRecordingType(e.target.value as RecordingType)}
                      disabled={isRecording}
                    />
                    Screen Only
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="webcam"
                      checked={recordingType === 'webcam'}
                      onChange={(e) => setRecordingType(e.target.value as RecordingType)}
                      disabled={isRecording}
                    />
                    Webcam Only
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="both"
                      checked={recordingType === 'both'}
                      onChange={(e) => setRecordingType(e.target.value as RecordingType)}
                      disabled={isRecording}
                    />
                    Screen + Webcam (PiP)
                  </label>
                </div>
              </div>

              <div className="recording-options">
                {recordingType === 'screen' || recordingType === 'both' ? (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeSystemAudio}
                      onChange={(e) => setIncludeSystemAudio(e.target.checked)}
                      disabled={isRecording}
                    />
                    Include system audio (requires permission)
                  </label>
                ) : null}

                {recordingType === 'webcam' || recordingType === 'both' ? (
                  <div className="audio-device-selector">
                    <label>Microphone:</label>
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                      disabled={isRecording}
                    >
                      {audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="recording-info">
                <p>
                  {recordingType === 'screen' && 'Record your screen (full screen or window selection)'}
                  {recordingType === 'webcam' && 'Record from your webcam with microphone audio'}
                  {recordingType === 'both' && 'Record both screen and webcam simultaneously. Screen will go to main track, webcam to PiP track.'}
                </p>
              </div>

              <div className="recording-modal-actions">
                <button onClick={handleCancel} className="button-secondary">
                  Cancel
                </button>
                <button onClick={handleStart} className="button-primary">
                  Start Recording
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="recording-status">
                <div className="recording-indicator">
                  <span className="recording-dot"></span>
                  <span>Recording in progress...</span>
                </div>
                <div className="recording-timer">
                  {formatDuration(duration)}
                </div>
                <div className="recording-info-text">
                  {duration >= 3000 && duration < 3600 && (
                    <p className="warning">Recording will stop in {formatDuration(3600 - duration)}</p>
                  )}
                  {recordingType === 'both' && (
                    <p>Recording screen and webcam simultaneously</p>
                  )}
                </div>
              </div>

              <div className="recording-modal-actions">
                <button onClick={handleStop} className="button-primary stop-button">
                  Stop Recording
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to save recording
async function saveRecording(
  chunks: Blob[],
  type: 'screen' | 'webcam',
  startTime: number
): Promise<string> {
  if (chunks.length === 0) {
    throw new Error('No recording chunks to save');
  }
  
  console.log(`Creating blob from ${chunks.length} chunks`);
  const blob = new Blob(chunks, { type: 'video/webm' });
  console.log('Blob created, size:', blob.size, 'bytes');
  
  if (blob.size === 0) {
    throw new Error('Recording blob is empty (0 bytes)');
  }
  
  const timestamp = new Date(startTime).toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${type}-recording-${timestamp}.webm`;
  
  console.log('Converting blob to array for save...');
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  console.log('ArrayBuffer size:', arrayBuffer.byteLength);
  
  console.log('Saving recording file:', filename);
  const filePath = await invoke<string>('save_recording', {
    filename,
    data: Array.from(uint8Array)
  });
  
  console.log('Recording saved successfully to:', filePath);
  return filePath;
}

