// Types and interfaces for Recording features

export type RecordingType = 'screen' | 'webcam' | 'both';

export interface RecordingState {
  isRecording: boolean;
  recordingType: RecordingType;
  duration: number; // seconds
  screenRecorder: MediaRecorder | null;
  webcamRecorder: MediaRecorder | null;
  screenStream: MediaStream | null;
  webcamStream: MediaStream | null;
  screenChunks: Blob[];
  webcamChunks: Blob[];
  startTime: number | null; // timestamp when recording started
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

