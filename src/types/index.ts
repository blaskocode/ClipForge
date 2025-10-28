// Types and interfaces for ClipForge application
export interface Clip {
  id: string;
  path: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  codec: string;
  inPoint: number;
  outPoint: number;
  volume: number;  // 0-200 (100 = normal, 0 = mute, 200 = 2x boost)
  muted: boolean;
}

export interface ClipAtPlayhead {
  clip: Clip;
  localTime: number;
}

export interface AppState {
  clips: Clip[];
  selectedClipId: string | null;
  playheadPosition: number;
  isPlaying: boolean;
  isDragging: boolean;
  showKeyboardHelp: boolean;
  zoomLevel: number;
}
