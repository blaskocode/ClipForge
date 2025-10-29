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
  track: 'main' | 'pip';
  pipSettings?: {
    x: number;      // 0-1 (percentage of main video width)
    y: number;      // 0-1 (percentage of main video height)
    width: number;  // 0-1 (percentage scale)
    height: number; // 0-1 (percentage scale)
    opacity: number; // 0-1
  };
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